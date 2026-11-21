// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { DEFAULT_WIDGETS, StoreProvider, useStore, type Widget } from "@/store/store"
import { onboardingWidgets } from "./onboarding"

afterEach(() => {
  cleanup()
  localStorage.clear()
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
  it("does not drop custom habits or their progress", () => {
    const { result } = renderHook(useStore, { wrapper: StoreProvider })

    act(() => result.current.addCustomWidget({ title: "Витамины", unit: "шт", target: 3, step: 1, tone: "lime", size: "1x1" }))
    const id = result.current.widgets[0].id
    act(() => result.current.bumpWidget(id))
    act(() => result.current.bumpWidget(id))
    act(() => result.current.patch({ onboarded: false }))

    act(() => result.current.finishOnboarding({ widgets: onboardingWidgets(result.current.widgets, ["w-sleep"]) }))

    expect(result.current.onboarded).toBe(true)
    expect(result.current.widgets.find((w) => w.id === id)).toMatchObject({ kind: "custom", title: "Витамины", value: 2, visible: true })
    expect(result.current.widgets.find((w) => w.id === "w-sleep")?.visible).toBe(true)
  })
})
