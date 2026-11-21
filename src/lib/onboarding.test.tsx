// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_WIDGETS, StoreProvider, useStore, type Widget } from "@/store/store"
import { onboardingWidgets } from "./onboarding"
import { requestReminderPermission } from "./notifications"

vi.mock("./notifications", () => ({
  requestReminderPermission: vi.fn().mockResolvedValue(true),
  syncReminders: vi.fn().mockResolvedValue(undefined),
  listenForReminders: vi.fn(() => () => {}),
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

const custom: Widget = {
  id: "w-custom",
  kind: "custom",
  size: "1x1",
  tone: "lime",
  visible: true,
  title: "Витамины",
  unit: "шт",
  target: 3,
  step: 1,
  value: 2,
  day: "2030-01-02",
}

describe("onboardingWidgets", () => {
  it("matches the default layout on a first run", () => {
    const picked = ["w-streak", "w-sleep"]
    expect(onboardingWidgets(DEFAULT_WIDGETS, picked)).toEqual(
      DEFAULT_WIDGETS.map((w) => ({ ...w, visible: picked.includes(w.id) }))
    )
  })

  it("keeps custom widgets, their progress and the order while built-ins follow the picks", () => {
    const current = [custom, ...DEFAULT_WIDGETS.slice(1)]
    const result = onboardingWidgets(current, ["w-sleep"])

    expect(result[0]).toEqual(custom)
    expect(result.find((w) => w.id === "w-sleep")?.visible).toBe(true)
    expect(result.find((w) => w.id === "w-water")?.visible).toBe(false)
    expect(result.at(-1)).toEqual({ ...DEFAULT_WIDGETS[0], visible: false })
    expect(result).toHaveLength(DEFAULT_WIDGETS.length + 1)
  })
})

describe("redoing onboarding", () => {
  it.each([true, false])("requests permission before saving an enabled bedtime reminder (granted: %s)", async (granted) => {
    vi.mocked(requestReminderPermission).mockResolvedValueOnce(granted)
    const { result } = renderHook(useStore, { wrapper: StoreProvider })
    await act(async () => { await result.current.finishOnboarding({ reminder: true }) })
    expect(requestReminderPermission).toHaveBeenCalledOnce()
    expect(result.current.reminder).toBe(granted)
    expect(result.current.onboarded).toBe(true)
    expect(JSON.parse(localStorage.getItem("somna-state-v6")!).reminder).toBe(granted)
    if (!granted) expect(result.current.toast?.text).toBe("Разрешите уведомления для Somna в настройках телефона")
  })

  it("does not request permission for a disabled bedtime reminder", async () => {
    const { result } = renderHook(useStore, { wrapper: StoreProvider })
    await act(async () => { await result.current.finishOnboarding({ reminder: false }) })
    expect(requestReminderPermission).not.toHaveBeenCalled()
    expect(result.current.reminder).toBe(false)
  })
  it("does not drop custom habits or their progress", async () => {
    const { result } = renderHook(useStore, { wrapper: StoreProvider })

    act(() => result.current.addCustomWidget({ title: "Витамины", unit: "шт", target: 3, step: 1, tone: "lime", size: "1x1" }))
    const id = result.current.widgets[0].id
    act(() => result.current.bumpWidget(id))
    act(() => result.current.bumpWidget(id))
    act(() => result.current.patch({ onboarded: false }))

    await act(async () => { await result.current.finishOnboarding({ widgets: onboardingWidgets(result.current.widgets, ["w-sleep"]) }) })

    expect(result.current.onboarded).toBe(true)
    expect(result.current.widgets.find((w) => w.id === id)).toMatchObject({ kind: "custom", title: "Витамины", value: 2, visible: true })
    expect(result.current.widgets.find((w) => w.id === "w-sleep")?.visible).toBe(true)
  })
})
