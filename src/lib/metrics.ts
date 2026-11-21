import type { MoodEntry, SleepNight } from "@/store/store"
import { dateKey, daysAgo, deviationMinutes, durationRu, pluralRu, spanMinutes, timeToMinutes } from "@/lib/time"

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

export const moodPct = (valence: number) => Math.round((valence + 1) * 50)

/** One night scored 0..100 from duration vs. goal, morning energy and bedtime accuracy. */
export function nightScore(n: SleepNight, bedGoal: string, wakeGoal: string): number {
  const target = spanMinutes(bedGoal, wakeGoal)
  const dur = clamp(n.durationMin / target)
  const acc = 1 - clamp(Math.abs(deviationMinutes(n.bedtime, bedGoal)) / 90)
  const calm = 1 - clamp(n.awakenings / 4)
  return Math.round((dur * 0.4 + (n.quality / 100) * 0.35 + acc * 0.15 + calm * 0.1) * 100)
}

export interface Summary {
  target: number
  last: SleepNight | undefined
  week: SleepNight[]
  avgDuration: number
  avgQuality: number
  /** Share of nights within ±30 min of the bedtime goal, 0..100 */
  accuracy: number
  bedSd: number
  debt: number
  calmNights: number
  goalNights: number
  index: number
  indexDelta: number
  streak: number
  moodNow: number | null
  moodAvg: number | null
  lastMood: MoodEntry | undefined
}

export function summarize(
  nights: SleepNight[],
  moods: MoodEntry[],
  bedGoal: string,
  wakeGoal: string,
  span = 7
): Summary {
  const target = spanMinutes(bedGoal, wakeGoal)
  const week = nights.slice(-span)
  const prev = nights.slice(-span * 2, -span)
  const last = nights[nights.length - 1]
  const devs = week.map((n) => deviationMinutes(n.bedtime, bedGoal))
  const scores = week.map((n) => nightScore(n, bedGoal, wakeGoal))
  const prevScores = prev.map((n) => nightScore(n, bedGoal, wakeGoal))
  const recentMoods = moods.slice(-span)
  const lastMood = moods[moods.length - 1]

  return {
    target,
    last,
    week,
    avgDuration: Math.round(mean(week.map((n) => n.durationMin))),
    avgQuality: Math.round(mean(week.map((n) => n.quality))),
    accuracy: week.length ? Math.round((devs.filter((d) => Math.abs(d) <= 30).length / week.length) * 100) : 0,
    bedSd: Math.round(stdDev(devs)),
    debt: Math.round(week.reduce((s, n) => s + Math.max(0, target - n.durationMin), 0)),
    calmNights: week.filter((n) => n.awakenings === 0).length,
    goalNights: week.filter((n) => n.durationMin >= target * 0.93).length,
    index: Math.round(mean(scores)),
    indexDelta: prevScores.length ? Math.round(mean(scores) - mean(prevScores)) : 0,
    streak: computeStreak(nights),
    moodNow: lastMood ? moodPct(lastMood.valence) : null,
    moodAvg: recentMoods.length ? Math.round(mean(recentMoods.map((m) => moodPct(m.valence)))) : null,
    lastMood,
  }
}

/** Consecutive logged mornings ending today or yesterday. */
export function computeStreak(nights: SleepNight[], now = new Date()): number {
  const keys = new Set(nights.map((n) => n.dateKey))
  let offset = keys.has(dateKey(now)) ? 0 : 1
  let streak = 0
  while (keys.has(dateKey(daysAgo(offset, now)))) {
    streak++
    offset++
  }
  return streak
}

export function indexLabel(score: number): string {
  if (score >= 85) return "Отличный ритм"
  if (score >= 72) return "Хороший баланс"
  if (score >= 58) return "Ровный режим"
  if (score >= 40) return "Нужен отдых"
  return "Режим сбит"
}

export function qualityLabel(q: number): string {
  if (q <= 36) return "Разбитое утро"
  if (q <= 54) return "Сонливо"
  if (q <= 70) return "Ровный сон"
  if (q <= 86) return "Хороший отдых"
  return "Полная бодрость"
}

export interface Countdown {
  minutes: number
  past: boolean
  /** 0..1 share of the waking day already spent */
  dayProgress: number
}

export function bedtimeCountdown(bedGoal: string, wakeGoal: string, now = new Date()): Countdown {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  let left = timeToMinutes(bedGoal) - nowMin
  if (left < -180) left += 1440
  const past = left <= 0
  const dayLen = Math.max(60, 1440 - spanMinutes(bedGoal, wakeGoal))
  const sinceWake = (((nowMin - timeToMinutes(wakeGoal)) % 1440) + 1440) % 1440
  return { minutes: Math.max(0, left), past, dayProgress: past ? 1 : clamp(sinceWake / dayLen) }
}

export type InsightTone = "lime" | "ember" | "dusk" | "rose" | "cobalt" | "moss"

export interface Insight {
  id: string
  tone: InsightTone
  metric: string
  title: string
  body: string
}

export interface FactorImpact {
  name: string
  count: number
  delta: number
}

