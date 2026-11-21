// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SomnaProvider, useSomna, useStressTimer } from "./useSomnaStore"

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
})

describe("SomnaProvider", () => {
  it("restores profile and schedule changes on remount but closes transient overlays", () => {
    const first = renderHook(useSomna, { wrapper: SomnaProvider })

    act(() => {
      first.result.current.setUserName("Mira")
      first.result.current.setSleepSchedule("00:15", "08:15")
      first.result.current.setReminderEnabled(false)
      first.result.current.setSleepLogOpen(true)
    })
    expect(first.result.current.anyOverlayOpen).toBe(true)
    first.unmount()

    const { result } = renderHook(useSomna, { wrapper: SomnaProvider })
    expect(result.current).toMatchObject({
      userName: "Mira",
      bedtimeGoal: "00:15",
      wakeGoal: "08:15",
      reminderEnabled: false,
      anyOverlayOpen: false,
    })
  })

  it("falls back to the default schedule when saved JSON is invalid", () => {
    localStorage.setItem("somna-app-state-v5", "{invalid")

    const { result } = renderHook(useSomna, { wrapper: SomnaProvider })

    expect(result.current).toMatchObject({ bedtimeGoal: "23:30", wakeGoal: "07:30" })
  })

  it("adds sleep and mood entries with local dates, preserving a supplied sleep date", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2030, 0, 2, 9, 5))
    const { result } = renderHook(useSomna, { wrapper: SomnaProvider })
    const { sleepHistory, moodHistory, streakDays } = result.current
    const night = {
      date: "Today",
      dayShort: "Wed",
      bedtime: "23:30",
      wakeTime: "07:30",
      durationMin: 480,
      quality: 80,
      awakenings: 0,
    }
    const mood = { label: "Calm", valence: 0.5, emotions: ["Calm"], factors: [] }

    act(() => {
      result.current.addSleepNight(night)
      result.current.addMoodEntry(mood)
    })
    const loggedNight = result.current.sleepHistory.find((entry) => entry.dateKey === "2030-01-02")
    expect(loggedNight).toMatchObject({ durationMin: 480, quality: 80 })
    expect(result.current.streakDays).toBe(streakDays + 1)
    expect(result.current.moodHistory.at(-1)).toMatchObject({
      ...mood,
      dateKey: "2030-01-02",
      timestamp: expect.stringMatching(/09:05$/),
    })
    expect(result.current.moodHistory).toHaveLength(moodHistory.length + 1)

    vi.setSystemTime(new Date(2030, 0, 2, 9, 6))
    act(() => result.current.addSleepNight({ ...night, dateKey: "2030-01-01" }))
    expect(result.current.sleepHistory).toHaveLength(sleepHistory.length + 2)
    expect(result.current.sleepHistory).toContainEqual(
      expect.objectContaining({ dateKey: "2030-01-01", durationMin: 480 })
    )
  })

  it("credits a finished stress timer once and resets it to its starting duration", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => ({ store: useSomna(), timer: useStressTimer() }), {
      wrapper: SomnaProvider,
      reactStrictMode: true,
    })
    const startingMinutes = result.current.store.breathMinutes

    act(() => {
      result.current.timer.setStressTimer((timer) => ({
        ...timer,
        running: true,
        remainingSec: 60,
        totalSec: 60,
      }))
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.timer.stressTimer).toMatchObject({ running: true, remainingSec: 59 })

    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(result.current.timer.stressTimer).toMatchObject({ running: false, remainingSec: 60 })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.store.breathMinutes).toBe(startingMinutes + 1)
  })
})
