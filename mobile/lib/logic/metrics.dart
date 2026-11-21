import 'dart:math' as math;

import '../data/models.dart';
import 'time.dart';

double clamp(num v, [num lo = 0, num hi = 1]) => v.clamp(lo, hi).toDouble();
double mean(Iterable<num> xs) =>
    xs.isEmpty ? 0 : xs.fold<double>(0, (a, b) => a + b) / xs.length;
double _stdDev(List<num> xs) {
  if (xs.length < 2) return 0;
  final m = mean(xs);
  return math.sqrt(mean(xs.map((x) => math.pow(x - m, 2))));
}

List<T> tail<T>(List<T> xs, int count) =>
    xs.skip(math.max(0, xs.length - count)).toList();
int moodPct(num valence) => jsRound((valence + 1) * 50);

int nightScore(SleepNight n, String bedGoal, String wakeGoal) {
  final target = spanMinutes(bedGoal, wakeGoal);
  final dur = clamp(n.durationMin / target);
  final acc = 1 - clamp(deviationMinutes(n.bedtime, bedGoal).abs() / 90);
  final calm = 1 - clamp(n.awakenings / 4);
  return jsRound(
    (dur * 0.4 + (n.quality / 100) * 0.35 + acc * 0.15 + calm * 0.1) * 100,
  );
}

class Summary {
  final int target,
      avgDuration,
      avgQuality,
      accuracy,
      bedSd,
      debt,
      calmNights,
      goalNights,
      index,
      indexDelta,
      streak;
  final SleepNight? last;
  final List<SleepNight> week;
  final int? moodNow, moodAvg;
  final MoodEntry? lastMood;
  const Summary({
    required this.target,
    this.last,
    required this.week,
    required this.avgDuration,
    required this.avgQuality,
    required this.accuracy,
    required this.bedSd,
    required this.debt,
    required this.calmNights,
    required this.goalNights,
    required this.index,
    required this.indexDelta,
    required this.streak,
    this.moodNow,
    this.moodAvg,
    this.lastMood,
  });
  Summary withRecap({required int goalNights, required int? moodAvg}) =>
      Summary(
        target: target,
        last: last,
        week: week,
        avgDuration: avgDuration,
        avgQuality: avgQuality,
        accuracy: accuracy,
        bedSd: bedSd,
        debt: debt,
        calmNights: calmNights,
        goalNights: goalNights,
        index: index,
        indexDelta: indexDelta,
        streak: streak,
        moodNow: moodNow,
        moodAvg: moodAvg,
        lastMood: lastMood,
      );
}

Summary summarize(
  List<SleepNight> nights,
  List<MoodEntry> moods,
  String bedGoal,
  String wakeGoal, {
  int span = 7,
  DateTime? now,
}) {
  final target = spanMinutes(bedGoal, wakeGoal);
  final week = tail(nights, span);
  final prev = nights
      .skip(math.max(0, nights.length - span * 2))
      .take(math.max(0, math.min(span, nights.length - span)))
      .toList();
  final devs = week.map((n) => deviationMinutes(n.bedtime, bedGoal)).toList();
  final scores = week.map((n) => nightScore(n, bedGoal, wakeGoal));
  final prevScores = prev.map((n) => nightScore(n, bedGoal, wakeGoal));
  final recentMoods = tail(moods, span);
  final lastMood = moods.lastOrNull;
  return Summary(
    target: target,
    last: nights.lastOrNull,
    week: week,
    avgDuration: jsRound(mean(week.map((n) => n.durationMin))),
    avgQuality: jsRound(mean(week.map((n) => n.quality))),
    accuracy: week.isEmpty
        ? 0
        : jsRound(devs.where((d) => d.abs() <= 30).length / week.length * 100),
    bedSd: jsRound(_stdDev(devs)),
    debt: jsRound(
      week.fold<double>(0, (s, n) => s + math.max(0, target - n.durationMin)),
    ),
    calmNights: week.where((n) => n.awakenings == 0).length,
    goalNights: week.where((n) => n.durationMin >= target * 0.93).length,
    index: jsRound(mean(scores)),
    indexDelta: prevScores.isEmpty
        ? 0
        : jsRound(mean(scores) - mean(prevScores)),
    streak: computeStreak(nights, now),
    moodNow: lastMood == null ? null : moodPct(lastMood.valence),
    moodAvg: recentMoods.isEmpty
        ? null
        : jsRound(mean(recentMoods.map((m) => moodPct(m.valence)))),
    lastMood: lastMood,
  );
}

