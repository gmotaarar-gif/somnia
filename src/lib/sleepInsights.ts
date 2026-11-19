import type { MoodEntry, SleepNight } from "@/store/useSomnaStore"

function toMins(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number)
  return ((h % 24) * 60 + (m % 60) + 1440) % 1440
}

function targetDur(bedGoal: string, wakeGoal: string): number {
  let diff = toMins(wakeGoal) - toMins(bedGoal)
  if (diff <= 0) diff += 1440
  return diff
}

function bedDev(bedtime: string, goal: string): number {
  let d = toMins(bedtime) - toMins(goal)
  if (d > 720) d -= 1440
  if (d < -720) d += 1440
  return d
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length)
}

/** Dynamic Russian greeting by local hour. */
export function getTimeGreeting(d = new Date()): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return "Доброе утро"
  if (h >= 12 && h < 17) return "Добрый день"
  if (h >= 17 && h < 23) return "Добрый вечер"
  return "Доброй ночи"
}

/** Russian plural helper: pluralRu(5, ["день", "дня", "дней"]) -> "дней". */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b > 1 && b < 5) return forms[1]
  if (b === 1) return forms[0]
  return forms[2]
}

/** Formats duration in minutes as "7 ч 32 мин" or "45 мин". */
export function formatDurRu(min: number): string {
  const t = Math.max(0, Math.round(min))
  const h = Math.floor(t / 60)
  const m = t % 60
  if (!h) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}