export function factorImpacts(moods: MoodEntry[]): FactorImpact[] {
  const base = moods.length ? mean(moods.map((m) => moodPct(m.valence))) : 50
  const buckets = new Map<string, number[]>()
  for (const m of moods)
    for (const f of m.factors) buckets.set(f, [...(buckets.get(f) ?? []), moodPct(m.valence)])
  return [...buckets.entries()]
    .map(([name, vals]) => ({ name, count: vals.length, delta: Math.round(mean(vals) - base) }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

export function emotionCounts(moods: MoodEntry[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const m of moods) for (const e of m.emotions) counts.set(e, (counts.get(e) ?? 0) + 1)
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

/** Mood balance (0–100) on days after 7+ hours of sleep minus shorter nights, in points. */
export function sleepMoodLink(nights: SleepNight[], moods: MoodEntry[]): number {
  const good: number[] = []
  const bad: number[] = []
  for (const n of nights) {
    const day = moods.filter((m) => dateKey(new Date(m.at)) === n.dateKey)
    if (!day.length) continue
    ;(n.durationMin >= 420 ? good : bad).push(mean(day.map((m) => moodPct(m.valence))))
  }
  if (!good.length || !bad.length) return 0
  return Math.round(mean(good) - mean(bad))
}

export function buildInsights(
  nights: SleepNight[],
  moods: MoodEntry[],
  bedGoal: string,
  wakeGoal: string
): Insight[] {
  const s = summarize(nights, moods, bedGoal, wakeGoal)
  const link = sleepMoodLink(nights, moods)
  const impacts = factorImpacts(moods).filter((f) => f.count >= 2)
  const out: Insight[] = []

  if (link > 3)
    out.push({
      id: "link",
      tone: "lime",
      metric: `+${link}`,
      title: "Сон поднимает настроение",
      body: `После ночей от 7 часов баланс состояния выше в среднем на ${link} ${pluralRu(link, ["пункт", "пункта", "пунктов"])} из 100.`,
    })
  if (nights.length >= 2)
    out.push(
      s.bedSd > 30
        ? {
            id: "variance",
            tone: "ember",
            metric: `±${s.bedSd}`,
            title: "Отбой плавает",
            body: "Разброс в минутах. Постоянное время подъёма выравнивает ритм быстрее, чем ранний отбой.",
          }
        : {
            id: "steady",
            tone: "dusk",
            metric: `±${s.bedSd}`,
            title: "Стабильный отбой",
            body: `Разброс в минутах. Вы ложитесь близко к плану ${bedGoal}, это держит утреннюю бодрость.`,
          }
    )
  const neg = impacts.find((f) => f.delta <= -3)
  if (neg)
    out.push({
      id: "neg",
      tone: "rose",
      metric: `${neg.delta}`,
      title: `${neg.name} тянет вниз`,
      body: `С отметкой «${neg.name.toLowerCase()}» баланс ниже на ${Math.abs(neg.delta)} п. Попробуйте сократить на неделю.`,
    })
  const pos = impacts.find((f) => f.delta >= 3)
  if (pos)
    out.push({
      id: "pos",
      tone: "moss",
      metric: `+${pos.delta}`,
      title: `${pos.name} помогает`,
      body: `«${pos.name}» поднимает состояние на ${pos.delta} п. (${pos.count}×). Планируйте это заранее.`,
    })
  if (s.debt > 90)
    out.push({
      id: "debt",
      tone: "cobalt",
      metric: durationRu(s.debt).replace(" мин", "м").replace(" ч", "ч"),
      title: "Накопился недосып",
      body: "За 7 ночей. Возвращайте мягко: +20–30 минут к отбою вместо отсыпания в выходные.",
    })
  return out
}

export interface GoalOption {
  id: string
  text: string
  why: string
}

export function weeklyGoalOptions(s: Summary, checkins: number): GoalOption[] {
  const opts: GoalOption[] = []
  if (s.bedSd > 25) opts.push({ id: "regular", text: "Отбой в одно время ±20 мин", why: `сейчас разброс ±${s.bedSd} мин` })
  if (s.debt > 60) opts.push({ id: "more", text: "Ложиться на 20 минут раньше", why: `долг сна ${durationRu(s.debt)}` })
  opts.push({ id: "screen", text: "Без экрана за 30 минут до сна", why: "упрощает засыпание" })
  opts.push({ id: "breath", text: "Дыхание 4-7-8 каждый вечер", why: "снижает вечернее напряжение" })
  opts.push({ id: "checkin", text: "Чек-ин состояния 7 из 7 дней", why: `сейчас ${checkins} из 7` })
  return opts.slice(0, 3)
}

export const SLEEP_TIPS = [
  { id: "wake", tag: "Циркадный якорь", title: "Одно время подъёма", body: "Вставайте в одно и то же время каждый день, даже после короткой ночи. Это главный якорь биологических часов." },
  { id: "20min", tag: "Правило КПТ-Б", title: "Правило 20 минут", body: "Не уснули за 20 минут? Встаньте, займитесь тихим делом при тусклом свете и вернитесь, когда потянет в сон." },
  { id: "bed", tag: "Контроль стимулов", title: "Кровать только для сна", body: "Не работайте и не листайте ленту в постели. Мозг должен связывать её со сном." },
  { id: "light", tag: "Свет", title: "Дневной свет утром", body: "10–15 минут естественного света в первый час после пробуждения сдвигают мелатонин на спокойный вечер." },
  { id: "coffee", tag: "Кофеин", title: "Кофе до 14:00", body: "Период полувыведения кофеина 5–6 часов. Поздний кофе снижает утреннюю бодрость, даже если уснуть легко." },
  { id: "cool", tag: "Среда", title: "Прохладная спальня", body: "17–20 °C, плотные шторы и тишина. Тёплый душ за час до сна помогает телу остыть." },
]
