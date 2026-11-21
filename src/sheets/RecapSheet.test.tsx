// @vitest-environment jsdom

import * as React from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "@/store/store"
import { RecapSheet } from "./RecapSheet"

// Exercise recap state and persistence independently of the shared sheet/animation host.
vi.mock("@/ui/Sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div role="dialog">{children}</div> : null,
}))
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useReducedMotion: () => true,
  motion: {
    section: ({ children, initial, animate, exit, custom, variants, transition, onAnimationComplete, ...props }: any) => <section {...props}>{children}</section>,
  },
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function setup() {
  let store!: ReturnType<typeof useStore>
  function Harness() {
    store = useStore()
    return <RecapSheet />
  }
  render(<StoreProvider><Harness /></StoreProvider>)
  act(() => store.openSheet("recap"))
  return () => store
}

describe("weekly recap", () => {
  it("lets users go back from the final story and closes without saving a draft", () => {
    const store = setup()
    fireEvent.click(screen.getByRole("button", { name: "5. Следующая неделя" }))
    const options = screen.getAllByRole("radio")
    fireEvent.click(options[1])
    expect(store().weeklyGoal).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Предыдущий раздел" }))
    expect(screen.getByRole("heading", { name: "Забота о себе" })).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Закрыть итоги" }))
    expect(store().sheet).toBeNull()
    expect(store().weeklyGoal).toBeNull()
  })

  it("saves the selected goal, confirms it, and restores it when reopened", () => {
    const store = setup()
    fireEvent.click(screen.getByRole("button", { name: "5. Следующая неделя" }))
    fireEvent.click(screen.getAllByRole("radio")[1])
    const selected = screen.getAllByRole("radio")[1] as HTMLInputElement
    fireEvent.click(screen.getByRole("button", { name: "Сохранить цель" }))
    expect(store().sheet).toBeNull()
    expect(store().weeklyGoal?.id).toBe(selected.value)
    expect(store().toast?.text).toBe("Цель на неделю сохранена")
    const persisted = JSON.parse(localStorage.getItem("somna-state-v6")!)
    expect(persisted.weeklyGoal).toEqual(store().weeklyGoal)
    act(() => store().openSheet("recap"))
    fireEvent.click(screen.getByRole("button", { name: "5. Следующая неделя" }))
    expect((screen.getByRole("radio", { checked: true }) as HTMLInputElement).value).toBe(selected.value)
  })

  it("shows no misleading score for an empty week and still offers a goal", () => {
    const store = setup()
    act(() => store().patch({ nights: [], moods: [], sessions: [] }))
    expect(screen.getByRole("heading", { name: "Начнём с одной ночи" })).toBeDefined()
    expect(screen.queryByText("Режим сбит")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "3. Состояние" }))
    expect(screen.getByText("ещё нет чек-инов")).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "5. Следующая неделя" }))
    expect(screen.getAllByRole("radio")).toHaveLength(3)
    expect((screen.getByRole("button", { name: "Сохранить цель" }) as HTMLButtonElement).disabled).toBe(false)
  })
})
