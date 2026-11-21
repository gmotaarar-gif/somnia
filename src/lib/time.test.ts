import { describe, expect, it } from "vitest"
import { dateKey, deviationMinutes, relativeDay, spanMinutes, timeToMinutes } from "./time"

describe("sleep time", () => {
  it("converts a clock time into minutes since midnight", () => {
    expect(timeToMinutes("07:05")).toBe(425)
  })

  it.each([
    ["23:30", "07:15", 465],
    ["01:30", "08:15", 405],
  ])("calculates sleep duration from %s to %s", (bedtime, wakeTime, expected) => {
    expect(spanMinutes(bedtime, wakeTime)).toBe(expected)
  })

  it.each([
    ["00:15", "23:45", 30],
    ["23:45", "00:15", -30],
  ])("keeps the direction of a bedtime deviation from %s versus %s", (bedtime, goal, expected) => {
    expect(deviationMinutes(bedtime, goal)).toBe(expected)
  })

  it("uses the local calendar day near midnight and pads the month and day", () => {
    expect(dateKey(new Date(2027, 0, 2, 0, 5))).toBe("2027-01-02")
    expect(dateKey(new Date(2027, 0, 2, 23, 55))).toBe("2027-01-02")
  })

  it("labels a night relative to the current day, so the label moves on after midnight", () => {
    expect(relativeDay("2027-01-02", new Date(2027, 0, 2, 23, 59))).toBe("Сегодня")
    expect(relativeDay("2027-01-02", new Date(2027, 0, 3, 0, 1))).toBe("Вчера")
    expect(relativeDay("2027-01-02", new Date(2027, 0, 4, 0, 1))).toBe("Сб, 2 янв")
  })
})
