// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "@/store/store"
import { MoodSheet } from "./MoodSheet"
import { SleepSheet } from "./SleepSheet"

vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => true,
}))

function Probe({ open }: { open: "mood" | "sleep" }) {
  const { openSheet, sheet, moods, nights, toast } = useStore()
  const night = nights.find((n) => n.note === "probe")
  return (
    <>
      <button onClick={() => openSheet(open)}>open</button>
      <span data-testid="sheet">{sheet ?? "none"}</span>
      <output>{toast?.text}</output>
      <span data-testid="mood">{moods[0] ? `${moods[0].valence}|${moods[0].emotions.join(",")}|${moods[0].factors.join(",")}` : ""}</span>
      <span data-testid="night">{night ? `${night.bedtime}-${night.wakeTime}|${night.durationMin}|${night.awakenings}|${night.tags.join(",")}` : ""}</span>
    </>
  )
}

const mount = (open: "mood" | "sleep") => {
  render(<StoreProvider><Probe open={open} /><MoodSheet /><SleepSheet /></StoreProvider>)
  fireEvent.click(screen.getByText("open"))
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addListener() {},
    addEventListener() {},
    removeEventListener() {},
  }))
  localStorage.setItem("somna-state-v6", JSON.stringify({ layout: 2, moods: [], bedGoal: "23:00", wakeGoal: "07:00" }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  vi.unstubAllGlobals()
})

it.each([
  ["mood", "Сохранить", "Чек-ин сохранён"],
  ["sleep", "Сохранить ночь", "Ночь записана"],
] as const)("surfaces a failed %s save instead of success", (sheet, save, success) => {
  mount(sheet)
  const before = localStorage.getItem("somna-state-v6")
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage full", "QuotaExceededError")
  })

  fireEvent.click(screen.getByRole("button", { name: save }))

  expect(screen.getByText("Не удалось сохранить данные. Проверьте свободное место и разрешения браузера.")).toBeTruthy()
  expect(screen.queryByText(success)).toBeNull()
  expect(localStorage.getItem("somna-state-v6")).toBe(before)
})

it("saves a mood check-in straight from the first step", () => {
  mount("mood")
  fireEvent.change(screen.getByRole("slider", { name: "Насколько приятно ваше состояние" }), { target: { value: "-60" } })
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }))

  expect(screen.getByTestId("mood").textContent).toBe("-0.6||")
  expect(screen.getByTestId("sheet").textContent).toBe("none")
})

it("keeps the chosen state while details are added on the second step", async () => {
  mount("mood")
  fireEvent.change(screen.getByRole("slider", { name: "Насколько приятно ваше состояние" }), { target: { value: "80" } })
  fireEvent.click(screen.getByRole("button", { name: "Детали" }))
  fireEvent.click(await screen.findByRole("button", { name: "Радость" }))
  fireEvent.click(screen.getByRole("button", { name: "Прогулка" }))
  fireEvent.click(screen.getByRole("button", { name: "Сохранить чек-ин" }))

  expect(screen.getByTestId("mood").textContent).toBe("0.8|Радость|Прогулка")
})

it("saves a night with nudged times, awakenings, a tag and a note", async () => {
  mount("sleep")
  fireEvent.click(screen.getByRole("button", { name: "Отбой: позже на 15 минут" }))
  fireEvent.click(screen.getByRole("button", { name: "Подъём: раньше на 15 минут" }))
  fireEvent.click(screen.getByRole("button", { name: "Больше" }))
  fireEvent.click(screen.getByRole("button", { name: "Кофеин" }))
  fireEvent.click(screen.getByRole("button", { name: /Добавить заметку/ }))
  fireEvent.change(await screen.findByRole("textbox", { name: "Заметка" }), { target: { value: "probe" } })
  fireEvent.click(screen.getByRole("button", { name: "Сохранить ночь" }))

  // 23:15 → 06:45 is 7:30 in bed, minus 8 minutes for one awakening
  expect(screen.getByTestId("night").textContent).toBe("23:15-06:45|442|1|Кофеин")
  expect(screen.getByTestId("sheet").textContent).toBe("none")
})
