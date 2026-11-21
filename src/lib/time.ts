export function timeToMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number)
  return (((h % 24) * 60 + (m % 60)) % 1440 + 1440) % 1440
}

export function minutesToTime(min: number): string {
  const t = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`
}

export function shiftTime(hhmm: string, deltaMin: number): string {
  return minutesToTime(timeToMinutes(hhmm) + deltaMin)
}

/** Length of the night between bedtime and wake, wrapping past midnight. */
export function spanMinutes(bed: string, wake: string): number {
  let d = timeToMinutes(wake) - timeToMinutes(bed)
  if (d <= 0) d += 1440
  return d
}

/** Signed minutes from goal on a 24h clock: positive is later than the goal. */
export function deviationMinutes(time: string, goal: string): number {
  let d = timeToMinutes(time) - timeToMinutes(goal)
  if (d > 720) d -= 1440
  if (d < -720) d += 1440
  return d
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function daysAgo(n: number, from = new Date()): Date {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12)
}

const WEEKDAY = new Intl.DateTimeFormat("ru-RU", { weekday: "short" })
const DAY_MONTH = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
const DAY_MONTH_SHORT = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" })

export function weekdayShort(d: Date): string {
  const s = WEEKDAY.format(d).replace(".", "")
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function dayMonth(d: Date): string {
  return DAY_MONTH.format(d)
}

export function dayMonthShort(d: Date): string {
  return DAY_MONTH_SHORT.format(d).replace(".", "")
}

/** "Сегодня" / "Вчера" / "Ср, 18 ноя" */
export function relativeDay(key: string, now = new Date()): string {
  const today = dateKey(now)
  if (key === today) return "Сегодня"
  if (key === dateKey(daysAgo(1, now))) return "Вчера"
  const d = parseKey(key)
  return `${weekdayShort(d)}, ${dayMonthShort(d)}`
}

export function clockOf(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/** "7:42" */
export function hm(min: number): string {
  const t = Math.max(0, Math.round(min))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`
}

/** "7 ч 42 мин" */
export function durationRu(min: number): string {
  const t = Math.max(0, Math.round(min))
  const h = Math.floor(t / 60)
  const m = t % 60
  if (!h) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}

export function pluralRu(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b > 1 && b < 5) return forms[1]
  if (b === 1) return forms[0]
  return forms[2]
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return "Доброе утро"
  if (h >= 12 && h < 17) return "Добрый день"
  if (h >= 17 && h < 23) return "Добрый вечер"
  return "Доброй ночи"
}
