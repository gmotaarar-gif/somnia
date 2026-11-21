import 'package:flutter_test/flutter_test.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';
import 'package:somna/logic/onboarding.dart';

import 'helpers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const custom = SomnaWidget(
    id: 'w-custom',
    kind: 'custom',
    size: '1x1',
    tone: 'lime',
    visible: true,
    title: 'Витамины',
    unit: 'шт',
    target: 3,
    step: 1,
    value: 2,
    day: '2030-01-02',
  );
  test('first-run widget layout matches picks', () {
    final picked = ['w-streak', 'w-sleep'];
    expect(
      onboardingWidgets(defaultWidgets, picked).map((w) => w.toJson()),
      defaultWidgets.map(
        (w) => w.copyWith(visible: picked.contains(w.id)).toJson(),
      ),
    );
  });
  test('custom progress and order retained; missing defaults appended', () {
    final result = onboardingWidgets(
      [custom, ...defaultWidgets.skip(1)],
      ['w-sleep'],
    );
    expect(result[0], same(custom));
    expect(result.firstWhere((w) => w.id == 'w-sleep').visible, true);
    expect(result.firstWhere((w) => w.id == 'w-water').visible, false);
    expect(
      result.last.toJson(),
      defaultWidgets[0].copyWith(visible: false).toJson(),
    );
    expect(result.length, defaultWidgets.length + 1);
  });
  test('empty picks and current list still yield full gallery', () {
    final result = onboardingWidgets([], []);
    expect(result.length, defaultWidgets.length);
    expect(result.every((w) => !w.visible), true);
  });
  for (final granted in [true, false]) {
    test(
      'permission requested before committing enabled reminder: $granted',
      () async {
        final p = MemoryPersistence();
        var requested = 0;
        late SomnaStore s;
        s = SomnaStore(
          now: () => DateTime(2030, 1, 2),
          persistence: p,
          autoRefresh: false,
          requestReminderPermission: () async {
            requested++;
            expect(s.onboarded, false);
            return granted;
          },
        );
        addTearDown(s.dispose);
        expect(
          await s.finishOnboarding({
            'reminder': true,
            'reminderTime': s.reminderTime,
          }),
          granted,
        );
        await s.flush();
        expect(requested, 1);
        expect(s.reminder, granted);
        expect(s.onboarded, true);
        expect(p.json['reminder'], granted);
        expect(s.reminderTime, '22:30');
        if (!granted) {
          expect(
            s.toast?.text,
            'Разрешите уведомления для Somna в настройках телефона',
          );
        }
      },
    );
  }
  test('disabled reminder needs no permission', () async {
    var requested = 0;
    final s = SomnaStore(
      autoRefresh: false,
      requestReminderPermission: () async {
        requested++;
        return true;
      },
    );
    addTearDown(s.dispose);
    expect(await s.finishOnboarding({'reminder': false}), true);
    expect(requested, 0);
    expect(s.reminder, false);
  });
  test('permission errors leave onboarding uncommitted', () async {
    final s = SomnaStore(
      autoRefresh: false,
      requestReminderPermission: () async =>
          throw StateError('permission unavailable'),
    );
    addTearDown(s.dispose);
    await expectLater(s.finishOnboarding({'reminder': true}), throwsStateError);
    expect(s.onboarded, false);
  });
  test('redoing onboarding keeps custom habit progress', () async {
    final s = SomnaStore(now: () => DateTime(2030, 1, 2), autoRefresh: false);
    addTearDown(s.dispose);
    s.addCustomWidget(
      title: 'Витамины',
      unit: 'шт',
      target: 3,
      step: 1,
      tone: 'lime',
      size: '1x1',
    );
    final id = s.widgets.first.id;
    s.bumpWidget(id);
    s.bumpWidget(id);
    s.patch({'onboarded': false});
    await s.finishOnboarding({
      'widgets': onboardingWidgets(s.widgets, [
        'w-sleep',
      ]).map((w) => w.toJson()).toList(),
    });
    expect(s.onboarded, true);
    final saved = s.widgets.firstWhere((w) => w.id == id);
    expect(saved.kind, 'custom');
    expect(saved.title, 'Витамины');
    expect(saved.value, 2);
    expect(saved.visible, true);
    expect(s.widgets.firstWhere((w) => w.id == 'w-sleep').visible, true);
  });
}
