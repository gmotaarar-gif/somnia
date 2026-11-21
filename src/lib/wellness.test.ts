import { describe, expect, it } from "vitest"
import type { MoodEntry, SleepNight } from "@/store/store"
import { insightDays, observationPath, saveDailySignal } from "./wellness"

const mood = (day: number, valence: number, hour = 10): MoodEntry => ({ id: `${day}-${hour}`, at: new Date(2030, 0, day, hour).toISOString(), valence, emotions: [], factors: [] })
const night = (day: number, durationMin: number): SleepNight => ({ id: String(day), dateKey: `2030-01-0${day}`, bedtime: "23:00", wakeTime: "07:00", durationMin, quality: 80, awakenings: 0, tags: [] })

describe("insightDays", () => {
  const now = new Date(2030, 0, 4, 18)
  it("joins sleep to the waking day and averages check-ins without inventing missing days", () => {
    const days = insightDays([mood(2, -1), mood(2, 1, 20), mood(4, 0.5)], [night(2, 480), night(3, 420)], [], 3, now)
    expect(days).toEqual([
      { key: "2030-01-02", mood: 50, count: 2, sleep: 480, energy: null, stress: null },
      { key: "2030-01-03", mood: null, count: 0, sleep: 420, energy: null, stress: null },
      { key: "2030-01-04", mood: 75, count: 1, sleep: null, energy: null, stress: null },
    ])
  })
  it("includes early-morning entries on the first day and ignores future entries", () => {
    const days = insightDays([mood(2, 0, 1), mood(4, 1, 19), mood(5, 1)], [], [], 3, now)
    expect(days.map((d) => d.count)).toEqual([1, 0, 0])
  })
  it("keeps true zero signals and rejects out-of-range observations", () => {
    const days = insightDays([], [], [{ dateKey: "2030-01-04", energy: 0, stress: 10 }, { dateKey: "2030-01-03", energy: NaN, stress: 11 }], 2, now)
    expect(days.map((d) => [d.energy, d.stress])).toEqual([[null, null], [0, 10]])
  })
  it("uses the latest night for a date and has exactly the chosen calendar span", () => {
    const days = insightDays([], [night(2, 300), night(2, 480)], [], 30, now)
    expect(days).toHaveLength(30)
    expect(days.find((d) => d.key === "2030-01-02")?.sleep).toBe(480)
    expect(days[29].key).toBe("2030-01-04")
  })
})

it("breaks lines at missing observations instead of drawing through gaps", () => {
  expect(observationPath([0, 100, null, 50])).toBe("M0.00,120.00 L96.00,0.00  M288.00,60.00")
  expect(observationPath([50])).toBe("M144.00,60.00")
  expect(observationPath([null, null]).trim()).toBe("")
})

it("replaces today's signal without deleting other days", () => {
  const existing = [{ dateKey: "2030-01-01", energy: 2, stress: 8 }, { dateKey: "2030-01-02", energy: 3, stress: 7 }]
  const next = saveDailySignal(existing, { dateKey: "2030-01-02", energy: 8, stress: 2 })
  expect(next).toEqual([existing[0], { dateKey: "2030-01-02", energy: 8, stress: 2 }])
  expect(existing[1].energy).toBe(3)
})

it("retains the latest 90 calendar days in date order", () => {
  const existing = Array.from({ length: 100 }, (_, i) => ({ dateKey: new Date(2030, 0, i + 1).toISOString().slice(0, 10), energy: 5, stress: 5 }))
  const next = saveDailySignal(existing, { dateKey: "2031-01-01", energy: 0, stress: 0 })
  expect(next).toHaveLength(90)
  expect(next[0]).toEqual(existing[11])
  expect(next[89]).toEqual({ dateKey: "2031-01-01", energy: 0, stress: 0 })
})
