import { describe, expect, it } from "vitest"
import type { SleepNight } from "@/store/store"
import { bedtimeCountdown, computeStreak } from "./metrics"

describe("bedtimeCountdown", () => {
  it("counts toward a bedtime after midnight", () => {
    const now = new Date(2027, 0, 2, 23, 55)

    expect(bedtimeCountdown("00:15", "08:15", now)).toMatchObject({ minutes: 20, past: false })
  })

  it("stops the countdown when bedtime has passed", () => {
    const now = new Date(2027, 0, 2, 23, 45)

    expect(bedtimeCountdown("23:30", "07:30", now)).toEqual({ minutes: 0, past: true, dayProgress: 1 })
  })
})

describe("computeStreak", () => {
  const night = (dateKey: string): SleepNight => ({
    id: dateKey,
    dateKey,
    bedtime: "23:30",
    wakeTime: "07:30",
    durationMin: 480,
    quality: 80,
    awakenings: 0,
    tags: [],
  })
  const now = new Date(2027, 0, 5, 9, 0)

  it("counts consecutive mornings and survives a morning that is not logged yet", () => {
    const nights = ["2027-01-02", "2027-01-03", "2027-01-04"].map(night)

    expect(computeStreak(nights, now)).toBe(3)
    expect(computeStreak([...nights, night("2027-01-05")], now)).toBe(4)
  })

  it("breaks on a missed day", () => {
    expect(computeStreak(["2027-01-01", "2027-01-02", "2027-01-04"].map(night), now)).toBe(1)
    expect(computeStreak(["2027-01-01", "2027-01-02"].map(night), now)).toBe(0)
  })
})