/** Formats duration as "H:MM" for compact dot-matrix countdown displays. */
export function formatHmClock(min: number): string {
  const t = Math.max(0, Math.round(min))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`
}

export interface BedtimeCountdown {
  minutesToBed: number
  isPastBedtime: boolean
  /** 0..1 fraction through waking day between wakeGoal and bedtimeGoal */
  awakeProgress: number
  formattedLeft: string
}

/** Live schedule countdown to bedtimeGoal + daytime progress ratio. */
export function computeBedtimeCountdown(
  bedtimeGoal: string,
  wakeGoal: string,
  now = new Date()
): BedtimeCountdown {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const bedMin = toMins(bedtimeGoal)
  const wakeMin = toMins(wakeGoal)
  let left = bedMin - nowMin
  if (left < -180) left += 1440
  const isPastBedtime = left <= 0

  const sleepLen = targetDur(bedtimeGoal, wakeGoal)
  const dayLen = Math.max(60, 1440 - sleepLen)
  const sinceWake = (((nowMin - wakeMin) % 1440) + 1440) % 1440
  const awakeProgress = isPastBedtime
    ? 1
    : Math.max(0, Math.min(1, sinceWake / dayLen))

  return {
    minutesToBed: Math.max(0, left),
    isPastBedtime,
    awakeProgress,
    formattedLeft: isPastBedtime ? "0:00" : formatHmClock(left),
  }
}

export type InsightTone = "emerald" | "ember" | "violet" | "rose" | "lime" | "cobalt"

export interface SleepInsightItem {
  id: string
  tone: InsightTone
  title: string
  body: string
}

export interface SleepAnalyticsReport {
  bedSdMin: number
  sleepDebtMin: number
  linkPct: number
  recentMoodCheckins: number
  insights: SleepInsightItem[]
}

/** Honest, strictly self-tracked correlation and sleep-debt analysis. */
export function computeSleepInsights({
  sleepHistory,
  moodHistory,
  bedtimeGoal,
  wakeGoal,
}: {
  sleepHistory: SleepNight[]
  moodHistory: MoodEntry[]
  bedtimeGoal: string
  wakeGoal: string
}): SleepAnalyticsReport {
  const target = targetDur(bedtimeGoal, wakeGoal)
  const last7 = sleepHistory.slice(-7)
  const sleepDebtMin = Math.round(
    last7.reduce((sum, n) => sum + Math.max(0, target - n.durationMin), 0)
  )
  const bedSdMin = Math.round(
    stdDev(sleepHistory.map((n) => bedDev(n.bedtime, bedtimeGoal)))
  )

  // Honest day-matched Sleep >= 7h vs < 7h mood link (zero synthetic shifting)
  const goodScores: number[] = []
  const badScores: number[] = []
  for (const n of sleepHistory) {
    const dayMoods = moodHistory.filter((m) => {
      if (n.dateKey && m.dateKey) return m.dateKey === n.dateKey
      return m.timestamp.toLowerCase().includes(n.dayShort.toLowerCase())
    })
    if (!dayMoods.length) continue
    const dayPct =
      dayMoods.reduce((acc, m) => acc + (m.valence + 1) * 50, 0) / dayMoods.length
    if (n.durationMin >= 420) goodScores.push(dayPct)
    else badScores.push(dayPct)
  }

  let linkPct = 0
  if (goodScores.length > 0 && badScores.length > 0) {
    const goodAvg = goodScores.reduce((a, b) => a + b, 0) / goodScores.length
    const badAvg = badScores.reduce((a, b) => a + b, 0) / badScores.length
    if (badAvg > 0) linkPct = Math.round(((goodAvg - badAvg) / badAvg) * 100)
  }

  // Honest factor deltas vs baseline mood balance
  const baseMood = moodHistory.length
    ? moodHistory.reduce((acc, m) => acc + (m.valence + 1) * 50, 0) / moodHistory.length
    : 50
  const factorBuckets = new Map<string, number[]>()
  for (const m of moodHistory) {
    const pct = (m.valence + 1) * 50
    for (const f of m.factors) {
      const label = f.trim()
      if (!label) continue
      const arr = factorBuckets.get(label) ?? []
      arr.push(pct)
      factorBuckets.set(label, arr)
    }
  }
  const factorDeltas = [...factorBuckets.entries()]
    .filter(([, vals]) => vals.length >= 2)
    .map(([name, vals]) => ({
      name,
      count: vals.length,
      delta: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length - baseMood),
    }))
    .filter((f) => f.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const insights: SleepInsightItem[] = []

  if (linkPct > 3) {
    insights.push({
      id: "sleep-mood-link",
      tone: "emerald",
      title: `+${linkPct}% к настроению`,
      body: `В дни после 7+ часов сна ваш баланс настроения выше в среднем на ${linkPct}%. Сон остаётся самым сильным рычагом.`,
    })
  }

  if (sleepHistory.length >= 2) {
    if (bedSdMin > 30) {
      insights.push({
        id: "bedtime-variance",
        tone: "ember",
        title: `Разброс отбоя ±${bedSdMin} мин`,
        body: "Постоянное время подъёма даже в выходные стабилизирует циркадный ритм быстрее, чем ранняя попытка уснуть.",
      })
    } else {
      insights.push({
        id: "bedtime-steady",
        tone: "violet",
        title: `Стабильный режим ±${bedSdMin} мин`,
        body: `Вы укладываетесь ровно к плану ${bedtimeGoal}. Такой ритм удерживает утреннюю бодрость.`,
      })
    }
  }

  const topNeg = factorDeltas.find((f) => f.delta <= -3)
  if (topNeg) {
    insights.push({
      id: "factor-neg",
      tone: "rose",
      title: `${topNeg.name}: ${topNeg.delta} п.`,
      body: `Когда в чек-инах отмечено «${topNeg.name.toLowerCase()}», баланс настроения ниже на ${Math.abs(topNeg.delta)} п. Попробуйте сократить это на неделю.`,
    })
  }

  const topPos = factorDeltas.find((f) => f.delta >= 3)
  if (topPos) {
    insights.push({
      id: "factor-pos",
      tone: "lime",
      title: `${topPos.name}: +${topPos.delta} п.`,
      body: `«${topPos.name}» заметно поднимает ваше состояние (${topPos.count}×). Запланируйте это заранее в течение дня.`,
    })
  }

  if (sleepDebtMin > 90) {
    insights.push({
      id: "sleep-debt",
      tone: "cobalt",
      title: `Недосып ${formatDurRu(sleepDebtMin)} за 7 ночей`,
      body: "Возвращайте ресурс мягко: добавляйте +20–30 минут к обычному отбою вместо длинного отсыпания в выходные.",
    })
  }

  return {
    bedSdMin,
    sleepDebtMin,
    linkPct,
    recentMoodCheckins: Math.min(7, moodHistory.length),
    insights,
  }
}

export interface WeeklyGoalOption {
  id: string
  text: string
  why: string
}

export function computeWeeklyGoalOptions({
  bedSdMin,
  sleepDebtMin,
  recentMoodCheckins,
}: {
  bedSdMin: number
  sleepDebtMin: number
  recentMoodCheckins: number
}): WeeklyGoalOption[] {
  const opts: WeeklyGoalOption[] = []
  if (bedSdMin > 25) {
    opts.push({
      id: "regular",
      text: "Отбой в одно время ±20 мин",
      why: `сейчас разброс ±${bedSdMin} мин`,
    })
  }
  if (sleepDebtMin > 60) {
    opts.push({
      id: "more",
      text: "Ложиться на 20 минут раньше",
      why: `долг сна ${formatDurRu(sleepDebtMin)}`,
    })
  }
  opts.push({
    id: "screen",
    text: "Без экрана за 30 минут до сна",
    why: "упрощает вечернее засыпание",
  })
  opts.push({
    id: "breath",
    text: "Дыхание 4-7-8 каждый вечер",
    why: "снижает вечернее напряжение",
  })
  opts.push({
    id: "checkin",
    text: "Чек-ин состояния 7 из 7 дней",
    why: `сейчас ${recentMoodCheckins} из 7`,
  })
  return opts.slice(0, 3)
}

export interface SleepTip {
  id: string
  tag: string
  title: string
  body: string
}

export const CBTI_TIPS: SleepTip[] = [
  {
    id: "wake",
    tag: "Циркадный якорь",
    title: "Одно время подъёма",
    body: "Вставайте в одно и то же время каждый день — даже после короткой ночи. Это главный якорь биологических часов.",
  },
  {
    id: "20min",
    tag: "CBT-I правило",
    title: "Правило 20 минут",
    body: "Не уснули за ~20 минут? Встаньте, займитесь тихим делом при тусклом свете и вернитесь в постель при сонливости.",
  },
  {
    id: "bed",
    tag: "Контроль стимулов",
    title: "Кровать — только для сна",
    body: "Не работайте и не листайте ленту в постели. Мозг должен автоматически связывать её со сном и расслаблением.",
  },
  {
    id: "light",
    tag: "Световой режим",
    title: "Дневной свет утром",
    body: "10–15 минут естественного света в первый час после пробуждения сдвигают выброс мелатонина на спокойный вечер.",
  },
  {
    id: "coffee",
    tag: "Метаболизм",
    title: "Кофеин до 14:00",
    body: "Период полувыведения кофеина — 5–6 часов. Поздний кофе уменьшает ощущение утренней бодрости, даже если уснуть легко.",
  },
  {
    id: "cool",
    tag: "Среда сна",
    title: "Прохладная спальня",
    body: "Оптимальная температура 17–20 °C, плотные шторы и тишина. Тёплый душ за час до сна помогает телу естественно остыть.",
  },
]

export function selectDailySleepTip(
  night: SleepNight | undefined,
  bedtimeGoal: string,
  targetDurMin: number,
  now = new Date()
): SleepTip {
  if (!night) return CBTI_TIPS[0]
  if (night.awakenings >= 2) return CBTI_TIPS[1]
  if (Math.abs(bedDev(night.bedtime, bedtimeGoal)) > 40) return CBTI_TIPS[0]
  if (night.durationMin < targetDurMin * 0.85) return CBTI_TIPS[2]
  return CBTI_TIPS[now.getDate() % CBTI_TIPS.length]
}
