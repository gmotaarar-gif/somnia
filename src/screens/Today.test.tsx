// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "@/store/store"
import { SubscriptionProvider } from "@/store/subscription"
import { dateKey, daysAgo } from "@/lib/time"
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

it.each([false, true])("shows no weekly index when the week has no nights (older history: %s)", (olderHistory) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ nights: olderHistory ? [{
    id: "old", dateKey: dateKey(daysAgo(45)), bedtime: "23:30", wakeTime: "07:30",
    durationMin: 480, quality: 80, awakenings: 0, tags: [],
  }] : [] }))
  renderToday()

  const week = screen.getByRole("button", { name: "Индекс недели. Открыть итоги" })
  expect(week.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("--")
  expect(week.textContent).toContain("Нет записей за неделю")
  expect(week.textContent).not.toContain("Режим сбит")
  fireEvent.click(week)
  expect(screen.getByTestId("where").textContent).toBe("today:recap")
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
