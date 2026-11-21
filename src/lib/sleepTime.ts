export function timeToMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number)
  return ((h % 24) * 60 + (m % 60) + 1440) % 1440
}

export function getTargetDurationMin(bedGoal: string, wakeGoal: string): number {
  let diff = timeToMinutes(wakeGoal) - timeToMinutes(bedGoal)
  if (diff <= 0) diff += 1440
  return diff
}

/** Signed deviation in minutes on a 24-hour clock (+ = позже цели, - = раньше цели) */
export function getBedtimeDeviationMin(bedtime: string, goal: string): number {
  let d = timeToMinutes(bedtime) - timeToMinutes(goal)
  if (d > 720) d -= 1440
  if (d < -720) d += 1440
  return d
}

export function toLocalDateKey(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export const WEEKDAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
export const MONTHS_RU = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
]

function parseLocalDateKey(dateKey: string): Date | null {
  const [y, m, d] = dateKey.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** Day labels for a night, relative to `today`: "Сегодня" only for today's date. */
export function getNightDateLabels(
  dateKey: string,
  today: Date = new Date()
): { date: string; dayShort: string } | null {
  const d = parseLocalDateKey(dateKey)
  if (!d) return null
  const dayShort = WEEKDAYS_RU[d.getDay()] ?? "Вс"
  const date =
    dateKey === toLocalDateKey(today)
      ? "Сегодня"
      : `${dayShort}, ${d.getDate()} ${MONTHS_RU[d.getMonth()] ?? ""}`
  return { date, dayShort }
}