int computeStreak(List<SleepNight> nights, [DateTime? at]) {
  final now = at ?? DateTime.now();
  final keys = nights.map((n) => n.dateKey).toSet();
  var offset = keys.contains(dateKey(now)) ? 0 : 1;
  var streak = 0;
  while (keys.contains(dateKey(daysAgo(offset, now)))) {
    streak++;
    offset++;
  }
  return streak;
}

String indexLabel(num score) {
  if (score >= 85) return 'Отличный ритм';
  if (score >= 72) return 'Хороший баланс';
  if (score >= 58) return 'Ровный режим';
  if (score >= 40) return 'Нужен отдых';
  return 'Режим сбит';
}

String qualityLabel(num q) {
  if (q <= 36) return 'Разбитое утро';
  if (q <= 54) return 'Сонливо';
  if (q <= 70) return 'Ровный сон';
  if (q <= 86) return 'Хороший отдых';
  return 'Полная бодрость';
}

class Countdown {
  final int minutes;
  final bool past;
  final double dayProgress;
  const Countdown({
    required this.minutes,
    required this.past,
    required this.dayProgress,
  });
}

Countdown bedtimeCountdown(String bedGoal, String wakeGoal, [DateTime? at]) {
  final now = (at ?? DateTime.now()).toLocal();
  final nowMin = now.hour * 60 + now.minute;
  var left = timeToMinutes(bedGoal) - nowMin;
  if (left < -180) left += 1440;
  final past = left <= 0;
  final dayLen = math.max(60, 1440 - spanMinutes(bedGoal, wakeGoal));
  final sinceWake = (nowMin - timeToMinutes(wakeGoal)) % 1440;
  return Countdown(
    minutes: math.max(0, left),
    past: past,
    dayProgress: past ? 1 : clamp(sinceWake / dayLen),
  );
}

class Insight {
  final String id, tone, metric, title, body;
  const Insight({
    required this.id,
    required this.tone,
    required this.metric,
    required this.title,
    required this.body,
  });
}

class FactorImpact {
  final String name;
  final int count, delta;
  const FactorImpact({
    required this.name,
    required this.count,
    required this.delta,
  });
}

class EmotionCount {
  final String name;
  final int count;
  const EmotionCount({required this.name, required this.count});
}

// Dart List.sort is not stable; JS Array.sort preserves insertion order for ties.
List<T> stableRank<T>(List<T> values, int Function(T) rank) {
  final indexed = values.indexed.toList();
  indexed.sort((a, b) {
    final cmp = rank(b.$2).compareTo(rank(a.$2));
    return cmp == 0 ? a.$1.compareTo(b.$1) : cmp;
  });
  return indexed.map((e) => e.$2).toList();
}

List<FactorImpact> factorImpacts(List<MoodEntry> moods) {
  final base = moods.isEmpty ? 50 : mean(moods.map((m) => moodPct(m.valence)));
  final buckets = <String, List<int>>{};
  for (final m in moods) {
    for (final f in m.factors) {
      (buckets[f] ??= []).add(moodPct(m.valence));
    }
  }
  return stableRank([
    for (final e in buckets.entries)
      FactorImpact(
        name: e.key,
        count: e.value.length,
        delta: jsRound(mean(e.value) - base),
      ),
  ], (f) => f.delta.abs());
}

List<EmotionCount> emotionCounts(List<MoodEntry> moods) {
  final counts = <String, int>{};
  for (final m in moods) {
    for (final e in m.emotions) {
      counts[e] = (counts[e] ?? 0) + 1;
    }
  }
  return stableRank([
    for (final e in counts.entries) EmotionCount(name: e.key, count: e.value),
  ], (e) => e.count);
}

int sleepMoodLink(List<SleepNight> nights, List<MoodEntry> moods) {
  final good = <double>[], bad = <double>[];
  for (final n in nights) {
    final day = moods.where((m) => dateKey(DateTime.parse(m.at)) == n.dateKey);
    if (day.isEmpty) continue;
    (n.durationMin >= 420 ? good : bad).add(
      mean(day.map((m) => moodPct(m.valence))),
    );
  }
  if (good.isEmpty || bad.isEmpty) return 0;
  return jsRound(mean(good) - mean(bad));
}

