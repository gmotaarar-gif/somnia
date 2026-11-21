import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';

import 'helpers.dart';

class DelayedPersistence extends MemoryPersistence {
  Completer<void>? gate;
  @override
  Future<void> write(String serialized) async {
    await gate?.future;
    await super.write(serialized);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  var now = DateTime(2030, 1, 2, 9, 5);
  var id = 0;
  SomnaStore create([MemoryPersistence? persistence]) {
    final store = SomnaStore(
      persistence: persistence,
      now: () => now,
      uid: () => '${id++}',
      autoRefresh: false,
    );
    addTearDown(store.dispose);
    return store;
  }

  setUp(() {
    now = DateTime(2030, 1, 2, 9, 5);
    id = 0;
  });

  test('morning reminder opens mood without night session', () {
    final s = create();
    s.handleReminder('mood');
    expect(s.sheet, 'mood');
    expect(s.nightMode, false);
  });
  test('morning tap during night session uses wake-up path', () {
    final s = create();
    s.startNight();
    final started = s.nightStart;
    expect(started, '09:05');
    s.handleReminder('mood');
    expect(s.nightMode, false);
    expect(s.sheet, 'sleep');
    expect(s.nightStart, started);
  });
  test('wake-up path remains while night awaits logging', () {
    final s = create();
    s.startNight();
    s.endNight(true);
    s.openSheet(null);
    s.handleReminder('mood');
    expect(s.sheet, 'sleep');
    expect(s.nightMode, false);
    s.endNight(false);
    expect(s.nightStart, null);
  });
  test('restores settings but not transient sheets', () async {
    final p = MemoryPersistence(), first = create();
    final s = create(p);
    s.patch({
      'userName': 'Mira',
      'bedGoal': '00:15',
      'wakeGoal': '08:15',
      'reminder': false,
    });
    s.openSheet('sleep');
    expect(s.sheet, 'sleep');
    await s.flush();
    final restored = create(p);
    expect(restored.userName, 'Mira');
    expect(restored.bedGoal, '00:15');
    expect(restored.wakeGoal, '08:15');
    expect(restored.reminder, false);
    expect(restored.sheet, null);
    expect(first.bedGoal, '23:30');
  });
  test(
    'hides redundant widgets only once and adds missing gallery entries',
    () async {
      final p = MemoryPersistence.json({
        'widgets': [
          defaultWidgets[1].copyWith(visible: true).toJson(),
          defaultWidgets[3].toJson(),
        ],
      });
      final first = create(p);
      expect(first.widgets.where((w) => w.visible).map((w) => w.id), [
        'w-water',
      ]);
      expect(first.widgets.length, defaultWidgets.length);
      first.updateWidget('w-sleep', {'visible': true});
      await first.flush();
      expect(create(p).widgets.where((w) => w.visible).map((w) => w.id), [
        'w-sleep',
        'w-water',
      ]);
    },
  );
  for (final raw in ['{invalid', 'null', '[]', '{"water":null}']) {
    test('malformed snapshot falls back: $raw', () {
      final s = create(MemoryPersistence(raw));
      expect(s.bedGoal, '23:30');
      expect(s.wakeGoal, '07:30');
    });
  }
  test('shallow defaults, theme validation and morning-time migration', () {
    final s = create(
      MemoryPersistence.json({'theme': 'unknown', 'wakeGoal': '09:15'}),
    );
    expect(s.theme, 'system');
    expect(s.morningReminderTime, '09:15');
    expect(s.volume, 60);
    expect(s.nights.length, 14);
    final valid = create(
      MemoryPersistence.json({
        'theme': 'light',
        'morningReminderTime': '06:30',
      }),
    );
    expect(valid.theme, 'light');
    expect(valid.morningReminderTime, '06:30');
  });
  test('one night per morning, ordered, stamped mood', () {
    final s = create(),
        before = defaultState(now).nights.length,
        moods = defaultState(now).moods.length;
    s.addNight(night('2029-11-01'));
    s.addMood(const MoodEntry(valence: 0.5, emotions: ['Calm']));
    expect(s.nights.length, before + 1);
    expect(s.nights[0].dateKey, '2029-11-01');
    expect(s.nights[0].durationMin, 480);
    expect(s.moods.length, moods + 1);
    expect(DateTime.parse(s.moods.last.at), now.toUtc());
    s.addNight(night('2029-11-01', 400));
    expect(s.nights.length, before + 1);
    expect(
      s.nights.where((n) => n.dateKey == '2029-11-01').single.durationMin,
      400,
    );
  });
  test('normalizes duplicate unordered saved nights, latest wins', () {
    final s = create(
      MemoryPersistence.json({
        'nights': [
          night('2030-01-03').toJson(),
          night('2030-01-02', 300).toJson(),
          night('2030-01-02', 420).toJson(),
        ],
      }),
    );
    expect(s.nights.map((n) => [n.dateKey, n.durationMin]), [
      ['2030-01-02', 420],
      ['2030-01-03', 480],
    ]);
  });
  testWidgets('open store crosses midnight on periodic refresh', (
    tester,
  ) async {
    now = DateTime(2030, 1, 2, 23, 58);
    final s = SomnaStore(now: () => now);
    s.addWater(250);
    final ml = s.water.ml;
    expect(ml, greaterThan(0));
    now = DateTime(2030, 1, 2, 23, 59);
    await tester.pump(const Duration(minutes: 1));
    expect(s.water.ml, ml);
    now = DateTime(2030, 1, 3, 0, 1);
    await tester.pump(const Duration(minutes: 2));
    expect(s.water.toJson(), {'day': '2030-01-03', 'ml': 0});
    expect(s.ritual.toJson(), {'day': '2030-01-03', 'done': []});
    s.dispose();
  });
  test('removed breathing migration preserves earned minutes', () {
    final s = create(
      MemoryPersistence.json({
        'layout': 2,
        'breath': {'day': '2030-01-02', 'min': 6},
        'widgets': [
          {
            'id': 'w-breath',
            'kind': 'breath',
            'size': '1x1',
            'tone': 'coral',
            'visible': true,
          },
          defaultWidgets[3].toJson(),
        ],
        'sessions': [
          {
            'id': 'a',
            'at': '2030-01-01T10:00:00.000Z',
            'kind': 'breath',
            'min': 4,
          },
          {
            'id': 'b',
            'at': '2030-01-01T11:00:00.000Z',
            'kind': 'grounding',
            'min': 3,
          },
        ],
      }),
    );
    expect(s.state.toJson().containsKey('breath'), false);
    expect(s.widgets.any((w) => w.id == 'w-breath'), false);
    expect(s.widgets.firstWhere((w) => w.id == 'w-water').visible, true);
    expect(s.sessions.map((s) => s.min), [4, 3]);
  });
  test('removed breathing ritual step does not count', () {
    final s = create(
      MemoryPersistence.json({
        'layout': 2,
        'ritual': {
          'day': '2030-01-02',
          'done': ['dim', 'breath'],
        },
      }),
    );
    expect(s.ritual.toJson(), {
      'day': '2030-01-02',
      'done': ['dim'],
    });
  });
  test(
    'stale daily counters roll over independently including custom widgets',
    () {
      final s = create(
        MemoryPersistence.json({
          'water': {'day': '2030-01-02', 'ml': 250},
          'ritual': {
            'day': '2030-01-01',
            'done': ['dim'],
          },
          'widgets': [
            {
              'id': 'custom',
              'kind': 'custom',
              'size': '1x1',
              'tone': 'lime',
              'visible': true,
              'value': 8,
              'day': '2030-01-01',
            },
          ],
        }),
      );
      expect(s.water.ml, 250);
      expect(s.ritual.done, isEmpty);
      expect(s.widgets.first.value, 0);
      expect(s.widgets.first.day, '2030-01-02');
      s.bumpWidget('custom');
      expect(s.widgets.first.value, 1);
      now = DateTime(2030, 1, 3);
      s.refreshDay();
      expect(s.widgets.first.value, 0);
    },
  );
  test('caps nights, moods, sessions, worries, wellbeing', () {
    final s = create();
    s.patch({
      'nights': [],
      'moods': [],
      'sessions': [],
      'worries': [],
      'wellbeing': [],
    });
    for (var i = 0; i < 305; i++) {
      s.addNight(night('2030-${i.toString().padLeft(4, '0')}'));
      s.addMood(const MoodEntry(valence: 0));
      s.addSession('grounding', 3);
      s.addWorry('$i', 'Plan');
      s.addWellbeing(i.toDouble());
    }
    expect(s.nights.length, 90);
    expect(s.moods.length, 200);
    expect(s.sessions.length, 300);
    expect(s.worries.length, 60);
    expect(s.worries.first.text, '304');
    expect(s.wellbeing.length, 52);
    final worryId = s.worries.first.id;
    s.toggleWorry(worryId);
    expect(s.worries.first.done, true);
    s.removeWorry(worryId);
    expect(s.worries.length, 59);
    s.removeNight(s.nights.first.id);
    expect(s.nights.length, 89);
  });
  test('water/spectrum clamps, ritual/article toggles, widget edits and reset semantics', () {
    final s = create();
    s.addWater(9000);
    expect(s.water.ml, 4000);
    s.addWater(-9000);
    expect(s.water.ml, 0);
    s.setSpectrum('calm', -1);
    expect(s.spectrum.first.value, 0);
    s.setSpectrum('calm', 2);
    expect(s.spectrum.first.value, 1);
    s.toggleRitual('dim');
    expect(s.ritual.done, isEmpty);
    s.toggleRitual('dim');
    expect(s.ritual.done, ['dim']);
    s.markArticleRead('a');
    s.markArticleRead('a');
    expect(s.readArticles, ['a']);
    s.addCustomWidget(title: 'Витамины', unit: 'шт', step: 2, target: 3);
    final customId = s.widgets.first.id;
    s.bumpWidget(customId);
    expect(s.widgets.first.value, 2);
    s.updateWidget(customId, {'title': 'Новый', 'unit': null});
    expect(s.widgets.first.unit, null);
    s.setWidgets(s.widgets.reversed.toList());
    expect(s.widgets.last.id, customId);
    s.resetWidgets();
    expect(s.widgets.first.id, customId);
    expect(s.widgets.first.value, 2);
    expect(
      s.widgets.skip(1).map((w) => w.toJson()),
      defaultWidgets.map((w) => w.toJson()),
    );
    s.deleteWidget(customId);
    expect(s.widgets.any((w) => w.id == customId), false);
  });
  testWidgets(
    'save is debounced, contains complete state and excludes transients',
    (tester) async {
      final p = MemoryPersistence(), s = create();
      final persisted = create(p);
      persisted.patch({'userName': 'A'});
      persisted.patch({'userName': 'B'});
      persisted.openSheet('mood');
      await tester.pump(const Duration(milliseconds: 249));
      expect(p.writes, 0);
      await tester.pump(const Duration(milliseconds: 1));
      expect(p.writes, 1);
      expect(p.json['userName'], 'B');
      expect(p.json.containsKey('sheet'), false);
      expect(p.json['nights'], isA<List>());
      expect(s.onboarded, false);
    },
  );
  test('reverting to saved state during an in-flight save persists the latest state', () async {
    final p = DelayedPersistence();
    final s = create(p);
    await s.flush();
    final original = s.userName;
    final gate = Completer<void>();
    p.gate = gate;
    s.patch({'userName': 'Intermediate edit'});
    final intermediate = s.flush();
    await Future<void>.delayed(Duration.zero);
    s.patch({'userName': original});
    final reverted = s.flush();
    gate.complete();
    await Future.wait([intermediate, reverted]);
    expect(create(p).userName, original);
  });
  test(
    'registration rename reverted before autosave stays reverted after restart',
    () async {
      final p = MemoryPersistence();
      final s = create(p);
      await s.registerLocalProfile(
        const RegistrationInput(name: 'Original', email: 'mira@example.com'),
      );
      await s.flush();
      await s.registerLocalProfile(
        const RegistrationInput(name: 'Мира', email: 'mira@example.com'),
      );
      s.patch({'userName': 'Original'});
      await s.flush();
      final restored = create(p);
      expect(restored.userName, 'Original');
      expect(restored.localAccount?.email, 'mira@example.com');
    },
  );
  test(
    'reload during an in-flight save cannot suppress the final reverted write',
    () async {
      final p = DelayedPersistence();
      final s = create(p);
      await s.flush();
      final original = s.userName;
      final gate = Completer<void>();
      p.gate = gate;
      s.patch({'userName': 'Intermediate edit'});
      final intermediate = s.flush();
      await Future<void>.delayed(Duration.zero);
      s.patch({'userName': original});
      s.reloadFromStorage();
      gate.complete();
      await intermediate;
      await s.flush();
      expect(create(p).userName, original);
    },
  );
  for (final accountWrite in ['registration', 'membership']) {
    for (final saved in [true, false]) {
      test(
        'disposing during pending $accountWrite preserves the account write (saved=$saved)',
        () async {
          final p = DelayedPersistence();
          final s = SomnaStore(
            persistence: p,
            now: () => now,
            autoRefresh: false,
          );
          if (saved) await s.flush();
          final gate = Completer<void>();
          p.gate = gate;
          final pending = accountWrite == 'registration'
              ? s.registerLocalProfile(
                  const RegistrationInput(
                    name: 'Мира',
                    email: 'mira@example.com',
                  ),
                )
              : s.activate('monthly');
          await Future<void>.delayed(Duration.zero);
          s.dispose();
          gate.complete();
          await pending;
          await Future<void>.delayed(Duration.zero);
          final restored = create(p);
          if (accountWrite == 'registration') {
            expect(restored.localAccount?.email, 'mira@example.com');
            expect(restored.userName, 'Мира');
          } else {
            expect(restored.membership?.plan, 'monthly');
            expect(restored.isPlus, true);
          }
        },
      );
    }
  }
  test('failed autosave keeps in-memory journal', () async {
    final p = MemoryPersistence()..fail = true;
    final s = create(p);
    s.addMood(const MoodEntry(valence: 0.7, emotions: ['Ясность']));
    await s.flush();
    expect(s.moods.last.emotions, ['Ясность']);
    expect(p.raw, null);
    p.fail = false;
    await s.flush();
    expect(p.json['moods'].last['emotions'], ['Ясность']);
  });
  test(
    'external snapshots sync without autosaving and unsaved edits win',
    () async {
      final p = MemoryPersistence(), s = create();
      final persisted = create(p);
      await persisted.flush();
      p.raw = jsonEncode({...p.json, 'volume': 12});
      final writes = p.writes;
      persisted.reloadFromStorage();
      expect(persisted.volume, 12);
      expect(p.writes, writes);
      p.fail = true;
      persisted.addMood(const MoodEntry(valence: 0.7, emotions: ['Ясность']));
      await persisted.flush();
      final count = persisted.moods.length;
      p.raw = jsonEncode({...p.json, 'volume': 18});
      persisted.reloadFromStorage();
      expect(persisted.moods.length, count);
      expect(persisted.moods.last.emotions, ['Ясность']);
      expect(s.volume, 60);
    },
  );
  test('shared preferences uses a single JSON value', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final s = SomnaStore(
      persistence: PreferencesPersistence(prefs),
      now: () => now,
      autoRefresh: false,
    );
    addTearDown(s.dispose);
    s.patch({'theme': 'dark', 'soundTimer': 15});
    await s.flush();
    expect(prefs.getKeys(), {storageKey});
    final restored = create(MemoryPersistence(prefs.getString(storageKey)));
    expect(restored.theme, 'dark');
    expect(restored.soundTimer, 15);
  });
  testWidgets('scope subscribes and rejects missing ancestors', (tester) async {
    final s = create();
    await tester.pumpWidget(
      SomnaScope(
        store: s,
        child: Directionality(
          textDirection: TextDirection.ltr,
          child: Builder(
            builder: (context) => Text(SomnaScope.of(context).userName),
          ),
        ),
      ),
    );
    s.patch({'userName': 'Мира'});
    await tester.pump();
    expect(find.text('Мира'), findsOneWidget);
    await tester.pumpWidget(
      Builder(
        builder: (context) {
          SomnaScope.of(context);
          return const SizedBox();
        },
      ),
    );
    expect(tester.takeException(), isA<FlutterError>());
  });
  testWidgets('night sound timer and navigation stay transient', (
    tester,
  ) async {
    final s = create();
    s.patch({'soundTimer': 1});
    s.startNight();
    await tester.pump(const Duration(minutes: 1));
    expect(s.nightSound, 'off');
    expect(s.nightMode, true);
    s.clearNightStart();
    expect(s.nightStart, null);
    s.setTab('practices');
    expect(s.tabDir, 1);
    s.setTab('today');
    expect(s.tabDir, -1);
    s.setEditing(true);
    expect(s.editing, true);
  });
}
