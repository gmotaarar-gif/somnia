// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "./store"

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

  it("hides widgets the home screen already covers once for older installs", () => {
    const widgets = [
      { id: "w-sleep", kind: "sleep", size: "1x1", tone: "plum", visible: true },
      { id: "w-water", kind: "water", size: "1x1", tone: "lime", visible: true },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ widgets }))

    const first = renderHook(useStore, { wrapper: StoreProvider })
    const shown = () => first.result.current.widgets.filter((w) => w.visible).map((w) => w.id)
    expect(shown()).toEqual(["w-water"])

    act(() => first.result.current.updateWidget("w-sleep", { visible: true }))
    first.unmount()

    const { result } = renderHook(useStore, { wrapper: StoreProvider })
    expect(result.current.widgets.filter((w) => w.visible).map((w) => w.id)).toEqual(["w-sleep", "w-water"])
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
    expect(result.current.ritual).toEqual({ day: "2030-01-03", done: [] })
  })

  it("drops the removed breathing counter and widget but keeps earned practice minutes", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      layout: 2,
      breath: { day: "2030-01-02", min: 6 },
      widgets: [
        { id: "w-breath", kind: "breath", size: "1x1", tone: "coral", visible: true },
        { id: "w-water", kind: "water", size: "1x1", tone: "lime", visible: true },
      ],
      sessions: [
        { id: "a", at: "2030-01-01T10:00:00.000Z", kind: "breath", min: 4 },
        { id: "b", at: "2030-01-01T11:00:00.000Z", kind: "grounding", min: 3 },
      ],
    }))

    const { result } = renderHook(useStore, { wrapper: StoreProvider })

    expect(result.current).not.toHaveProperty("breath")
    expect(result.current.widgets.some((w) => w.id === "w-breath")).toBe(false)
    expect(result.current.widgets.find((w) => w.id === "w-water")?.visible).toBe(true)
    expect(result.current.sessions.map((x) => x.min)).toEqual([4, 3])
  })
})
