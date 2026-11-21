import type { DailySignal, MoodEntry, SleepNight } from "@/store/store"
import { dateKey, daysAgo } from "@/lib/time"

export interface InsightDay {
  key: string
  mood: number | null
  count: number
  sleep: number | null
  energy: number | null
  stress: number | null
}

/** Local calendar days, including gaps. Multiple check-ins carry equal weight within a day. */
export function insightDays(moods: MoodEntry[], nights: SleepNight[], signals: DailySignal[], span: number, now = new Date()): InsightDay[] {
  const buckets = new Map<string, number[]>()
  for (const m of moods) {
    const at = new Date(m.at)
    if (!Number.isFinite(at.getTime()) || at > now || !Number.isFinite(m.valence)) continue
    const key = dateKey(at)
    const values = buckets.get(key) ?? []
    values.push(Math.max(0, Math.min(100, (m.valence + 1) * 50)))
    buckets.set(key, values)
  }
  const sleepByDay = new Map(nights.map((n) => [n.dateKey, n.durationMin]))
  const signalsByDay = new Map(signals.map((s) => [s.dateKey, s]))
  const validScore = (v: number | undefined) => v != null && Number.isFinite(v) && v >= 0 && v <= 10 ? v : null
  return Array.from({ length: span }, (_, i) => {
    const key = dateKey(daysAgo(span - 1 - i, now))
    const values = buckets.get(key) ?? []
    const sleep = sleepByDay.get(key)
    const signal = signalsByDay.get(key)
    return {
      key,
      mood: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
      count: values.length,
      sleep: sleep != null && Number.isFinite(sleep) && sleep > 0 ? sleep : null,
      energy: validScore(signal?.energy),
      stress: validScore(signal?.stress),
    }
  })
}

/** Missing dates break the line rather than inventing observations. */
export function observationPath(values: (number | null)[], width = 288, height = 120): string {
  let connected = false
  return values.map((value, i) => {
    if (value == null) { connected = false; return "" }
    const x = values.length > 1 ? i / (values.length - 1) * width : width / 2
    const y = height - Math.max(0, Math.min(100, value)) / 100 * height
    const part = `${connected ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`
    connected = true
    return part
  }).join(" ")
}

export function saveDailySignal(signals: DailySignal[], signal: DailySignal): DailySignal[] {
  return [...signals.filter((s) => s.dateKey !== signal.dateKey), signal]
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey)).slice(-90)
}
