import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/facts.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';
import 'package:somna/logic/time.dart';
import 'package:somna/profile/insights_sheet.dart';
import 'package:somna/profile/journal_sheet.dart';
import 'package:somna/screens/today.dart';
import 'package:somna/shell/onboarding_story.dart';
import 'package:somna/theme/theme.dart';
import 'package:somna/ui/buddies.dart';
import 'package:somna/ui/feedback.dart';
import 'package:somna/ui/glow.dart';
import 'package:somna/ui/info_cards.dart';
import 'package:somna/ui/mood_orb.dart';
import 'package:somna/ui/sheets.dart';

SleepNight _night(
  int back, {
  double min = 480,
  String bed = '23:30',
  List<String> tags = const [],
}) => SleepNight(
  id: 'n$back',
  dateKey: dateKey(daysAgo(back)),
  bedtime: bed,
  wakeTime: '07:30',
  durationMin: min,
  quality: 80,
  awakenings: 0,
  tags: tags,
);

MoodEntry _mood(int back, double v, {List<String> emotions = const []}) =>
    MoodEntry(
      id: 'm$back',
      at: isoUtc(daysAgo(back)),
      valence: v,
      emotions: emotions,
    );

SomnaStore _store({
  List<SleepNight> nights = const [],
  List<MoodEntry> moods = const [],
}) {
  final s = SomnaStore(
    initialState: defaultState().patch({
      'onboarded': true,
      'theme': 'dark',
      'nights': nights.map((n) => n.toJson()).toList(),
      'moods': moods.map((m) => m.toJson()).toList(),
    }),
    autoRefresh: false,
  );
  addTearDown(s.dispose);
  return s;
}

