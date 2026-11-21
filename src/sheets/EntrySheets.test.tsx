// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
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
      <output data-variant={toast?.variant}>{toast?.text}</output>
      <span data-testid="mood">{moods[0] ? `${moods[0].valence}|${moods[0].emotions.join(",")}|${moods[0].factors.join(",")}` : ""}</span>
      <span data-testid="night">{night ? `${night.bedtime}-${night.wakeTime}|${night.durationMin}|${night.awakenings}|${night.tags.join(",")}` : ""}</span>
      <span data-testid="quality">{nights[0]?.quality}</span>
    </>
  )
}

const mount = (open: "mood" | "sleep") => {
  render(<StoreProvider><Probe open={open} /><MoodSheet /><SleepSheet /></StoreProvider>)
  fireEvent.click(screen.getByText("open"))
}
const state = () => screen.getByRole("slider", { name: "Насколько приятно ваше состояние" }) as HTMLInputElement
const next = (times = 1) => {
  for (let i = 0; i < times; i++) fireEvent.click(screen.getByRole("button", { name: "Далее" }))
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
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
  vi.unstubAllGlobals()
})

it.each([
  ["mood", "Сохранить чек-ин", "Записано"],
  ["sleep", "Сохранить ночь", "Ночь записана"],
] as const)("surfaces a failed %s save instead of success", (sheet, save, success) => {
  mount(sheet)
  if (sheet === "mood") next(3)
  const before = localStorage.getItem("somna-state-v6")
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage full", "QuotaExceededError")
  })

  fireEvent.click(screen.getByRole("button", { name: save }))

  expect(screen.getByText("Не удалось сохранить данные. Проверьте свободное место и разрешения браузера.").getAttribute("data-variant")).toBe("error")
  expect(screen.queryByText(success)).toBeNull()
  expect(localStorage.getItem("somna-state-v6")).toBe(before)
})

it("saves a mood check-in from the state alone, confirms it and leaves by itself", () => {
  mount("mood")
  expect(screen.getByRole("img", { name: "Шаг 1 из 4" })).toBeTruthy()
  fireEvent.change(state(), { target: { value: "-60" } })
  next(3)
  expect(screen.getByRole("img", { name: "Шаг 4 из 4" })).toBeTruthy()
  vi.useFakeTimers()
  fireEvent.click(screen.getByRole("button", { name: "Сохранить чек-ин" }))

  expect(screen.getByTestId("mood").textContent).toBe("-0.6||")
  expect(screen.getByText("Записано")).toBeTruthy()
  expect(screen.getByRole("img", { name: "Чек-ин записан" })).toBeTruthy()
  expect(screen.queryByRole("button", { name: "Сохранить чек-ин" })).toBeNull()
  expect(screen.getByTestId("sheet").textContent).toBe("mood")
  act(() => { vi.advanceTimersByTime(1500) })
  expect(screen.getByTestId("sheet").textContent).toBe("none")
})

