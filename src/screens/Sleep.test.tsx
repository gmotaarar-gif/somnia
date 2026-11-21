// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { dateKey, daysAgo, spanMinutes } from "@/lib/time"
import { StoreProvider, type SleepNight } from "@/store/store"
import { MotionProvider } from "@/ui/MotionProvider"
import { SleepScreen } from "./Sleep"

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

it("keeps early and late sleep windows inside the schedule chart in chronological order", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }))
  vi.stubGlobal("IntersectionObserver", class {
    observe() {}
    unobserve() {}
  })
  const nights: SleepNight[] = [
    ["20:30", "07:00"],
    ["21:00", "07:15"],
    ["23:30", "07:30"],
    ["00:30", "12:00"],
    ["23:55", "23:55"],
  ].map(([bedtime, wakeTime], i) => ({
    id: String(i),
    dateKey: dateKey(daysAgo(4 - i)),
    bedtime,
    wakeTime,
    durationMin: bedtime === wakeTime ? 0 : spanMinutes(bedtime, wakeTime),
    quality: 75,
    awakenings: 0,
    tags: [],
  }))
  localStorage.setItem("somna-state-v6", JSON.stringify({ nights }))
  render(<StoreProvider><MotionProvider><SleepScreen /></MotionProvider></StoreProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Режим" }))

  const bars = nights.map(({ bedtime, wakeTime }) => {
    const { style } = screen.getByTitle(new RegExp(`${bedtime} → ${wakeTime}$`))
    const top = parseFloat(style.top)
    const height = parseFloat(style.height)
    expect(top).toBeGreaterThanOrEqual(0)
    expect(height).toBeGreaterThan(0)
    expect(top + height).toBeLessThanOrEqual(100)
    return { top, bottom: top + height }
  })
  for (let i = 1; i < bars.length; i++) expect(bars[i].top).toBeGreaterThan(bars[i - 1].top)
  expect(parseFloat(screen.getByText("23:30").parentElement!.style.top)).toBeCloseTo(bars[2].top)
  expect(parseFloat(screen.getByText("07:30").parentElement!.style.top)).toBeCloseTo(bars[2].bottom)
})
