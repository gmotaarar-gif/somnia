// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { dateKey, daysAgo, spanMinutes } from "@/lib/time"
import { StoreProvider, type SleepNight } from "@/store/store"
import { SleepScreen } from "./Sleep"

vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => true,
}))

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addListener() {}, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal("IntersectionObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

it("keeps early and late sleep windows inside the schedule chart in chronological order", () => {
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
  render(<StoreProvider><SleepScreen /></StoreProvider>)
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

it.each([null, 45, 10])("shows no-data dynamics for an empty period (night age: %s)", (age) => {
  localStorage.setItem("somna-state-v6", JSON.stringify({ nights: age === null ? [] : [{
    id: "old", dateKey: dateKey(daysAgo(age)), bedtime: "23:30", wakeTime: "07:30",
    durationMin: 480, quality: 80, awakenings: 0, tags: [],
  }] }))
  render(<StoreProvider><SleepScreen /></StoreProvider>)
  const dynamics = within(screen.getByText("Динамика").closest("section")!)
  expect(dynamics.getByText("Пока нет данных. Запишите первую ночь.")).toBeTruthy()
  expect(dynamics.getAllByText("—")).toHaveLength(4)
  expect(dynamics.queryByText("в норме")).toBeNull()
  expect(dynamics.queryByText("без изменений")).toBeNull()

  fireEvent.click(dynamics.getByRole("radio", { name: "14 дн" }))
  if (age === 10) {
    expect(dynamics.queryByText("Пока нет данных. Запишите первую ночь.")).toBeNull()
    expect(dynamics.getByRole("img", { name: "8:00" })).toBeTruthy()
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    fireEvent.click(dynamics.getByRole("radio", { name: "7 дн" }))
  }
  expect(dynamics.getByText("Пока нет данных. Запишите первую ночь.")).toBeTruthy()
})

it("shows all retained nights when expanded and only three when collapsed", () => {
  localStorage.setItem("somna-state-v6", JSON.stringify({
    nights: Array.from({ length: 42 }, (_, i) => ({
      id: `n${i}`, dateKey: dateKey(daysAgo(41 - i)), bedtime: "23:30", wakeTime: "07:30",
      durationMin: 480, quality: 80, awakenings: 0, tags: [],
    })),
  }))
  render(<StoreProvider><SleepScreen /></StoreProvider>)

  expect(screen.getAllByRole("listitem")).toHaveLength(3)
  fireEvent.click(screen.getByRole("button", { name: "Показать все ночи" }))
  expect(screen.getAllByRole("listitem")).toHaveLength(42)
  fireEvent.click(screen.getByRole("button", { name: "Свернуть" }))
  expect(screen.getAllByRole("listitem")).toHaveLength(3)
})
