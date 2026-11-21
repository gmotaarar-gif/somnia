import { describe, expect, it } from "vitest"
import { readSaved } from "./saved"

const night = { id: "n1", dateKey: "2026-11-20", bedtime: "23:30", wakeTime: "07:30", durationMin: 480, quality: 70, awakenings: 0, tags: [] }

describe("readSaved", () => {
  it("keeps well-formed records and drops only the broken ones", () => {
    const broken = { ...night, id: "n2", bedtime: null, durationMin: "abc" }
    const { saved, unreadable, dropped } = readSaved(JSON.stringify({ onboarded: true, userName: "Мира", nights: [night, broken] }))
    expect(unreadable).toBe(false)
    expect(dropped).toBe(1)
    expect(saved).toEqual({ onboarded: true, userName: "Мира", nights: [night] })
  })

  it("drops a malformed field but keeps the rest of the save", () => {
    const { saved, dropped } = readSaved(JSON.stringify({ onboarded: true, water: null, widgets: { a: 1 }, bedGoal: "25:99", moods: [] }))
    expect(dropped).toBe(3)
    expect(saved).toEqual({ onboarded: true, moods: [] })
  })

  it("passes unknown keys through for migrations to handle", () => {
    const { saved, dropped } = readSaved(JSON.stringify({ breath: 3, widgets: [{ id: "w-breath", kind: "breath", size: "1x1", tone: "ink", visible: true }] }))
    expect(dropped).toBe(0)
    expect(saved).toEqual({ breath: 3, widgets: [{ id: "w-breath", kind: "breath", size: "1x1", tone: "ink", visible: true }] })
  })

  it("ignores inherited object methods when matching saved keys", () => {
    const { saved, dropped } = readSaved(JSON.stringify({ valueOf: [1], constructor: [2], onboarded: true }))
    expect(dropped).toBe(0)
    expect(saved).toEqual({ valueOf: [1], constructor: [2], onboarded: true })
  })

  it.each(["{invalid", "null", "[1,2]", "42"])("reports %s as unreadable", (raw) => {
    expect(readSaved(raw)).toEqual({ saved: {}, unreadable: true, dropped: 0 })
  })
})
