// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { LocalAccountProvider } from "@/account/LocalAccountProvider"
import { StoreProvider, useStore } from "@/store/store"
import { Onboarding } from "./Onboarding"

vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  AnimatePresence: ({ children }: { children: import("react").ReactNode }) => children,
  useReducedMotion: () => true,
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function Probe() {
  const { moods, onboarded } = useStore()
  return <output data-testid="journal">{JSON.stringify({ moods, onboarded })}</output>
}

function start() {
  render(<StoreProvider><LocalAccountProvider><Onboarding /><Probe /></LocalAccountProvider></StoreProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Начать" }))
}

async function finish() {
  for (let i = 0; i < 5; i++) await act(async () => { vi.advanceTimersByTime(620) })
  fireEvent.click(screen.getByRole("button", { name: "Продолжить без регистрации" }))
  return JSON.parse(screen.getByTestId("journal").textContent!)
}

it("does not save a mood when onboarding is skipped", async () => {
  start()
  fireEvent.click(screen.getByRole("button", { name: "Позже" }))
  expect(await finish()).toEqual({ moods: [], onboarded: true })
})

it("does not treat merely viewing the mood step as answering it", async () => {
  start()
  fireEvent.change(screen.getByRole("textbox", { name: "Ваше имя" }), { target: { value: "Мира" } })
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Далее" }))
  expect(screen.getByRole("slider", { name: "Состояние" })).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Позже" }))
  expect(await finish()).toEqual({ moods: [], onboarded: true })
})

it.each([false, true])("saves a mood explicitly answered on its step (slider changed: %s)", async (change) => {
  start()
  fireEvent.change(screen.getByRole("textbox", { name: "Ваше имя" }), { target: { value: "Мира" } })
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Далее" }))
  if (change) fireEvent.change(screen.getByRole("slider", { name: "Состояние" }), { target: { value: "-0.4" } })
  fireEvent.click(screen.getByRole("button", { name: "Далее" }))
  fireEvent.click(screen.getByRole("button", { name: "Позже" }))
  const result = await finish()
  expect(result.onboarded).toBe(true)
  expect(result.moods).toHaveLength(1)
  expect(result.moods[0].valence).toBe(change ? -0.4 : 0.3)
})
