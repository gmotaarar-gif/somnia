import 'package:flutter_test/flutter_test.dart';
import 'package:somna/data/models.dart';
import 'package:somna/logic/metrics.dart';

import 'helpers.dart';

void main() {
  test('countdown toward bedtime after midnight', () {
    final c = bedtimeCountdown('00:15', '08:15', DateTime(2027, 1, 2, 23, 55));
    expect(c.minutes, 20);
    expect(c.past, false);
  });
  test('stops countdown after bedtime', () {
    final c = bedtimeCountdown('23:30', '07:30', DateTime(2027, 1, 2, 23, 45));
    expect(c.minutes, 0);
    expect(c.past, true);
    expect(c.dayProgress, 1);
  });
  final now = DateTime(2027, 1, 5, 9);
  test('streak survives an unlogged morning', () {
    final nights = [
      '2027-01-02',
      '2027-01-03',
      '2027-01-04',
    ].map(night).toList();
    expect(computeStreak(nights, now), 3);
    expect(computeStreak([...nights, night('2027-01-05')], now), 4);
  });
  test('streak breaks on missed days', () {
    expect(
      computeStreak(
        ['2027-01-01', '2027-01-02', '2027-01-04'].map(night).toList(),
        now,
      ),
      1,
    );
    expect(
      computeStreak(['2027-01-01', '2027-01-02'].map(night).toList(), now),
      0,
    );
    expect(computeStreak([], now), 0);
  });
  test('summary empty and populated', () {
    final empty = summarize([], [], '23:30', '07:30', now: now);
    expect(empty.index, 0);
    expect(empty.moodAvg, null);
    expect(empty.last, null);
    expect(nightScore(night('2027-01-05'), '23:30', '07:30'), 93);
    final s = summarize(
      [night('2027-01-04', 240), night('2027-01-05')],
      [],
      '23:30',
      '07:30',
      span: 1,
      now: now,
    );
    expect(s.avgDuration, 480);
    expect(s.indexDelta, 20);
    expect(s.streak, 2);
    expect(s.accuracy, 100);
    expect(s.bedSd, 0);
    expect(s.goalNights, 1);
    expect(indexLabel(85), 'Отличный ритм');
    expect(qualityLabel(86), 'Хороший отдых');
  });
  test('factor and emotion ranks preserve insertion-order ties', () {
    final moods = [
      const MoodEntry(
        at: '2026-11-15T10:00:00Z',
        valence: 1,
        emotions: ['Ясность', 'Радость'],
        factors: ['Сон', 'Отдых'],
      ),
      const MoodEntry(
        at: '2026-11-16T10:00:00Z',
        valence: -1,
        emotions: ['Усталость'],
        factors: ['Стресс'],
      ),
    ];
    expect(factorImpacts(moods).map((f) => f.name), ['Сон', 'Отдых', 'Стресс']);
    expect(factorImpacts(moods).map((f) => f.delta), [50, 50, -50]);
    expect(emotionCounts(moods).map((e) => e.name), [
      'Ясность',
      'Радость',
      'Усталость',
    ]);
    expect(
      sleepMoodLink([night('2026-11-15'), night('2026-11-16', 360)], moods),
      100,
    );
    expect(sleepMoodLink([], moods), 0);
    expect(buildInsights([], [], '23:30', '07:30', now: now), isEmpty);
    expect(
      buildInsights(
        [night('2026-11-15'), night('2026-11-16', 360)],
        moods,
        '23:30',
        '07:30',
        now: now,
      ).map((i) => i.id),
      ['link', 'steady', 'debt'],
    );
  });
}
