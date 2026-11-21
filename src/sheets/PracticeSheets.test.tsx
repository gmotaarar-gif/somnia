// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "@/store/store"
import { WorrySheet } from "./PracticeSheets"

vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => true,
}))

function OpenWorries() {
  const { openSheet } = useStore()
  return <button onClick={() => openSheet("worry")}>open</button>
}

const timezone = process.env.TZ
beforeEach(() => {
  process.env.TZ = "America/Los_Angeles"
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-21T08:30:00Z"))
  vi.stubGlobal("matchMedia", () => ({ matches: true, addListener() {}, addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  if (timezone === undefined) delete process.env.TZ
  else process.env.TZ = timezone
})

it("labels worries by their local day rather than their UTC timestamp prefix", () => {
  expect(new Date("2026-11-21T07:30:00Z").getDate()).toBe(20)
  localStorage.setItem("somna-state-v6", JSON.stringify({ worries: [
    { id: "yesterday", at: "2026-11-21T07:30:00Z", text: "Yesterday's worry", done: false },
    { id: "today", at: "2026-11-21T08:15:00Z", text: "Today's worry", done: false },
  ] }))
  render(<StoreProvider><OpenWorries /><WorrySheet /></StoreProvider>)
  fireEvent.click(screen.getByText("open"))

  expect(screen.getByText("Yesterday's worry").closest("li")?.textContent).toContain("Вчера")
  expect(screen.getByText("Today's worry").closest("li")?.textContent).toContain("Сегодня")
})
