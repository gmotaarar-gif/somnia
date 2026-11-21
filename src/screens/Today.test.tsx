// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "@/store/store"
import { SubscriptionProvider } from "@/store/subscription"
import { TodayScreen } from "./Today"

vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => true,
}))

const STORAGE_KEY = "somna-state-v6"

function Probe() {
  const { tab, sheet } = useStore()
  return <span data-testid="where">{`${tab}:${sheet ?? "none"}`}</span>
}

const renderToday = () =>
  render(<StoreProvider><SubscriptionProvider><TodayScreen /><Probe /></SubscriptionProvider></StoreProvider>)

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it("opens the sleep form, not the sleep tab, when Enter is pressed on the empty hero's button", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ nights: [] }))
  renderToday()

  const record = screen.getByRole("button", { name: "Записать сон" })
  const reachedDefault = fireEvent.keyDown(record, { key: "Enter" })

  expect(reachedDefault).toBe(true)
  expect(screen.getByTestId("where").textContent).toBe("today:none")

  fireEvent.keyDown(screen.getByRole("button", { name: "Прошлая ночь. Открыть сон" }), { key: "Enter" })
  expect(screen.getByTestId("where").textContent).toBe("sleep:none")
})
