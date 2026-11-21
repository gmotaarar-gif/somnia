// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { dateKey } from "@/lib/time"
import { DEFAULT_WIDGETS, StoreProvider, useStore, type Widget } from "@/store/store"
import { GallerySheet } from "./GallerySheet"
import { WidgetGrid } from "@/widgets/WidgetGrid"

vi.mock("@/ui/Sheet", () => ({
  Sheet: ({ open, children, footer }: { open: boolean; children: React.ReactNode; footer: React.ReactNode }) => open ? <div>{children}{footer}</div> : null,
  Field: ({ label, children }: { label: string; children: React.ReactNode }) => <section><h3>{label}</h3>{children}</section>,
}))
vi.mock("@/widgets/Widget", () => ({ WidgetTile: () => <div aria-hidden="true" /> }))

afterEach(() => { cleanup(); localStorage.clear() })

const custom: Widget = {
  id: "reading", kind: "custom", title: "Чтение", target: 30, step: 5, unit: "стр",
  value: 15, day: dateKey(new Date()), visible: false, size: "2x1", tone: "rose",
}

function openGallery(widgets?: Widget[]) {
  if (widgets) localStorage.setItem("somna-state-v6", JSON.stringify({ widgets }))
  function Harness() {
    const { openSheet } = useStore()
    return <><button onClick={() => openSheet("gallery")}>Открыть каталог</button><GallerySheet /></>
  }
  render(<StoreProvider><Harness /></StoreProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Открыть каталог" }))
}

const savedWidgets = (): Widget[] => JSON.parse(localStorage.getItem("somna-state-v6")!).widgets

it("filters by category and search, with recovery from no results", () => {
  openGallery()
  fireEvent.click(screen.getByRole("button", { name: "Привычки" }))
  expect(screen.queryByRole("button", { name: /^Сон:/ })).toBeNull()
  expect(screen.getByRole("button", { name: /^Вода:/ })).toBeTruthy()
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  ВОДА  " } })
  expect(screen.getAllByRole("button", { name: /: (добавить на главный|убрать с главного)$/ })).toHaveLength(1)
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "несуществующий" } })
  expect(screen.getByText("Ничего не нашлось")).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Показать все" }))
  expect(screen.getByRole("button", { name: /^Сон:/ })).toBeTruthy()
  expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("")
})

it("restores a hidden custom habit without losing its progress", () => {
  openGallery([...DEFAULT_WIDGETS, custom])
  fireEvent.click(screen.getByRole("button", { name: "Привычки" }))
  fireEvent.click(screen.getByRole("button", { name: "Чтение: добавить на главный" }))
  expect(savedWidgets().find((widget) => widget.id === custom.id)).toEqual({ ...custom, visible: true })
})

it("hides a custom habit from home and recovers it through the gallery with its progress", () => {
  const visibleHabit = { ...custom, visible: true }
  localStorage.setItem("somna-state-v6", JSON.stringify({ widgets: [visibleHabit] }))
  function HomeHarness() {
    const { setEditing } = useStore()
    return <><button onClick={() => setEditing(true)}>Изменить</button><WidgetGrid /><GallerySheet /></>
  }
  render(<StoreProvider><HomeHarness /></StoreProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Изменить" }))
  fireEvent.click(screen.getByRole("button", { name: "Убрать виджет" }))
  expect(savedWidgets().find((widget) => widget.id === custom.id)).toEqual({ ...custom, visible: false })
  expect(savedWidgets().filter((widget) => widget.visible)).toEqual([])
  fireEvent.click(screen.getByRole("button", { name: "Добавить виджет" }))
  fireEvent.click(screen.getByRole("button", { name: "Чтение: добавить на главный" }))
  expect(savedWidgets().filter((widget) => widget.visible)).toEqual([visibleHabit])
})

it("confirms starter-layout restore and preserves custom habits and progress", () => {
  const changed = DEFAULT_WIDGETS.map((widget) => ({ ...widget, visible: false, tone: "ink" as const }))
  openGallery([...changed, custom])
  fireEvent.click(screen.getByRole("button", { name: "Вернуть стандартный набор" }))
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Отмена" }))
  expect(savedWidgets()[0].visible).toBe(false)
  fireEvent.click(screen.getByRole("button", { name: "Отмена" }))
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Вернуть стандартный набор" }))
  expect(savedWidgets().at(-1)).toEqual(custom)
  fireEvent.click(screen.getByRole("button", { name: "Вернуть стандартный набор" }))
  fireEvent.click(screen.getByRole("button", { name: "Восстановить" }))
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Вернуть стандартный набор" }))
  expect(savedWidgets()).toEqual([custom, ...DEFAULT_WIDGETS])
})

it("only creates a named habit with positive settings and persists its chosen design", () => {
  openGallery()
  fireEvent.click(screen.getByRole("radio", { name: "Свой виджет" }))
  const add = screen.getByRole("button", { name: "Добавить на главный" }) as HTMLButtonElement
  fireEvent.change(screen.getByRole("textbox", { name: "Название виджета" }), { target: { value: "   " } })
  expect(add.disabled).toBe(true)
  fireEvent.change(screen.getByRole("textbox", { name: "Название виджета" }), { target: { value: "  Чтение  " } })
  fireEvent.change(screen.getByRole("spinbutton", { name: "Цель в день" }), { target: { value: "" } })
  expect(add.disabled).toBe(true)
  fireEvent.change(screen.getByRole("spinbutton", { name: "Цель в день" }), { target: { value: "30" } })
  fireEvent.click(screen.getByRole("button", { name: "стр" }))
  fireEvent.click(screen.getByRole("button", { name: "Цвет: Роза" }))
  fireEvent.click(screen.getByRole("radio", { name: "Широкий" }))
  fireEvent.click(add)
  expect(savedWidgets()[0]).toMatchObject({ kind: "custom", title: "Чтение", target: 30, step: 5, unit: "стр", tone: "rose", size: "2x1", visible: true, value: 0 })
})
