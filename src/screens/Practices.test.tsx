// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { StoreProvider } from "@/store/store"
import { PracticesScreen } from "./Practices"

const { topBarRender } = vi.hoisted(() => ({ topBarRender: vi.fn() }))
vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => true,
}))
vi.mock("@/shell/TopBar", () => ({
  TopBar: () => { topBarRender(); return <header>Practices</header> },
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it("keeps the rest of the practices screen out of breathing timer updates", () => {
  vi.useFakeTimers()
  vi.stubGlobal("matchMedia", () => ({ matches: true, addListener() {}, addEventListener() {}, removeEventListener() {} }))
  render(<StoreProvider><PracticesScreen /></StoreProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Начать" }))
  topBarRender.mockClear()
  for (let i = 0; i < 5; i++) act(() => vi.advanceTimersByTime(1000))
  console.log("5 breathing ticks, unrelated TopBar renders:", topBarRender.mock.calls.length)
  expect(topBarRender).toHaveBeenCalledTimes(0)
  expect(screen.getByRole("img", { name: "3:55" })).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Пауза" }))
  act(() => vi.advanceTimersByTime(1000))
  expect(screen.getByRole("img", { name: "3:55" })).toBeTruthy()
})
