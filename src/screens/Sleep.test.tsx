// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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
