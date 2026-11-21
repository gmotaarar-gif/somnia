// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { MotionConfig, motion, useReducedMotion } from "framer-motion"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Island } from "@/shell/Island"
import { MotionProvider } from "./MotionProvider"
import { ScreenTransition } from "./ScreenTransition"

vi.mock("framer-motion", async (original) => ({
  ...await original<typeof import("framer-motion")>(),
  useReducedMotion: vi.fn(() => false),
}))

const { store } = vi.hoisted(() => ({
  store: { toast: null as null | { id: number; text: string }, tab: "today", setTab: vi.fn(), nightMode: false },
}))

vi.mock("@/store/store", () => ({
  useStore: () => store,
  useBreath: () => ({ breath: { running: false, remainingSec: 0 } }),
}))

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false)
  store.toast = null
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("screen transition lifecycle", () => {
  it("shows the latest screen immediately during rapid navigation and makes outgoing screens inert", async () => {
    const view = (key: string) => (
      <MotionConfig reducedMotion="never">
        <ScreenTransition screenKey={key} direction={1}><button>{key}</button></ScreenTransition>
      </MotionConfig>
    )
    const { rerender } = render(view("today"))
    rerender(view("sleep"))
    expect(screen.getByRole("main").textContent).toBe("sleep")
    const outgoing = screen.getByText("today").closest("main")!
    expect(outgoing.hasAttribute("inert")).toBe(true)
    expect(outgoing.getAttribute("aria-hidden")).toBe("true")

    rerender(view("mind"))
    rerender(view("practices"))
    expect(screen.getByRole("main").textContent).toBe("practices")
    await waitFor(() => expect(screen.getAllByRole("main", { hidden: true })).toHaveLength(1))
  })

  it("can return to a screen that is still exiting without leaving it inert", async () => {
    const view = (key: string) => (
      <MotionConfig reducedMotion="never">
        <ScreenTransition screenKey={key} direction={-1}>{key}</ScreenTransition>
      </MotionConfig>
    )
    const { rerender } = render(view("today"))
    rerender(view("sleep"))
    rerender(view("today"))
    expect(screen.getByRole("main").hasAttribute("inert")).toBe(false)
    expect(screen.getByRole("main").textContent).toBe("today")
    await waitFor(() => expect(screen.getAllByRole("main", { hidden: true })).toHaveLength(1))
  })
})

it("settles animations without waiting for explicit delays when reduced motion is enabled", async () => {
  vi.mocked(useReducedMotion).mockReturnValue(true)
  render(
    <MotionProvider>
      <motion.div data-testid="content" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 10, delay: 10 }} />
    </MotionProvider>
  )
  await waitFor(() => {
    expect(screen.getByTestId("content").style.opacity).toBe("1")
    expect(screen.getByTestId("content").style.transform).toBe("none")
  })
})

it("retains the mobile toast during its exit rather than unmounting it abruptly", async () => {
  store.toast = { id: 1, text: "Сохранено" }
  const { rerender } = render(<MotionConfig reducedMotion="never"><Island /></MotionConfig>)
  expect(screen.getByRole("status").textContent).toContain("Сохранено")
  store.toast = null
  rerender(<MotionConfig reducedMotion="never"><Island /></MotionConfig>)
  expect(screen.queryByRole("status")).not.toBeNull()
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull())
})
