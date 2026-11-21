import { describe, expect, it } from "vitest"
import type { SleepNight } from "@/store/store"
import { bedtimeCountdown, computeStreak, summarize } from "./metrics"
import { dateKey, daysAgo } from "./time"

describe("summarize calendar windows", () => {
  it.each([7, 14, 30])("uses the last %i calendar days and the preceding window", (span) => {
    const night = (ago: number, durationMin: number): SleepNight => ({
      id: `${ago}`, dateKey: dateKey(daysAgo(ago)), bedtime: "23:30", wakeTime: "07:30",
      durationMin, quality: 80, awakenings: 0, tags: [],
    })
    const nights = [night(span * 2, 60), night(span * 2 - 1, 240), night(span, 240), night(span - 1, 480), night(0, 480), night(-1, 60)]
    const summary = summarize(nights, [], "23:30", "07:30", span)
    expect(summary.week.map((n) => n.dateKey)).toEqual([dateKey(daysAgo(span - 1)), dateKey(daysAgo(0))])
    expect(summary.avgDuration).toBe(480)
    expect(summary.indexDelta).toBe(20)
    expect(summarize([], [], "23:30", "07:30", span)).toMatchObject({ week: [], avgDuration: 0, indexDelta: 0 })
    expect(summarize([night(span, 240)], [], "23:30", "07:30", span)).toMatchObject({ week: [], indexDelta: 0 })
  })
})

describe("bedtimeCountdown", () => {
  it("keeps the three-hour grace window across midnight and resets afterwards", () => {
    for (const [hour, minute] of [[0, 15], [2, 30]]) {
      expect(bedtimeCountdown("23:30", "07:30", new Date(2027, 0, 3, hour, minute)))
        .toEqual({ minutes: 0, past: true, dayProgress: 1 })
    }
    expect(bedtimeCountdown("23:30", "07:30", new Date(2027, 0, 3, 2, 31)))
      .toMatchObject({ minutes: 1259, past: false })
    expect(bedtimeCountdown("23:30", "07:30", new Date(2027, 0, 3, 22, 30)))
      .toMatchObject({ minutes: 60, past: false })
    expect(bedtimeCountdown("00:15", "08:15", new Date(2027, 0, 3, 0, 30)))
      .toMatchObject({ minutes: 0, past: true })
  })

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
