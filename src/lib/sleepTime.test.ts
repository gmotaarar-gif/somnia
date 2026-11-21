import { describe, expect, it } from "vitest"
import {
  getBedtimeDeviationMin,
  getTargetDurationMin,
  timeToMinutes,
  toLocalDateKey,
} from "./sleepTime"

describe("sleep time", () => {
  it("converts a clock time into minutes since midnight", () => {
    expect(timeToMinutes("07:05")).toBe(425)
  })

  it.each([
    ["23:30", "07:15", 465],
    ["01:30", "08:15", 405],
  ])("calculates sleep duration from %s to %s", (bedtime, wakeTime, expected) => {
    expect(getTargetDurationMin(bedtime, wakeTime)).toBe(expected)
  })

  it.each([
    ["00:15", "23:45", 30],
    ["23:45", "00:15", -30],
  ])("keeps the direction of a bedtime deviation from %s versus %s", (bedtime, goal, expected) => {
    expect(getBedtimeDeviationMin(bedtime, goal)).toBe(expected)
  })

  it("uses the local calendar day near midnight and pads the month and day", () => {
    expect(toLocalDateKey(new Date(2027, 0, 2, 0, 5))).toBe("2027-01-02")
    expect(toLocalDateKey(new Date(2027, 0, 2, 23, 55))).toBe("2027-01-02")
  })
})
