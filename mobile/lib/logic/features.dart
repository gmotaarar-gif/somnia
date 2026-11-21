import 'dart:math' as math;

import '../data/models.dart';
import 'metrics.dart';
import 'time.dart';

const cycleMin = 90;
const fallAsleepMin = 14;

class CycleOption {
  final int cycles, sleepMin;
  final String time;
  final bool best;
  const CycleOption({
    required this.cycles,
    required this.time,
    required this.sleepMin,
    required this.best,
  });
}

List<CycleOption> wakeOptions(String bed) {
  final start = timeToMinutes(bed) + fallAsleepMin;
  return [
    for (final cycles in [4, 5, 6])
      CycleOption(
        cycles: cycles,
        time: minutesToTime(start + cycles * cycleMin),
        sleepMin: cycles * cycleMin,
        best: cycles == 5,
      ),
  ];
}

List<CycleOption> bedOptions(String wake) {
  final end = timeToMinutes(wake);
  return [
    for (final cycles in [6, 5, 4])
      CycleOption(
        cycles: cycles,
        time: minutesToTime(end - cycles * cycleMin - fallAsleepMin),
        sleepMin: cycles * cycleMin,
        best: cycles == 5,
      ),
  ];
}

typedef Stage = String;

class StageSegment {
  final Stage stage;
  final double min;
  const StageSegment({required this.stage, required this.min});
}

const stageMeta = {
  'awake': (label: 'Бодрствование', color: '#ffd17a', level: 0),
  'rem': (label: 'Быстрый сон', color: '#6ce3e6', level: 1),
  'light': (label: 'Лёгкий сон', color: '#84a3ff', level: 2),
  'deep': (label: 'Глубокий сон', color: '#b5a0ff', level: 3),
};

/// Estimated architecture, not sensor data. Segment lengths sum to in-bed time.
List<StageSegment> hypnogram(SleepNight n) {
  final total = math.max(60, spanMinutes(n.bedtime, n.wakeTime));
  final cycles = math.max(1, jsRound(total / cycleMin));
  final per = total / cycles;
  final q = n.quality / 100;
  final out = [
    StageSegment(
      stage: 'awake',
      min: jsRound(fallAsleepMin * (1.5 - q)).toDouble(),
    ),
  ];
  final wakeAt = {
    for (var i = 0; i < n.awakenings; i++)
      jsRound((i + 1) * cycles / (n.awakenings + 1)),
  };
  for (var c = 0; c < cycles; c++) {
    final late = c / math.max(1, cycles - 1);
    final deep = per * (0.34 - 0.26 * late) * (0.6 + 0.6 * q);
    final rem = per * (0.12 + 0.2 * late);
    final light = math.max(8.0, per - deep - rem);
    out.add(StageSegment(stage: 'light', min: light * 0.55));
    if (deep > 4) out.add(StageSegment(stage: 'deep', min: deep));
    out.add(StageSegment(stage: 'light', min: light * 0.45));
    out.add(StageSegment(stage: 'rem', min: rem));
    if (wakeAt.contains(c + 1) && c < cycles - 1) {
      out.add(const StageSegment(stage: 'awake', min: 8));
    }
  }
  final sum = out.fold<double>(0, (a, s) => a + s.min);
  return out
      .map((s) => StageSegment(stage: s.stage, min: s.min / sum * total))
      .toList();
}

Map<Stage, double> stageTotals(List<StageSegment> segments) {
  final totals = <Stage, double>{'awake': 0, 'rem': 0, 'light': 0, 'deep': 0};
  for (final s in segments) {
    totals[s.stage] = totals[s.stage]! + s.min;
  }
  return totals;
}

class Award {
  final String id, title, about, tone;
  final double progress;
  final bool done;
  const Award({
    required this.id,
    required this.title,
    required this.about,
    required this.tone,
    required this.progress,
    required this.done,
  });
}

