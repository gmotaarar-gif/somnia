import { describe, expect, it } from "vitest"
import { computeBedtimeCountdown } from "./sleepInsights"

describe("computeBedtimeCountdown", () => {
  it("counts toward a bedtime after midnight", () => {
    const now = new Date(2027, 0, 2, 23, 55)

    expect(computeBedtimeCountdown("00:15", "08:15", now)).toMatchObject({
      minutesToBed: 20,
      isPastBedtime: false,
      formattedLeft: "0:20",
    })
  })

  it("stops the countdown when bedtime has passed", () => {
    const now = new Date(2027, 0, 2, 23, 45)

    expect(computeBedtimeCountdown("23:30", "07:30", now)).toEqual({
      minutesToBed: 0,
      isPastBedtime: true,
      formattedLeft: "0:00",
      awakeProgress: 1,
    })
  })
})
