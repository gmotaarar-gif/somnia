import 'package:flutter_test/flutter_test.dart';
import 'package:somna/data/models.dart';
import 'package:somna/logic/features.dart';
import 'package:somna/logic/valence.dart';

import 'helpers.dart';

void main() {
  test(
    'cycle calculations wrap midnight and retain the five-cycle recommendation',
    () {
      expect(wakeOptions('23:30').map((o) => o.time), [
        '05:44',
        '07:14',
        '08:44',
      ]);
      expect(wakeOptions('23:30').map((o) => o.sleepMin), [360, 450, 540]);
      expect(bedOptions('07:30').map((o) => o.time), [
        '22:16',
        '23:46',
        '01:16',
      ]);
      expect(bedOptions('07:30').map((o) => o.best), [false, true, false]);
    },
  );
  test('journal entries do not invent measured sleep stages', () {
    final stages = hypnogram(night('2030-01-02').copyWith(awakenings: 2));
    final totals = stageTotals(stages);
    expect(stages, isEmpty);
    expect(totals.values.every((value) => value == 0), true);
    expect(stageTotals([]), {'awake': 0, 'rem': 0, 'light': 0, 'deep': 0});
    final short = hypnogram(
      night('x').copyWith(bedtime: '07:00', wakeTime: '07:01'),
    );
    expect(short.fold<double>(0, (a, b) => a + b.min), 0);
  });
  test(
    'awards preserve legacy practice minutes and have honest empty progress',
    () {
      final empty = buildAwards(
        nights: [],
        moods: [],
        sessions: [],
        wellbeing: [],
        bedGoal: '23:30',
        wakeGoal: '07:30',
        customWidgets: 0,
        now: DateTime(2030),
      );
      expect(empty.length, 11);
      expect(empty.every((a) => !a.done && a.progress == 0), true);
      final awards = buildAwards(
        nights: [night('2030-01-02')],
        moods: [],
        sessions: const [
          PracticeSession(id: 'a', at: '', kind: 'breath', min: 30),
        ],
        wellbeing: const [WellbeingResult(at: '', score: 64)],
        bedGoal: '23:30',
        wakeGoal: '07:30',
        customWidgets: 1,
        now: DateTime(2030, 1, 2),
      );
      expect(awards.firstWhere((a) => a.id == 'practice30').done, true);
      expect(awards.firstWhere((a) => a.id == 'practice120').progress, 0.25);
      expect(awards.firstWhere((a) => a.id == 'custom').done, true);
    },
  );
  test('day plan and WHO5 text', () {
    final plan = dayPlan(
      nights: [night('2026-11-15')],
      moods: [mood(15)],
      waterMl: 1250,
      waterGoal: 2000,
      ritualDone: 3,
      now: DateTime(2026, 11, 15, 12),
    );
    expect(plan.map((p) => p.done), [true, true, false, true]);
    expect(plan[2].hint, '1250 из 2000 мл');
    expect(who5.length, 5);
    expect(who5Scale.length, 6);
    expect([70, 52, 29, 28].map(who5Label), [
      'Высокое благополучие',
      'Хорошее самочувствие',
      'Сниженный ресурс',
      'Низкий ресурс',
    ]);
  });
  test('valence palette endpoints, interpolation and bounds', () {
    expect(sampleValencePalette(-1).outer, [98, 46, 215]);
    expect(sampleValencePalette(0).mid, [52, 211, 153]);
    expect(sampleValencePalette(1).core, [255, 253, 235]);
    expect(sampleValencePalette(-4).outer, sampleValencePalette(-1).outer);
    expect(sampleValencePalette(4).mid, sampleValencePalette(1).mid);
    expect(sampleValencePalette(0.21).outer, [58, 158, 93]);
    expect([-0.72, -0.38, -0.12, 0.13, 0.14, 0.48, 0.78].map(getValenceLabel), [
      'Очень неприятно',
      'Неприятно',
      'Слегка неприятно',
      'Нейтрально',
      'Слегка приятно',
      'Приятно',
      'Очень приятно',
    ]);
  });
}
