// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { AppearancePicker } from "./AppearancePicker"
import { StoreProvider, useStore } from "@/store/store"
import { TopBar } from "@/shell/TopBar"

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })

function Settings() {
  const { theme, patch } = useStore()
  return <AppearancePicker value={theme} onChange={(theme) => patch({ theme })} />
}

it("persists all three choices without changing existing journal data", () => {
  const moods = [{ id: "mine", at: new Date().toISOString(), valence: 0.5, emotions: [], factors: [] }]
  localStorage.setItem("somna-state-v6", JSON.stringify({ theme: "system", moods }))
  for (const label of ["Светлое", "Тёмное", "Как в системе"]) {
    const view = render(<StoreProvider><Settings /></StoreProvider>)
    fireEvent.click(screen.getByRole("radio", { name: label }))
    const saved = JSON.parse(localStorage.getItem("somna-state-v6")!)
    expect(saved.theme).toBe(label === "Светлое" ? "light" : label === "Тёмное" ? "dark" : "system")
    expect(saved.moods).toEqual(moods)
    view.unmount()
    const restored = render(<StoreProvider><Settings /></StoreProvider>)
    expect((screen.getByRole("radio", { name: label }) as HTMLInputElement).checked).toBe(true)
    restored.unmount()
  }
})

it("offers a direct theme toggle even when following a light system setting", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  render(<StoreProvider><TopBar title="Сон" /><Settings /></StoreProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Включить тёмную тему" }))
  expect((screen.getByRole("radio", { name: "Тёмное" }) as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByRole("button", { name: "Включить светлую тему" }))
  expect((screen.getByRole("radio", { name: "Светлое" }) as HTMLInputElement).checked).toBe(true)
})
