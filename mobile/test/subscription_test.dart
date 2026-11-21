import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';
import 'package:somna/data/subscription.dart';

import 'helpers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  var now = DateTime.parse('2030-01-31T08:00:00Z');
  SomnaStore create(MemoryPersistence p) {
    final s = SomnaStore(persistence: p, now: () => now, autoRefresh: false);
    addTearDown(s.dispose);
    return s;
  }

  setUp(() => now = DateTime.parse('2030-01-31T08:00:00Z'));
  for (final plan in ['monthly', 'yearly']) {
    test('persists $plan access and cancellation', () async {
      final p = MemoryPersistence(), first = create(MemoryPersistence());
      final s = create(p);
      expect(s.isPlus, false);
      expect(await s.activate(plan), true);
      final second = create(p);
      expect(second.isPlus, true);
      expect(second.membership?.plan, plan);
      expect(await second.deactivate(), true);
      expect(create(p).isPlus, false);
      expect(first.isPlus, false);
    });
  }
  for (final raw in [
    '{broken',
    'null',
    '"plus"',
    '{"plan":"lifetime"}',
    '{"plan":"monthly","startedAt":"x","endsAt":"y"}',
  ]) {
    test(
      'malformed storage grants no access: $raw',
      () => expect(parseMembership(raw), null),
    );
  }
  testWidgets('access expires without reload or auto-renewal', (tester) async {
    final p = MemoryPersistence.json({
      'membership': {
        'plan': 'monthly',
        'startedAt': '2030-01-01T08:00:00Z',
        'endsAt': '2030-01-31T08:00:01Z',
      },
    });
    final s = create(p);
    expect(s.isPlus, true);
    var updates = 0;
    s.addListener(() => updates++);
    now = now.add(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(s.isPlus, false);
    expect(s.membership?.endsAt, '2030-01-31T08:00:01Z');
    expect(updates, greaterThan(0));
  });
  test('calendar month ends and leap years', () {
    expect(
      membershipFor('monthly', DateTime.parse('2030-01-31T10:00:00Z')).endsAt,
      '2030-02-28T10:00:00.000Z',
    );
    expect(
      membershipFor('yearly', DateTime.parse('2032-02-29T10:00:00Z')).endsAt,
      '2033-02-28T10:00:00.000Z',
    );
  });
  test('invalid/reversed periods and future periods grant no access', () {
    expect(
      parseMembership(
        '{"plan":"monthly","startedAt":"2030-01-31","endsAt":"2030-01-01"}',
      ),
      null,
    );
    expect(
      membershipIsActive(
        membershipFor('monthly', now.add(const Duration(days: 1))),
        now,
      ),
      false,
    );
    expect(() => membershipFor('lifetime', now), throwsArgumentError);
  });
  test('external cancellation or storage clear syncs entitlement', () async {
    final p = MemoryPersistence(), s = create(MemoryPersistence());
    final synced = create(p);
    await synced.activate('monthly');
    p.raw = jsonEncode({...p.json, 'membership': null});
    synced.reloadFromStorage();
    expect(synced.isPlus, false);
    await synced.activate('yearly');
    p.raw = null;
    synced.reloadFromStorage();
    expect(synced.isPlus, false);
    expect(s.isPlus, false);
  });
  test('storage failures report errors without changing entitlement', () async {
    final p = MemoryPersistence()..fail = true, s = create(MemoryPersistence());
    final persisted = create(p);
    expect(await persisted.activate('monthly'), false);
    expect(persisted.isPlus, false);
    expect(persisted.subscriptionError, isNotEmpty);
    p.fail = false;
    expect(await persisted.activate('monthly'), true);
    expect(persisted.subscriptionError, null);
    p.fail = true;
    expect(await persisted.deactivate(), false);
    expect(persisted.isPlus, true);
    expect(persisted.subscriptionError, isNotEmpty);
    persisted.clearSubscriptionError();
    expect(persisted.subscriptionError, null);
    expect(s.isPlus, false);
  });
  test('journal reset does not cancel membership', () async {
    final s = create(MemoryPersistence());
    await s.activate('yearly');
    final membership = s.membership?.toJson();
    s.resetAll();
    expect(s.isPlus, true);
    expect(s.membership?.toJson(), membership);
  });
  test(
    'legacy separate membership imports once; cancellation cannot resurrect it',
    () async {
      SharedPreferences.setMockInitialValues({
        subscriptionKey: jsonEncode(membershipFor('monthly', now).toJson()),
      });
      final prefs = await SharedPreferences.getInstance();
      final first = await SomnaStore.load(preferences: prefs, now: () => now);
      addTearDown(first.dispose);
      expect(first.isPlus, true);
      await first.deactivate();
      final second = await SomnaStore.load(preferences: prefs, now: () => now);
      addTearDown(second.dispose);
      expect(second.isPlus, false);
      expect(second.membership, null);
    },
  );
  test('membership JSON preserves web fields exactly', () {
    final m = membershipFor('monthly', now);
    expect(Membership.fromJson(m.toJson()).toJson(), m.toJson());
    expect(m.toJson().keys, ['plan', 'startedAt', 'endsAt']);
  });
}
