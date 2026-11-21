import 'package:flutter_test/flutter_test.dart';
import 'package:somna/data/models.dart';
import 'package:somna/logic/recap.dart';

import 'helpers.dart';

void main() {
  final now = DateTime(2026, 11, 21, 12);
  WeeklyRecap recap(
    List<SleepNight> nights, [
    List<MoodEntry> moods = const [],
    List<PracticeSession> sessions = const [],
  ]) => buildWeeklyRecap(nights, moods, sessions, '23:30', '07:30', now);
  test('sparse week preserves gaps and excludes old/future nights', () {
    final r = recap([
      night('2026-11-21'),
      night('2026-11-02'),
      night('2026-11-15', 420),
      night('2026-11-22'),
    ]);
    expect(r.summary.week.map((n) => n.dateKey), ['2026-11-15', '2026-11-21']);
    expect(r.days.map((d) => d.key), [
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
    ]);
    expect(r.days[1].night, null);
    expect(r.summary.avgDuration, 450);
    expect(r.indexDelta, null);
  });
  test('compares only preceding calendar week even with sparse records', () {
    final r = recap([
      night('2026-11-01', 100),
      night('2026-11-08', 240),
      night('2026-11-14', 240),
      night('2026-11-15'),
      night('2026-11-21'),
    ]);
    expect(r.previousNights, 2);
    expect(r.indexDelta, 20);
  });
  test('all checkins, future exclusion, unique days', () {
    final entries = [
      mood(14),
      mood(15, -1),
      mood(15, 1, 11),
      ...List.generate(8, (i) => mood(20, 0.5, i)),
      mood(21, 1, 13),
      mood(22),
    ];
    final r = recap(
      [night('2026-11-15')],
      entries,
      [session(14), session(15), session(19), session(22)],
    );
    expect(r.moods.length, 10);
    expect(r.moodDays, 2);
    expect(r.days[0].mood, 50);
    expect(r.days[1].mood, null);
    expect(r.summary.moodAvg, 70);
    expect(r.practiceCount, 2);
    expect(r.practiceMinutes, 10);
    expect(r.activeDays, 3);
  });
  test('honest empty metrics and starter goals', () {
    final r = recap([night('2026-10-01')]);
    expect(r.indexDelta, null);
    expect(r.summary.week, isEmpty);
    expect(r.summary.moodAvg, null);
    expect(r.goals[0].id, 'checkin');
    expect(r.activeDays, 0);
  });
  test('only nights reaching goal line count', () {
    expect(
      recap([night('2026-11-20', 470), night('2026-11-21', 480)])
          .summary
          .goalNights,
      1,
    );
  });
  test('five ranked emotions without old checkins', () {
    final r = recap([], [
      mood(14, 0, 10, ['Старая эмоция']),
      mood(15, 0, 10, [
        'Радость',
        'Спокойствие',
        'Интерес',
        'Надежда',
        'Усталость',
        'Грусть',
      ]),
      mood(20, 0, 10, ['Усталость']),
    ]);
    expect(r.emotions.map((e) => e.name), [
      'Усталость',
      'Радость',
      'Спокойствие',
      'Интерес',
      'Надежда',
    ]);
    expect(r.emotions[0].count, 2);
  });
  test('local year boundary', () {
    final r = buildWeeklyRecap(
      [night('2026-12-27'), night('2026-12-28'), night('2027-01-03')],
      [],
      [],
      '23:30',
      '07:30',
      DateTime(2027, 1, 3, 12),
    );
    expect(r.days[0].key, '2026-12-28');
    expect(r.days[6].key, '2027-01-03');
    expect(r.summary.week.length, 2);
    expect(r.previousNights, 1);
  });
  test('saved goal retained without duplication', () {
    final options = recap([]).goals;
    const saved = WeeklyGoal(id: 'regular', text: 'Отбой в одно время ±20 мин');
    expect(recapGoalOptions(options, saved).length, 3);
    expect(recapGoalOptions(options, saved)[0].id, saved.id);
    expect(recapGoalOptions(options, saved)[0].text, saved.text);
    expect(recapGoalOptions(options, options[0]), same(options));
    expect(recapGoalOptions(options, null), same(options));
  });
  test('invalid event dates ignored', () {
    final r = recap(
      [],
      [const MoodEntry(at: 'invalid', valence: 1)],
      [
        const PracticeSession(
          id: 'x',
          at: 'invalid',
          kind: 'grounding',
          min: 3,
        ),
      ],
    );
    expect(r.moods, isEmpty);
    expect(r.practiceCount, 0);
  });
}
