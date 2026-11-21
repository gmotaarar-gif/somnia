// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
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
  vi.unstubAllGlobals()
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

it("keeps the Done button after the last widget is removed in edit mode", () => {
  renderToday()
  fireEvent.click(screen.getByRole("button", { name: "Изменить" }))

  for (const remove of screen.getAllByRole("button", { name: "Убрать виджет" })) fireEvent.click(remove)

  expect(screen.queryAllByRole("button", { name: "Убрать виджет" })).toHaveLength(0)
  fireEvent.click(screen.getByRole("button", { name: "Готово" }))
  expect(screen.queryByRole("button", { name: "Готово" })).toBeNull()
})

it("does not label an empty journal as a disrupted sleep rhythm", () => {
  renderToday()
  expect(screen.getByText("Пока нет данных")).toBeTruthy()
  expect(screen.queryByText("Режим сбит")).toBeNull()
  expect(screen.queryByText("0:00")).toBeNull()
  expect(screen.queryByRole("img", { name: "--" })).toBeNull()
  expect(screen.queryByText("ч", { exact: true })).toBeNull()
  expect(screen.getAllByText("—", { exact: true })).toHaveLength(3)
})
