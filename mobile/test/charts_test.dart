import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/models.dart';
import 'package:somna/theme/theme.dart';
import 'package:somna/ui/charts/charts.dart';

const _night = SleepNight(
  dateKey: '2030-01-16',
  bedtime: '23:00',
  wakeTime: '07:00',
  durationMin: 480,
  quality: 80,
  awakenings: 1,
);
const _stages = [
  StageSegment(stage: 'awake', min: 5),
  StageSegment(stage: 'deep', min: 35),
  StageSegment(stage: 'light', min: 50),
  StageSegment(stage: 'rem', min: 10),
];

void main() {
  for (final (bed, wake, duration, quality, awakenings) in [
    ('23:38', '07:20', 462.0, 69.0, 2),
    ('23:00', '07:00', 480.0, 100.0, 0),
    ('01:00', '04:00', 180.0, 30.0, 4),
  ]) {
    test('does not invent phases for the $bed–$wake night', () {
      final totals = stageMinutes(
        _night.copyWith(
          bedtime: bed,
          wakeTime: wake,
          durationMin: duration,
          quality: quality,
          awakenings: awakenings,
        ),
      );
      expect(totals.values.reduce((a, b) => a + b), 0);
      expect(totals.values.every((v) => v >= 0), true);
    });
  }
  test('stage geometry uses cumulative minutes and fixed stage levels', () {
    final points = hypnogramPoints(_stages);
    expect(points.first, const Offset(62, 12));
    expect(points[1].dx, 74.5);
    expect(points[2], const Offset(74.5, 93));
    expect(points.last, const Offset(312, 39));
    expect(hypnogramPoints(_stages, compact: true).first.dx, 4);
    expect(hypnogramPoints([]), isEmpty);
    expect(
      hypnogramPoints(const [
        StageSegment(stage: 'bad', min: 5),
        StageSegment(stage: 'deep', min: -1),
      ]),
      isEmpty,
    );
    expect(stageDisplayMinutes(_stages), {
      'deep': 35,
      'light': 50,
      'rem': 10,
      'awake': 5,
    });
    expect(
      stageDisplayMinutes(const [
        StageSegment(stage: 'deep', min: .4),
        StageSegment(stage: 'rem', min: .4),
        StageSegment(stage: 'awake', min: .4),
      ]).values.reduce((a, b) => a + b),
      1,
    );
  });
  test(
    'calendar dates align Monday to Sunday and preserve rolling 28-day month',
    () {
      final days = sleepCalendarDays(DateTime(2030, 1, 16));
      expect(days.length, 35);
      expect(days.first.weekday, DateTime.monday);
      expect(days.last, DateTime(2030, 1, 20));
      expect(days.first, DateTime(2029, 12, 17));
      final moodDays = moodCalendarDays(DateTime(2032, 3, 1));
      expect(moodDays.length, 28);
      expect(moodDays.last, DateTime(2032, 3, 1));
      expect(moodDays.contains(DateTime(2032, 2, 29)), true);
    },
  );
  test('spline empty/single point and endpoint geometry', () {
    expect(smoothPath([]).computeMetrics(), isEmpty);
    expect(smoothPath([Offset.zero]).computeMetrics(), isEmpty);
    final metric = smoothPath([const Offset(1, 2), const Offset(10, 9)])
        .computeMetrics()
        .single;
    expect(metric.getTangentForOffset(0)!.position, const Offset(1, 2));
    expect(
      metric.getTangentForOffset(metric.length)!.position.dx,
      closeTo(10, .001),
    );
  });
  for (final brightness in Brightness.values) {
    for (final empty in [true, false]) {
      for (final reduced in [true, false]) {
        testWidgets(
          'all charts render $brightness empty=$empty reduced=$reduced',
          (tester) async {
            final stages = empty ? <StageSegment>[] : _stages;
            final charts = <Widget>[
              Hypnogram(stages: stages, bedtime: '23:00', wakeTime: '07:00'),
              Hypnogram(stages: stages, compact: true),
              StageLegend(stages: stages),
              MoodTrend(
                days: empty
                    ? []
                    : const [
                        MoodDay(key: '1', label: '1', value: -1),
                        MoodDay(key: '2', label: '2'),
                        MoodDay(key: '3', label: '3', value: 0),
                        MoodDay(key: '4', label: '4', value: 1),
                      ],
              ),
              Wave(values: empty ? [] : [4, 7, 6], fill: true),
              Bars(
                values: empty ? [] : [4, 7, 6],
                labels: const ['Пн', 'Вт', 'Ср'],
                goal: 8,
              ),
              Ring(value: empty ? 0 : .8),
              ScoreRing(score: empty ? null : 80),
              Arc(value: empty ? 0 : .5),
              DotTrack(value: empty ? 0 : .8),
              DotRow(values: empty ? [] : [1, 0, .5]),
              Orbits(points: empty ? [] : [.2, .8]),
              SleepCalendar(
                nights: empty ? [] : [_night],
                today: DateTime(2030, 1, 16),
                bedGoal: '23:00',
                wakeGoal: '07:00',
              ),
              MoodCalendar(
                moods: empty
                    ? []
                    : const [
                        MoodEntry(at: '2030-01-16T12:00:00', valence: -1),
                        MoodEntry(at: '2030-01-16T18:00:00', valence: 1),
                      ],
                today: DateTime(2030, 1, 16),
              ),
            ];
            for (final chart in charts) {
              await tester.pumpWidget(
                MaterialApp(
                  theme: somnaTheme(brightness),
                  home: Scaffold(
                    body: MediaQuery(
                      data: MediaQueryData(disableAnimations: reduced),
                      child: Center(child: SizedBox(width: 320, child: chart)),
                    ),
                  ),
                ),
              );
              await tester.pumpAndSettle();
              expect(
                tester.takeException(),
                isNull,
                reason: chart.runtimeType.toString(),
              );
            }
          },
        );
      }
    }
  }
  testWidgets('stage legend renders visible weighted segments', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Center(
          child: SizedBox(width: 320, child: StageLegend(stages: _stages)),
        ),
      ),
    );
    final bars = find.descendant(
      of: find.byType(StageLegend),
      matching: find.byType(ColoredBox),
    );
    expect(bars, findsNWidgets(4));
    for (var i = 0; i < 4; i++) {
      expect(
        tester.getSize(bars.at(i)),
        Size([112.0, 160.0, 32.0, 16.0][i], 6),
      );
    }
    await tester.pumpWidget(const MaterialApp(home: StageLegend(stages: [])));
    expect(
      find.descendant(
        of: find.byType(StageLegend),
        matching: find.byType(ColoredBox),
      ),
      findsNothing,
    );
  });
  testWidgets('single points and invalid numeric inputs render safely', (
    tester,
  ) async {
    for (final chart in <Widget>[
      const Wave(values: [5]),
      const Wave(values: [double.nan, 1]),
      const Bars(
        values: [double.nan, double.infinity, -1],
        max: 0,
        goal: double.nan,
      ),
      const ScoreRing(score: double.nan),
      const Ring(value: double.infinity),
      const Arc(value: double.nan),
      const DotTrack(value: double.nan, count: 0),
      const MoodTrend(
        days: [MoodDay(key: '1', label: '1', value: .5)],
      ),
      const Hypnogram(
        stages: [StageSegment(stage: 'deep', min: double.nan)],
      ),
    ]) {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(child: SizedBox(width: 320, child: chart)),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    }
  });
  testWidgets(
    'sleep calendar routes only recorded nights and empty states stay honest',
    (tester) async {
      SleepNight? selected;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 320,
                child: Column(
                  children: [
                    const Hypnogram(stages: []),
                    const MoodTrend(days: []),
                    SleepCalendar(
                      nights: const [_night],
                      today: DateTime(2030, 1, 16),
                      bedGoal: '23:00',
                      wakeGoal: '07:00',
                      onNightTap: (n) => selected = n,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Пока нет данных о фазах сна. Запись в дневнике не измеряет фазы.',
        ),
        findsOneWidget,
      );
      expect(
        find.text('График появится после первого чек-ина.'),
        findsOneWidget,
      );
      await tester.tap(find.bySemanticsLabel(RegExp('Сегодня: оценка')));
      expect(selected, same(_night));
    },
  );
}
