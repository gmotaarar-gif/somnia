import { describe, expect, it } from "vitest"
import type { MoodEntry, PracticeSession, SleepNight } from "@/store/store"
import { buildWeeklyRecap, recapGoalOptions } from "./recap"

const now = new Date(2026, 10, 21, 12)
const night = (dateKey: string, durationMin = 480): SleepNight => ({
  id: dateKey, dateKey, durationMin, bedtime: "23:30", wakeTime: "07:30", quality: 80, awakenings: 0, tags: [],
})
const mood = (day: number, valence = 0, hour = 10): MoodEntry => ({
  id: `${day}-${hour}`, at: new Date(2026, 10, day, hour).toISOString(), valence, emotions: ["Спокойствие"], factors: [],
})
const session = (day: number): PracticeSession => ({
  id: `${day}`, at: new Date(2026, 10, day, 10).toISOString(), kind: "breath", min: 5,
})

describe("buildWeeklyRecap", () => {
  it("does not pull old or future nights into a sparse week and preserves calendar gaps", () => {
    const r = buildWeeklyRecap([night("2026-11-21"), night("2026-11-02"), night("2026-11-15", 420), night("2026-11-22")], [], [], "23:30", "07:30", now)
    expect(r.summary.week.map((n) => n.dateKey)).toEqual(["2026-11-15", "2026-11-21"])
    expect(r.days.map((d) => d.key)).toEqual(["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"])
    expect(r.days[1].night).toBeUndefined()
    expect(r.summary.avgDuration).toBe(450)
    expect(r.indexDelta).toBeNull()
  })

  it("compares only the preceding seven calendar days, even with fewer than seven nights", () => {
    const r = buildWeeklyRecap([night("2026-11-01", 100), night("2026-11-08", 240), night("2026-11-14", 240), night("2026-11-15"), night("2026-11-21")], [], [], "23:30", "07:30", now)
    expect(r.previousNights).toBe(2)
    expect(r.indexDelta).toBe(20)
  })

  it("uses all check-ins in the window, excludes future times, and counts unique days", () => {
    const entries = [mood(14), mood(15, -1), mood(15, 1, 11), ...Array.from({ length: 8 }, (_, i) => mood(20, 0.5, i)), mood(21, 1, 13), mood(22)]
    const r = buildWeeklyRecap([night("2026-11-15")], entries, [session(14), session(15), session(19), session(22)], "23:30", "07:30", now)
    expect(r.moods).toHaveLength(10)
    expect(r.moodDays).toBe(2)
    expect(r.days[0].mood).toBe(50)
    expect(r.days[1].mood).toBeNull()
    expect(r.summary.moodAvg).toBe(70)
    expect(r.practiceCount).toBe(2)
    expect(r.practiceMinutes).toBe(10)
    expect(r.activeDays).toBe(3)
  })

  it("has honest empty metrics and useful starter goals", () => {
    const r = buildWeeklyRecap([night("2026-10-01")], [], [], "23:30", "07:30", now)
    expect(r.indexDelta).toBeNull()
    expect(r.summary.week).toHaveLength(0)
    expect(r.summary.moodAvg).toBeNull()
    expect(r.goals[0].id).toBe("checkin")
    expect(r.activeDays).toBe(0)
  })

  it("counts only nights that reach the goal line", () => {
    const r = buildWeeklyRecap([night("2026-11-20", 470), night("2026-11-21", 480)], [], [], "23:30", "07:30", now)
    expect(r.summary.goalNights).toBe(1)
  })

  it("handles a week crossing a year boundary using local dates", () => {
    const r = buildWeeklyRecap([night("2026-12-27"), night("2026-12-28"), night("2027-01-03")], [], [], "23:30", "07:30", new Date(2027, 0, 3, 12))
    expect(r.days[0].key).toBe("2026-12-28")
    expect(r.days[6].key).toBe("2027-01-03")
    expect(r.summary.week).toHaveLength(2)
    expect(r.previousNights).toBe(1)
  })
})

describe("recapGoalOptions", () => {
  it("keeps the saved goal selectable after recommendations change without duplicating it", () => {
    const options = buildWeeklyRecap([], [], [], "23:30", "07:30", now).goals
    const saved = { id: "regular", text: "Отбой в одно время ±20 мин" }
    expect(recapGoalOptions(options, saved)).toHaveLength(3)
    expect(recapGoalOptions(options, saved)[0]).toMatchObject(saved)
    expect(recapGoalOptions(options, options[0])).toEqual(options)
  })
})