List<Award> buildAwards({
  required List<SleepNight> nights,
  required List<MoodEntry> moods,
  required List<PracticeSession> sessions,
  required List<WellbeingResult> wellbeing,
  required String bedGoal,
  required String wakeGoal,
  required int customWidgets,
  DateTime? now,
}) {
  final streak = computeStreak(nights, now);
  final target = spanMinutes(bedGoal, wakeGoal);
  final goalNights = nights.where((n) => n.durationMin >= target * 0.93).length;
  final minutes = sessions.fold<double>(0, (s, x) => s + x.min);
  final calm = nights.where((n) => n.awakenings == 0).length;
  Award make(
    String id,
    String title,
    String about,
    num have,
    num need,
    String tone,
  ) => Award(
    id: id,
    title: title,
    about: about,
    tone: tone,
    progress: math.min(1, have / need).toDouble(),
    done: have >= need,
  );
  return [
    make(
      'week',
      'Первая неделя',
      '7 дней подряд с записью сна',
      streak,
      7,
      'lime',
    ),
    make(
      'fortnight',
      'Две недели',
      '14 дней подряд с записью сна',
      streak,
      14,
      'plum',
    ),
    make(
      'month',
      'Месяц ритма',
      '30 дней подряд с записью сна',
      streak,
      30,
      'cobalt',
    ),
    make(
      'goal10',
      'В цель',
      '10 ночей с выполненной целью сна',
      goalNights,
      10,
      'moss',
    ),
    make('calm5', 'Тихие ночи', '5 ночей без пробуждений', calm, 5, 'cobalt'),
    make(
      'mood10',
      'Наблюдатель',
      '10 чек-инов состояния',
      moods.length,
      10,
      'ember',
    ),
    make(
      'mood30',
      'Знаю себя',
      '30 чек-инов состояния',
      moods.length,
      30,
      'rose',
    ),
    make('practice30', 'Тихая пауза', '30 минут практик', minutes, 30, 'lime'),
    make('practice120', 'Мастер паузы', '2 часа практик', minutes, 120, 'plum'),
    make(
      'who5',
      'Честный взгляд',
      'Пройден тест благополучия',
      wellbeing.length,
      1,
      'moss',
    ),
    make(
      'custom',
      'Свой экран',
      'Создан собственный виджет',
      customWidgets,
      1,
      'ember',
    ),
  ];
}

class PlanItem {
  final String id, label, hint;
  final bool done;
  const PlanItem({
    required this.id,
    required this.label,
    required this.hint,
    required this.done,
  });
}

List<PlanItem> dayPlan({
  required List<SleepNight> nights,
  required List<MoodEntry> moods,
  required num waterMl,
  required num waterGoal,
  required int ritualDone,
  DateTime? now,
}) {
  final today = dateKey(now ?? DateTime.now());
  String display(num v) =>
      v == v.roundToDouble() ? v.toInt().toString() : v.toString();
  return [
    PlanItem(
      id: 'sleep',
      label: 'Записать сон',
      hint: 'минута утром',
      done: nights.any((n) => n.dateKey == today),
    ),
    PlanItem(
      id: 'mood',
      label: 'Чек-ин состояния',
      hint: '20 секунд',
      done: moods.any((m) => dateKey(DateTime.parse(m.at)) == today),
    ),
    PlanItem(
      id: 'water',
      label: 'Норма воды',
      hint: '${display(waterMl)} из ${display(waterGoal)} мл',
      done: waterMl >= waterGoal,
    ),
    PlanItem(
      id: 'ritual',
      label: 'Вечерний ритуал',
      hint: '$ritualDone из 3 шагов',
      done: ritualDone >= 3,
    ),
  ];
}

const who5 = [
  'Я чувствовал себя бодрым и в хорошем настроении',
  'Я чувствовал себя спокойным и расслабленным',
  'Я чувствовал себя активным и энергичным',
  'Я просыпался свежим и отдохнувшим',
  'Моя повседневная жизнь была наполнена интересными вещами',
];
const who5Scale = [
  'Никогда',
  'Иногда',
  'Меньше половины',
  'Больше половины',
  'Почти всегда',
  'Всё время',
];
String who5Label(num score) {
  if (score >= 70) return 'Высокое благополучие';
  if (score >= 52) return 'Хорошее самочувствие';
  if (score >= 29) return 'Сниженный ресурс';
  return 'Низкий ресурс';
}
