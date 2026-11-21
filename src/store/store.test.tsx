// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StoreProvider, useBreath, useStore } from "./store"

const STORAGE_KEY = "somna-state-v6"

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
})

const night = {
  dateKey: "2030-01-02",
  bedtime: "23:30",
  wakeTime: "07:30",
  durationMin: 480,
  quality: 80,
  awakenings: 0,
  tags: [],
}

describe("StoreProvider", () => {
  it("restores daily energy/stress alongside existing data and initializes older saves", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userName: "Mira", moods: [] }))
    const first = renderHook(useStore, { wrapper: StoreProvider })
    expect(first.result.current.signals).toEqual([])
    act(() => first.result.current.patch({ signals: [{ dateKey: "2030-01-02", energy: 0, stress: 10 }] }))
    first.unmount()
    const second = renderHook(useStore, { wrapper: StoreProvider })
    expect(second.result.current.userName).toBe("Mira")
    expect(second.result.current.moods).toEqual([])
    expect(second.result.current.signals).toEqual([{ dateKey: "2030-01-02", energy: 0, stress: 10 }])
  })

  it("restores profile and schedule changes on remount but closes transient sheets", () => {
    const first = renderHook(useStore, { wrapper: StoreProvider })

    act(() => {
      first.result.current.patch({ userName: "Mira", bedGoal: "00:15", wakeGoal: "08:15", reminder: false })
      first.result.current.openSheet("sleep")
    })
    expect(first.result.current.sheet).toBe("sleep")
    first.unmount()

    const { result } = renderHook(useStore, { wrapper: StoreProvider })
    expect(result.current).toMatchObject({
      userName: "Mira",
      bedGoal: "00:15",
      wakeGoal: "08:15",
      reminder: false,
      sheet: null,
    })
  })

  it("falls back to the default schedule when saved JSON is invalid", () => {
    localStorage.setItem(STORAGE_KEY, "{invalid")

    const { result } = renderHook(useStore, { wrapper: StoreProvider })

    expect(result.current).toMatchObject({ bedGoal: "23:30", wakeGoal: "07:30" })
  })

  it("keeps one night per morning, in calendar order, and stamps mood entries", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2030, 0, 2, 9, 5))
    const { result } = renderHook(useStore, { wrapper: StoreProvider })
    const before = result.current.nights.length
    const moods = result.current.moods.length

    act(() => {
      result.current.addNight({ ...night, dateKey: "2029-11-01" })
      result.current.addMood({ valence: 0.5, emotions: ["Calm"], factors: [] })
    })
    expect(result.current.nights).toHaveLength(before + 1)
    expect(result.current.nights[0]).toMatchObject({ dateKey: "2029-11-01", durationMin: 480 })
    expect(result.current.moods).toHaveLength(moods + 1)
    expect(new Date(result.current.moods.at(-1)!.at)).toEqual(new Date(2030, 0, 2, 9, 5))

    // logging the same morning again replaces the record instead of adding a second one
    act(() => result.current.addNight({ ...night, dateKey: "2029-11-01", durationMin: 400 }))
    expect(result.current.nights).toHaveLength(before + 1)
    expect(result.current.nights.filter((n) => n.dateKey === "2029-11-01")).toEqual([
      expect.objectContaining({ durationMin: 400 }),
    ])
  })

  it("normalizes duplicated and unordered saved nights on load", () => {
    const saved = [
      { ...night, id: "b", dateKey: "2030-01-03" },
      { ...night, id: "a1", dateKey: "2030-01-02", durationMin: 300 },
      { ...night, id: "a2", dateKey: "2030-01-02", durationMin: 420 },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nights: saved }))

    const { result } = renderHook(useStore, { wrapper: StoreProvider })

    expect(result.current.nights.map((n) => [n.dateKey, n.durationMin])).toEqual([
      ["2030-01-02", 420],
      ["2030-01-03", 480],
    ])
  })

  it("starts day counters from zero when an open tab crosses midnight", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2030, 0, 2, 23, 58))
    const { result } = renderHook(useStore, { wrapper: StoreProvider })

    act(() => result.current.addWater(250))
    const ml = result.current.water.ml
    expect(ml).toBeGreaterThan(0)

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.water).toEqual({ day: "2030-01-02", ml })

    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(result.current.water).toEqual({ day: "2030-01-03", ml: 0 })
    expect(result.current.breath).toEqual({ day: "2030-01-03", min: 0 })
    expect(result.current.ritual).toEqual({ day: "2030-01-03", done: [] })
  })

  it("credits a finished breathing session once and resets the timer", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2030, 0, 2, 12, 0))
    const { result } = renderHook(() => ({ store: useStore(), timer: useBreath() }), {
      wrapper: StoreProvider,
      reactStrictMode: true,
    })
    const startingMinutes = result.current.store.breath.min
    const startingSessions = result.current.store.sessions.length

    act(() => {
      result.current.timer.setBreath((b) => ({ ...b, running: true, remainingSec: 60, totalSec: 60 }))
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.timer.breath).toMatchObject({ running: true, remainingSec: 59 })

    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(result.current.timer.breath).toMatchObject({ running: false, remainingSec: 60 })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.store.breath.min).toBe(startingMinutes + 1)
    expect(result.current.store.sessions).toHaveLength(startingSessions + 1)
  })
})