it("offers the feelings that fit the chosen state, one question at a time", () => {
  mount("mood")
  fireEvent.change(state(), { target: { value: "80" } })
  next()
  expect(screen.queryByRole("slider")).toBeNull()
  expect(screen.queryByRole("button", { name: "Тревога" })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Радость" }))
  next()
  fireEvent.click(screen.getByRole("button", { name: "Прогулка" }))
  // A chosen feeling stays on offer after the state moves away from it.
  fireEvent.click(screen.getByRole("button", { name: "Назад" }))
  fireEvent.click(screen.getByRole("button", { name: "Назад" }))
  expect(screen.queryByRole("button", { name: "Назад" })).toBeNull()
  fireEvent.change(state(), { target: { value: "-80" } })
  next()
  expect(screen.getByRole("button", { name: "Тревога" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Радость" }).getAttribute("aria-pressed")).toBe("true")
  next(2)
  fireEvent.click(screen.getByRole("button", { name: "Сохранить чек-ин" }))

  expect(screen.getByTestId("mood").textContent).toBe("-0.8|Радость|Прогулка")
})

it("adds the feeling the knob is let go on in the field of dots", () => {
  mount("mood")
  next()
  const field = document.querySelector("[data-emotion-field]")!
  vi.spyOn(field, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 330, height: 210 } as DOMRect)
  // The top left feeling of the seven that fit a pleasant state.
  const at = { clientX: 330 * (0.06 + 0.88 * 0.16), clientY: 210 * (0.06 + 0.88 * 0.22), pointerId: 1 }
  fireEvent.pointerDown(field, { clientX: 300, clientY: 190, pointerId: 1 })
  fireEvent.pointerMove(field, at)
  expect(screen.getByRole("button", { name: "Лёгкость" }).getAttribute("aria-pressed")).toBe("false")
  fireEvent.pointerUp(field, at)
  expect(screen.getByRole("button", { name: "Лёгкость" }).getAttribute("aria-pressed")).toBe("true")
  // Let go on it again: it stays chosen once.
  fireEvent.pointerDown(field, at)
  fireEvent.pointerUp(field, at)
  next(2)
  fireEvent.click(screen.getByRole("button", { name: "Сохранить чек-ин" }))
  expect(screen.getByTestId("mood").textContent).toBe("0.3|Лёгкость|")
})

it("carries the state with a drag across the orb", () => {
  mount("mood")
  const slider = state()
  const card = document.querySelector("[data-mood-stage]")!
  vi.spyOn(card, "getBoundingClientRect").mockReturnValue({ width: 300 } as DOMRect)
  fireEvent.pointerDown(card, { clientX: 150, pointerId: 1 })
  fireEvent.pointerMove(card, { clientX: 225, pointerId: 1 })
  expect(slider.value).toBe("80")
  fireEvent.pointerUp(card, { pointerId: 1 })
  fireEvent.pointerMove(card, { clientX: 0, pointerId: 1 })
  expect(slider.value).toBe("80")
})

it("saves a night with adjusted times, awakenings, a tag and a note", async () => {
  mount("sleep")
  const turn = (name: string, key: string, times: number) => {
    for (let i = 0; i < times; i++) fireEvent.keyDown(screen.getByRole("slider", { name }), { key })
  }
  turn("Отбой", "ArrowRight", 3)
  turn("Подъём", "ArrowLeft", 3)
  fireEvent.click(screen.getByRole("button", { name: "Больше" }))
  fireEvent.click(screen.getByRole("button", { name: "Кофеин" }))
  fireEvent.click(screen.getByRole("button", { name: /Добавить заметку/ }))
  fireEvent.change(await screen.findByRole("textbox", { name: "Заметка" }), { target: { value: "probe" } })
  fireEvent.click(screen.getByRole("button", { name: "Сохранить ночь" }))

  // 23:15 → 06:45 is 7:30 in bed, minus 8 minutes for one awakening
  expect(screen.getByTestId("night").textContent).toBe("23:15-06:45|442|1|Кофеин")
  expect(screen.getByTestId("sheet").textContent).toBe("none")
})

it("rates the morning in one tap", () => {
  mount("sleep")
  expect(screen.getByRole("radio", { name: "Хороший отдых" }).getAttribute("aria-checked")).toBe("true")
  fireEvent.click(screen.getByRole("radio", { name: "Сонливо" }))
  expect(screen.getByRole("radio", { name: "Сонливо" }).getAttribute("aria-checked")).toBe("true")
  fireEvent.click(screen.getByRole("button", { name: "Сохранить ночь" }))
  expect(screen.getByTestId("quality").textContent).toBe("46")
})

it("opens a morning that already has a night for correction instead of replacing it", () => {
  const today = new Date()
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  localStorage.setItem("somna-state-v6", JSON.stringify({
    layout: 2, bedGoal: "23:00", wakeGoal: "07:00",
    nights: [{ id: "n1", dateKey: key, bedtime: "00:40", wakeTime: "07:10", durationMin: 374, quality: 48, awakenings: 2, tags: ["Шум"], note: "probe" }],
  }))
  mount("sleep")
  expect(screen.getByRole("slider", { name: "Отбой" }).getAttribute("aria-valuetext")).toBe("00:40")
  expect(screen.getByRole("radio", { name: "Сонливо" }).getAttribute("aria-checked")).toBe("true")
  expect(screen.getByRole("button", { name: "Шум" }).getAttribute("aria-pressed")).toBe("true")
  expect((screen.getByRole("textbox", { name: "Заметка" }) as HTMLTextAreaElement).value).toBe("probe")
  fireEvent.click(screen.getByRole("button", { name: "Больше" }))
  fireEvent.click(screen.getByRole("button", { name: "Обновить ночь" }))

  // The untouched rating keeps the value it was saved with.
  expect(screen.getByTestId("night").textContent).toBe("00:40-07:10|366|3|Шум")
  expect(screen.getByTestId("quality").textContent).toBe("48")
  expect(screen.getByText("Ночь обновлена")).toBeTruthy()
  // Another morning starts from the usual hours again.
  fireEvent.click(screen.getByText("open"))
  fireEvent.click(screen.getByRole("radio", { name: "Вчера" }))
  expect(screen.getByRole("slider", { name: "Отбой" }).getAttribute("aria-valuetext")).toBe("23:00")
})