Future<void> _host(WidgetTester tester, SomnaStore s, Widget child) async {
  tester.view.physicalSize = const Size(1080, 2340);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    SomnaScope(
      store: s,
      child: MaterialApp(
        theme: somnaTheme(Brightness.dark),
        home: Scaffold(body: SingleChildScrollView(child: child)),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUp(() => Feel.enabled = false);

  group('store journal actions', () {
    test('removeMood and restoreMood keep order by time', () {
      final s = _store(moods: [_mood(3, .1), _mood(2, .2), _mood(1, .3)]);
      final mid = s.moods[1];
      s.removeMood(mid.id);
      expect(s.moods.map((m) => m.id), ['m3', 'm1']);
      s.restoreMood(mid);
      expect(s.moods.map((m) => m.id), ['m3', 'm2', 'm1']);
    });
    test('restoreNight brings back the same id', () {
      final s = _store(nights: [_night(2), _night(1)]);
      final n = s.nights.first;
      s.removeNight(n.id);
      s.restoreNight(n);
      expect(s.nights.map((x) => x.id), ['n2', 'n1']);
    });
  });

  group('analytics math', () {
    test('sleep and mood points pair nights with same-day check-ins', () {
      final pts = sleepMoodPoints(
        [_night(1, min: 420), _night(2, min: 540), _night(3)],
        [_mood(1, -.4), _mood(2, .6), _mood(2, .2)],
      );
      expect(pts.length, 2);
      expect(pts.first.hours, 7);
      expect(pts[1].mood, closeTo(.4, 1e-9));
    });
    test('correlation is positive for more sleep, better mood', () {
      final r = correlation([
        (hours: 6, mood: -.5),
        (hours: 7, mood: 0),
        (hours: 8, mood: .5),
        (hours: 9, mood: .9),
      ]);
      expect(r, greaterThan(.9));
      expect(correlationLabel(r), startsWith('Сильная'));
      expect(correlation([(hours: 7, mood: 0)]), 0);
    });
    test('weekday means leave empty weekdays null', () {
      final w = weekdayMeans([_night(0, min: 400), _night(7, min: 500)]);
      expect(w.whereType<double>().single, 450);
      expect(w.where((v) => v == null).length, 6);
    });
    test('bedtime spread is midnight-safe', () {
      expect(
        bedtimeSpread([_night(1, bed: '23:50'), _night(2, bed: '00:10')]),
        closeTo(10, 1e-9),
      );
      expect(bedtimeSpread([_night(1)]), 0);
    });
  });

  group('content', () {
    test('fact of the day is stable within a day and filtered by topic', () {
      final a = factOfDay(DateTime(2026, 11, 23, 8));
      final b = factOfDay(DateTime(2026, 11, 23, 22));
      expect(a, same(b));
      expect(factOfDay(DateTime(2026, 11, 23), topic: 'mind').topic, 'mind');
      expect(somnaFacts.map((f) => f.title).toSet().length, somnaFacts.length);
    });
    test('month groups keep order and split on month change', () {
      final groups = groupByMonth([
        DateTime(2026, 11, 3),
        DateTime(2026, 11, 1),
        DateTime(2026, 10, 30),
      ], (d) => d);
      expect(groups.map((g) => g.$1), ['Ноябрь 2026', 'Октябрь 2026']);
      expect(groups.first.$2.length, 2);
    });
    test('companion line follows the day', () {
      final s = _store();
      expect(
        companionLine(s, DateTime(2026, 11, 23, 8)),
        contains('Доброе утро'),
      );
      s.addNight(_night(0));
      expect(
        companionLine(s, DateTime.now().copyWith(hour: 14)),
        contains('настроение'),
      );
    });
    test('every onboarding step has a buddy, a line and a glow', () {
      expect(stepBuddies.length, 9);
      expect(stepLines.length, 9);
      expect(stepGlows.length, 9);
      expect(stepLines.join().contains('—'), isFalse);
    });
  });

  group('journal sheet', () {
    testWidgets('lists nights by month, deletes with undo', (tester) async {
      final s = _store(
        nights: [
          _night(2),
          _night(1, tags: ['Кофеин']),
        ],
      );
      await _host(tester, s, const JournalSheet(arg: 'nights'));
      expect(find.text('Все записи'), findsOneWidget);
      expect(find.byType(Dismissible), findsNWidgets(2));
      expect(find.text('Кофеин'), findsWidgets);
      await tester.drag(find.text('Вчера'), const Offset(-400, 0));
      await tester.pumpAndSettle();
      expect(s.nights.length, 1);
      expect(find.text('Запись удалена'), findsOneWidget);
      await tester.tap(find.text('Вернуть'));
      await tester.pumpAndSettle();
      expect(s.nights.length, 2);
      expect(find.text('Запись удалена'), findsNothing);
    });

    testWidgets('mood tab expands a check-in and shows empty states', (
      tester,
    ) async {
      final s = _store(
        moods: [
          _mood(0, .8, emotions: ['Радость']),
        ],
      );
      await _host(tester, s, const JournalSheet(arg: 'moods'));
      expect(find.text('Очень приятно'), findsOneWidget);
      await tester.tap(find.text('Очень приятно'));
      await tester.pumpAndSettle();
      expect(find.text('Радость'), findsWidgets);
      await tester.tap(find.text('Сон').first);
      await tester.pumpAndSettle();
      expect(find.textContaining('Здесь будут ваши ночи'), findsOneWidget);
      expect(find.byType(Buddy), findsOneWidget);
    });
  });

  group('surfaces', () {
    testWidgets('orb drags valence up and stays still under test', (
      tester,
    ) async {
      var v = 0.0;
      await tester.pumpWidget(
        MaterialApp(
          home: Center(
            child: StatefulBuilder(
              builder: (context, set) => MoodOrb(
                valence: v,
                size: 200,
                onChanged: (x) => set(() => v = x),
              ),
            ),
          ),
        ),
      );
      await tester.drag(find.byType(MoodOrb), const Offset(0, -90));
      await tester.pumpAndSettle();
      expect(v, greaterThan(.3));
      expect(tester.binding.hasScheduledFrame, isFalse);
    });

    testWidgets('plates, bevel glass, LEDs, pill and tips render', (
      tester,
    ) async {
      final s = _store(nights: [for (var i = 1; i <= 4; i++) _night(i)]);
      var taps = 0;
      await _host(
        tester,
        s,
        Column(
          children: [
            GlowPlate.named('candy', child: const Text('plate')),
            const BevelGlass(child: Text('glass')),
            const LedMeter(value: .5),
            ActionPill(label: 'Далее', onPressed: () => taps++),
            const StepLeds(step: 2, count: 9),
            FactPlate(fact: somnaFacts.first),
            const SleepExplainer(),
            const BuddyTip(text: 'Привет', kind: BuddyKind.moon),
            for (final k in BuddyKind.values) Buddy(kind: k, size: 40),
          ],
        ),
      );
      await tester.tap(find.text('Далее'));
      await tester.pumpAndSettle();
      expect(taps, 1);
      expect(find.text('Привет'), findsWidgets);
      expect(find.byType(RangeRow), findsNWidgets(sleepByAge.length));
      expect(tester.takeException(), isNull);
    });

    testWidgets('insights need three nights, then draw every block', (
      tester,
    ) async {
      final few = _store(nights: [_night(1)]);
      await _host(tester, few, const InsightsSheet());
      expect(find.textContaining('хотя бы три ночи'), findsOneWidget);

      final s = _store(
        nights: [
          for (var i = 1; i <= 8; i++)
            _night(i, min: 400 + i * 10, tags: i.isEven ? ['Спорт'] : []),
        ],
        moods: [for (var i = 1; i <= 8; i++) _mood(i, i / 10)],
      );
      await _host(tester, s, const InsightsSheet());
      expect(find.text('Сон и настроение'), findsOneWidget);
      expect(find.text('Ритм недели'), findsOneWidget);
      expect(find.text('Стабильность отбоя'), findsOneWidget);
      expect(find.text('Что влияет на ночь'), findsOneWidget);
      expect(find.text('Лучшие ночи'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    test('registry still serves the worry diary, not removed practices', () {
      final r = SheetRegistry();
      addTearDown(r.dispose);
      expect(r.contains('worry'), isTrue);
      expect(r.contains('grounding'), isFalse);
      expect(r.contains('bodyscan'), isFalse);
    });
  });
}
