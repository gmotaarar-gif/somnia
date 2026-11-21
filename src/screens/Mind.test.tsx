// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { StoreProvider } from "@/store/store"
import { SubscriptionProvider } from "@/store/subscription"
import { MindScreen } from "./Mind"

vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  useReducedMotion: () => true,
}))

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addListener() {},
    addEventListener() {},
    removeEventListener() {},
  }))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it.each(["trend", "month"])("advances the %s calendar window at midnight without new moods", (view) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2027, 0, 20, 23, 59, 30))
  const age = view === "trend" ? 13 : 27
  localStorage.setItem("somna-state-v6", JSON.stringify({
    moods: [{ id: "oldest", at: new Date(2027, 0, 20 - age, 12).toISOString(), valence: 1, emotions: [], factors: [] }],
  }))
  render(<StoreProvider><SubscriptionProvider><MindScreen /></SubscriptionProvider></StoreProvider>)
  if (view === "month") {
    fireEvent.click(screen.getByRole("radio", { name: "Месяц" }))
    act(() => { vi.advanceTimersByTime(1000) })
  }

  if (view === "trend") expect(screen.getByRole("img", { name: /Настроение по дням: 1 из 14/ })).toBeTruthy()
  else expect(document.querySelectorAll('[title$=": 100%"]')).toHaveLength(1)

  act(() => { vi.advanceTimersByTime(60_000) })

  if (view === "trend") expect(screen.getByRole("img", { name: /Настроение по дням: 0 из 14/ })).toBeTruthy()
  else {
    expect(document.querySelectorAll('[title$=": 100%"]')).toHaveLength(0)
    expect(screen.getByTitle("Сегодня")).toBeTruthy()
  }
})

it("shows a check-in's note next to its tags in the diary", () => {
  localStorage.setItem("somna-state-v6", JSON.stringify({
    layout: 2,
    moods: [{ id: "m1", at: new Date().toISOString(), valence: 0.4, emotions: ["Радость"], factors: ["Прогулка"], note: "прогулка помогла" }],
  }))
  render(<StoreProvider><SubscriptionProvider><MindScreen /></SubscriptionProvider></StoreProvider>)

  const entry = screen.getByRole("button", { name: /Радость · Прогулка/ })
  expect(entry.textContent).toContain("прогулка помогла")
  expect(entry.getAttribute("aria-expanded")).toBe("false")

  fireEvent.click(entry)

  expect(entry.getAttribute("aria-expanded")).toBe("true")
})

it("shows every retained mood when the diary is expanded", () => {
  localStorage.setItem("somna-state-v6", JSON.stringify({
    moods: Array.from({ length: 16 }, (_, i) => ({
      id: `m${i}`, at: new Date().toISOString(), valence: 0.4, emotions: [], factors: [], note: `Entry ${i}`,
    })),
  }))
  render(<StoreProvider><SubscriptionProvider><MindScreen /></SubscriptionProvider></StoreProvider>)

  expect(screen.queryByText("«Entry 0»")).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Показать все записи" }))
  expect(screen.getByText("«Entry 0»")).toBeTruthy()
  expect(screen.getAllByText(/^«Entry \d+»$/)).toHaveLength(16)
  fireEvent.click(screen.getByRole("button", { name: "Свернуть" }))
  expect(screen.getAllByText(/^«Entry \d+»$/)).toHaveLength(3)
})
