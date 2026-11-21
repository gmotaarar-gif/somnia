// @vitest-environment jsdom

import type { ReactNode } from "react"
import { Blob as NodeBlob } from "node:buffer"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "@/store/store"
import { ProfileSheet } from "./ProfileSheet"

// Exercise profile/store behavior without the shared sheet's animation/portal lifecycle.
vi.mock("@/ui/Sheet", () => ({
  Sheet: ({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) => open ? (
    <div role="dialog"><button onClick={onClose}>Закрыть</button>{children}</div>
  ) : null,
}))

const STORAGE_KEY = "somna-state-v6"
const savedNight = { id: "own-night", dateKey: "2030-01-02", bedtime: "00:00", wakeTime: "08:00", durationMin: 480, quality: 80, awakenings: 0, tags: [] }

function Harness() {
  const { openSheet } = useStore()
  return <><button onClick={() => openSheet("profile")}>Открыть профиль</button><ProfileSheet /></>
}

function openProfile() {
  const result = render(<StoreProvider><Harness /></StoreProvider>)
  fireEvent.click(screen.getByText("Открыть профиль"))
  return result
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("ProfileSheet", () => {
  it("persists personal settings and updates the sleep duration across midnight", () => {
    const first = openProfile()
    fireEvent.change(screen.getByLabelText("Как к вам обращаться"), { target: { value: "Мира" } })
    fireEvent.click(screen.getByRole("radio", { name: /Сова/ }))
    fireEvent.change(screen.getByLabelText("Отбой"), { target: { value: "00:15" } })
    fireEvent.change(screen.getByLabelText("Подъём"), { target: { value: "08:45" } })
    expect(screen.getByText("8 ч 30 мин на сон")).toBeTruthy()
    fireEvent.click(screen.getByRole("switch", { name: "Напоминать об отбое" }))
    expect(screen.queryByLabelText("Время напоминания")).toBeNull()
    first.unmount()

    openProfile()
    expect((screen.getByLabelText("Как к вам обращаться") as HTMLInputElement).value).toBe("Мира")
    expect((screen.getByRole("radio", { name: /Сова/ }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText("8 ч 30 мин на сон")).toBeTruthy()
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false")
  })

  it("never resets records on cancel or close, and requires fresh confirmation after reopening", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userName: "Мира", nights: [savedNight], bedGoal: "01:00" }))
    openProfile()
    const startReset = () => {
      fireEvent.click(screen.getByText("Дополнительные настройки"))
      fireEvent.click(screen.getByRole("button", { name: "Сбросить журнал к демо-данным" }))
    }
    startReset()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).nights).toEqual([savedNight])
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).bedGoal).toBe("01:00")
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Сбросить журнал к демо-данным" }))
    fireEvent.click(screen.getByRole("button", { name: "Сбросить журнал к демо-данным" }))
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }))
    fireEvent.click(screen.getByText("Открыть профиль"))
    expect(screen.queryByRole("button", { name: "Да, заменить" })).toBeNull()
    startReset()
    fireEvent.click(screen.getByRole("button", { name: "Да, заменить" }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.userName).toBe("Мира")
    expect(saved.bedGoal).toBe("23:30")
    expect(saved.nights.some((night: { id: string }) => night.id === savedNight.id)).toBe(false)
  })

  it("exports journal records and the schedule without changing stored data", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nights: [savedNight], moods: [], sessions: [], worries: [], wellbeing: [], bedGoal: "00:00", wakeGoal: "08:00" }))
    vi.stubGlobal("Blob", NodeBlob)
    const createObjectURL = vi.fn((_blob: NodeBlob) => "blob:profile-export")
    const revokeObjectURL = vi.fn()
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    openProfile()
    const before = localStorage.getItem(STORAGE_KEY)
    fireEvent.click(screen.getByRole("button", { name: /Экспортировать журнал/ }))

    const blob = createObjectURL.mock.calls[0]?.[0] as unknown as NodeBlob
    const exported = JSON.parse(await blob.text())
    expect(exported).toMatchObject({ nights: [savedNight], moods: [], sessions: [], worries: [], wellbeing: [], bedGoal: "00:00", wakeGoal: "08:00" })
    expect(Number.isNaN(Date.parse(exported.exportedAt))).toBe(false)
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe("somna-export.json")
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:profile-export")
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
  })

  it("requires confirmation before restoring the widget layout", () => {
    openProfile()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    saved.widgets.reverse()
    const first = saved.widgets[0].id
    cleanup()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    openProfile()
    fireEvent.click(screen.getByText("Дополнительные настройки"))
    fireEvent.click(screen.getByRole("button", { name: /Восстановить виджеты/ }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).widgets[0].id).toBe(first)
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).widgets[0].id).toBe(first)
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Восстановить виджеты/ }))
    fireEvent.click(screen.getByRole("button", { name: /Восстановить виджеты/ }))
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }))
    fireEvent.click(screen.getByText("Открыть профиль"))
    expect(screen.queryByRole("button", { name: "Да, восстановить" })).toBeNull()
    fireEvent.click(screen.getByText("Дополнительные настройки"))
    fireEvent.click(screen.getByRole("button", { name: /Восстановить виджеты/ }))
    fireEvent.click(screen.getByRole("button", { name: "Да, восстановить" }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).widgets[0].id).toBe("w-streak")
  })
})
