import { emotionCounts, moodPct, summarize, weeklyGoalOptions, type GoalOption } from "@/lib/metrics"
import { dateKey, daysAgo } from "@/lib/time"
import type { MoodEntry, PracticeSession, SleepNight } from "@/store/store"

/** Rolling seven calendar days, not the last seven records. Missing days stay missing. */
export function buildWeeklyRecap(
  nights: SleepNight[],
  moods: MoodEntry[],
  sessions: PracticeSession[],
  bedGoal: string,
  wakeGoal: string,
  now = new Date()
) {
  const keys = Array.from({ length: 7 }, (_, i) => dateKey(daysAgo(6 - i, now)))
  const previousStart = dateKey(daysAgo(13, now))
  const previousEnd = dateKey(daysAgo(7, now))
  const inWeek = (at: string) => {
    const time = new Date(at)
    return Number.isFinite(time.getTime()) && time <= now && dateKey(time) >= keys[0]
  }
  const week = nights.filter((n) => n.dateKey >= keys[0] && n.dateKey <= keys[6]).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  const previous = nights.filter((n) => n.dateKey >= previousStart && n.dateKey <= previousEnd)
  const weekMoods = moods.filter((m) => inWeek(m.at)).sort((a, b) => a.at.localeCompare(b.at))
  const weekSessions = sessions.filter((s) => inWeek(s.at))
  const summary = summarize(week, weekMoods, bedGoal, wakeGoal)
  summary.goalNights = week.filter((n) => n.durationMin >= summary.target).length
  // The shared summary uses the last seven check-ins; a recap includes every check-in in its window.
  summary.moodAvg = weekMoods.length
    ? Math.round(weekMoods.reduce((s, m) => s + moodPct(m.valence), 0) / weekMoods.length)
    : null
  const previousSummary = summarize(previous, [], bedGoal, wakeGoal)
  const days = keys.map((key) => {
    const entries = weekMoods.filter((m) => dateKey(new Date(m.at)) === key)
    return {
      key,
      night: week.find((n) => n.dateKey === key),
      mood: entries.length ? Math.round(entries.reduce((s, m) => s + moodPct(m.valence), 0) / entries.length) : null,
      checkins: entries.length,
    }
  })
  const moodDays = days.filter((d) => d.mood !== null).length
  const activeDays = new Set([
    ...week.map((n) => n.dateKey),
    ...weekMoods.map((m) => dateKey(new Date(m.at))),
    ...weekSessions.map((s) => dateKey(new Date(s.at))),
  ]).size

  return {
    summary,
    days,
    moods: weekMoods,
    moodDays,
    emotions: emotionCounts(weekMoods).slice(0, 5),
    activeDays,
    practiceCount: weekSessions.length,
    practiceMinutes: Math.round(weekSessions.reduce((s, p) => s + p.min, 0)),
    // A comparison needs observations in both actual calendar windows.
    indexDelta: week.length && previous.length ? summary.index - previousSummary.index : null,
    previousNights: previous.length,
    goals: week.length
      ? weeklyGoalOptions(summary, moodDays)
      : [
          { id: "checkin", text: "Чек-ин состояния 7 из 7 дней", why: "замечать, что помогает именно вам" },
          { id: "screen", text: "Без экрана за 30 минут до сна", why: "оставить время на спокойный вечер" },
          { id: "ritual", text: "Вечерний ритуал каждый день", why: "начать с небольшой паузы для себя" },
        ],
  }
}

/** Keep a previously accepted goal visible even when recommendations change. */
export function recapGoalOptions(options: GoalOption[], saved: { id: string; text: string } | null): GoalOption[] {
  if (!saved || options.some((g) => g.id === saved.id)) return options
  return [{ ...saved, why: "ваша текущая цель" }, ...options.slice(0, 2)]
}
