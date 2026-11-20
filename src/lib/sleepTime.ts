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