List<Insight> buildInsights(
  List<SleepNight> nights,
  List<MoodEntry> moods,
  String bedGoal,
  String wakeGoal, {
  DateTime? now,
}) {
  final s = summarize(nights, moods, bedGoal, wakeGoal, now: now);
  final link = sleepMoodLink(nights, moods);
  final impacts = factorImpacts(moods).where((f) => f.count >= 2);
  final out = <Insight>[];
  if (link > 3) {
    out.add(
      Insight(
        id: 'link',
        tone: 'lime',
        metric: '+$link',
        title: 'Сон поднимает настроение',
        body:
            'После ночей от 7 часов баланс состояния выше в среднем на $link ${pluralRu(link, ['пункт', 'пункта', 'пунктов'])} из 100.',
      ),
    );
  }
  if (nights.length >= 2) {
    out.add(
      s.bedSd > 30
          ? Insight(
              id: 'variance',
              tone: 'ember',
              metric: '±${s.bedSd}',
              title: 'Отбой плавает',
              body: 'Разброс в минутах. Постоянное время подъёма выравнивает ритм быстрее, чем ранний отбой.',
            )
          : Insight(
              id: 'steady',
              tone: 'dusk',
              metric: '±${s.bedSd}',
              title: 'Стабильный отбой',
              body:
                  'Разброс в минутах. Вы ложитесь близко к плану $bedGoal, это держит утреннюю бодрость.',
            ),
    );
  }
  final neg = impacts.where((f) => f.delta <= -3).firstOrNull;
  if (neg != null) {
    out.add(
      Insight(
        id: 'neg',
        tone: 'rose',
        metric: '${neg.delta}',
        title: '${neg.name} тянет вниз',
        body:
            'С отметкой «${neg.name.toLowerCase()}» баланс ниже на ${neg.delta.abs()} п. Попробуйте сократить на неделю.',
      ),
    );
  }
  final pos = impacts.where((f) => f.delta >= 3).firstOrNull;
  if (pos != null) {
    out.add(
      Insight(
        id: 'pos',
        tone: 'moss',
        metric: '+${pos.delta}',
        title: '${pos.name} помогает',
        body:
            '«${pos.name}» поднимает состояние на ${pos.delta} п. (${pos.count}×). Планируйте это заранее.',
      ),
    );
  }
  if (s.debt > 90) {
    out.add(
      Insight(
        id: 'debt',
        tone: 'cobalt',
        metric: durationRu(s.debt)
            .replaceFirst(' мин', 'м')
            .replaceFirst(' ч', 'ч'),
        title: 'Накопился недосып',
        body: 'За 7 ночей. Возвращайте мягко: +20–30 минут к отбою вместо отсыпания в выходные.',
      ),
    );
  }
  return out;
}

class GoalOption extends WeeklyGoal {
  final String why;
  const GoalOption({required super.id, required super.text, required this.why});
  factory GoalOption.fromJson(JsonMap j) =>
      GoalOption(id: j['id'], text: j['text'], why: j['why']);
  @override
  JsonMap toJson() => {...super.toJson(), 'why': why};
}

List<GoalOption> weeklyGoalOptions(Summary s, int checkins) => [
  if (s.bedSd > 25)
    GoalOption(
      id: 'regular',
      text: 'Отбой в одно время ±20 мин',
      why: 'сейчас разброс ±${s.bedSd} мин',
    ),
  if (s.debt > 60)
    GoalOption(
      id: 'more',
      text: 'Ложиться на 20 минут раньше',
      why: 'долг сна ${durationRu(s.debt)}',
    ),
  const GoalOption(
    id: 'screen',
    text: 'Без экрана за 30 минут до сна',
    why: 'упрощает засыпание',
  ),
  const GoalOption(
    id: 'ritual',
    text: 'Вечерний ритуал каждый день',
    why: 'помогает телу настроиться на сон',
  ),
  GoalOption(
    id: 'checkin',
    text: 'Чек-ин состояния 7 из 7 дней',
    why: 'сейчас $checkins из 7',
  ),
].take(3).toList();
