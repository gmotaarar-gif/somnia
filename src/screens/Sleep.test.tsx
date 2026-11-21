// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { dateKey, daysAgo } from "@/lib/time"
import { StoreProvider } from "@/store/store"
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

it.each([null, 45, 10])("shows no-data dynamics for an empty period (night age: %s)", (age) => {
  localStorage.setItem("somna-state-v6", JSON.stringify({ nights: age === null ? [] : [{
    id: "old", dateKey: dateKey(daysAgo(age)), bedtime: "23:30", wakeTime: "07:30",
    durationMin: 480, quality: 80, awakenings: 0, tags: [],
  }] }))
  render(<StoreProvider><SleepScreen /></StoreProvider>)
  const dynamics = within(screen.getByText("Динамика").closest("section")!)
  expect(dynamics.getByText("Нет записей за этот период")).toBeTruthy()
  expect(dynamics.getByRole("img", { name: "--" })).toBeTruthy()
  expect(dynamics.queryByText("в норме")).toBeNull()
  expect(dynamics.queryByText("без изменений")).toBeNull()

  fireEvent.click(dynamics.getByRole("radio", { name: "14 дн" }))
  if (age === 10) {
    expect(dynamics.queryByText("Нет записей за этот период")).toBeNull()
    expect(dynamics.getByRole("img", { name: "8:00" })).toBeTruthy()
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    fireEvent.click(dynamics.getByRole("radio", { name: "7 дн" }))
  }
  expect(dynamics.getByText("Нет записей за этот период")).toBeTruthy()
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
