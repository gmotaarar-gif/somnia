import { describe, expect, it } from "vitest"
import { stageMinutes } from "./SleepStages"

describe("displayed sleep stages", () => {
  it.each([
    ["23:38", "07:20", 462, 69, 2],
    ["23:00", "07:00", 480, 100, 0],
    ["01:00", "04:00", 180, 30, 4],
  ])("does not invent phases for the %s–%s night", (bedtime, wakeTime, durationMin, quality, awakenings) => {
    const totals = stageMinutes({
      id: "night", dateKey: "2030-01-02", bedtime, wakeTime, durationMin, quality, awakenings, tags: [],
    })

    expect(Object.values(totals).reduce((sum, minutes) => sum + minutes, 0)).toBe(0)
    expect(Object.values(totals).every((minutes) => Number.isInteger(minutes) && minutes >= 0)).toBe(true)
  })
})
