import '../data/models.dart';
import 'metrics.dart';
import 'time.dart';

class RecapDay {
  final String key;
  final SleepNight? night;
  final int? mood;
  final int checkins;
  const RecapDay({
    required this.key,
    this.night,
    this.mood,
    required this.checkins,
  });
}

class WeeklyRecap {
  final Summary summary;
  final List<RecapDay> days;
  final List<MoodEntry> moods;
  final int moodDays,
      activeDays,
      practiceCount,
      practiceMinutes,
      previousNights;
  final List<EmotionCount> emotions;
  final int? indexDelta;
  final List<GoalOption> goals;
  const WeeklyRecap({
    required this.summary,
    required this.days,
    required this.moods,
    required this.moodDays,
    required this.activeDays,
    required this.practiceCount,
    required this.practiceMinutes,
    required this.previousNights,
    required this.emotions,
    required this.indexDelta,
    required this.goals,
  });
}

WeeklyRecap buildWeeklyRecap(
  List<SleepNight> nights,
  List<MoodEntry> moods,
  List<PracticeSession> sessions,
  String bedGoal,
  String wakeGoal, [
  DateTime? at,
]) {
  final now = at ?? DateTime.now();
  final keys = List.generate(7, (i) => dateKey(daysAgo(6 - i, now)));
  final previousStart = dateKey(daysAgo(13, now)),
      previousEnd = dateKey(daysAgo(7, now));
  bool inRange(String key, String start, String end) =>
      key.compareTo(start) >= 0 && key.compareTo(end) <= 0;
  bool inWeek(String at) {
    final time = DateTime.tryParse(at);
    return time != null &&
        !time.isAfter(now) &&
        dateKey(time).compareTo(keys[0]) >= 0;
  }

  final week =
      nights.where((n) => inRange(n.dateKey, keys.first, keys.last)).toList()
        ..sort((a, b) => a.dateKey.compareTo(b.dateKey));
  final previous = nights
      .where((n) => inRange(n.dateKey, previousStart, previousEnd))
      .toList();
  final weekMoods = moods.where((m) => inWeek(m.at)).toList()
    ..sort((a, b) => a.at.compareTo(b.at));
  final weekSessions = sessions.where((s) => inWeek(s.at)).toList();
  final base = summarize(week, weekMoods, bedGoal, wakeGoal, now: now);
  final summary = base.withRecap(
    goalNights: week.where((n) => n.durationMin >= base.target).length,
    moodAvg: weekMoods.isEmpty
        ? null
        : jsRound(mean(weekMoods.map((m) => moodPct(m.valence)))),
  );
  final previousSummary = summarize(previous, [], bedGoal, wakeGoal, now: now);
  final days = keys.map((key) {
    final entries = weekMoods.where(
      (m) => dateKey(DateTime.parse(m.at)) == key,
    );
    return RecapDay(
      key: key,
      night: week.where((n) => n.dateKey == key).firstOrNull,
      mood: entries.isEmpty
          ? null
          : jsRound(mean(entries.map((m) => moodPct(m.valence)))),
      checkins: entries.length,
    );
  }).toList();
  final moodDays = days.where((d) => d.mood != null).length;
  final activeDays = {
    ...week.map((n) => n.dateKey),
    ...weekMoods.map((m) => dateKey(DateTime.parse(m.at))),
    ...weekSessions.map((s) => dateKey(DateTime.parse(s.at))),
  }.length;
  return WeeklyRecap(
    summary: summary,
    days: days,
    moods: weekMoods,
    moodDays: moodDays,
    emotions: emotionCounts(weekMoods).take(5).toList(),
    activeDays: activeDays,
    practiceCount: weekSessions.length,
    practiceMinutes: jsRound(weekSessions.fold<double>(0, (s, p) => s + p.min)),
    indexDelta: week.isNotEmpty && previous.isNotEmpty
        ? summary.index - previousSummary.index
        : null,
    previousNights: previous.length,
    goals: week.isNotEmpty
        ? weeklyGoalOptions(summary, moodDays)
        : const [
            GoalOption(
              id: 'checkin',
              text: 'Чек-ин состояния 7 из 7 дней',
              why: 'замечать, что помогает именно вам',
            ),
            GoalOption(
              id: 'screen',
              text: 'Без экрана за 30 минут до сна',
              why: 'оставить время на спокойный вечер',
            ),
            GoalOption(
              id: 'ritual',
              text: 'Вечерний ритуал каждый день',
              why: 'начать с небольшой паузы для себя',
            ),
          ],
  );
}

List<GoalOption> recapGoalOptions(List<GoalOption> options, WeeklyGoal? saved) {
  if (saved == null || options.any((g) => g.id == saved.id)) return options;
  return [
    GoalOption(id: saved.id, text: saved.text, why: 'ваша текущая цель'),
    ...options.take(2),
  ];
}
