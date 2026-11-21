// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { MotionConfig, motion } from "framer-motion"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Island } from "@/shell/Island"
import { MotionProvider, usePrefersReducedMotion } from "./MotionProvider"
import { ScreenTransition } from "./ScreenTransition"

const { store } = vi.hoisted(() => ({
  store: { toast: null as null | { id: number; text: string }, tab: "today", setTab: vi.fn(), nightMode: false },
}))

vi.mock("@/store/store", () => ({
  useStore: () => store,
  useBreath: () => ({ breath: { running: false, remainingSec: 0 } }),
}))

let reduced = false
const listeners = new Set<() => void>()

beforeEach(() => {
  reduced = false
  listeners.clear()
  store.toast = null
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    get matches() { return reduced },
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: (_: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_: string, callback: () => void) => listeners.delete(callback),
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
  reduced = true
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

it("applies live preference changes to mounted animations without losing application state", async () => {
  function Content() {
    const [count, setCount] = useState(0)
    return <>
      <button onClick={() => setCount(count + 1)}>{count}</button>
      <motion.div data-testid="mounted" initial={false} animate={{ opacity: count % 2 }} transition={{ duration: 0.15, delay: 0.2 }} />
    </>
  }
  render(<MotionProvider><Content /></MotionProvider>)
  const button = screen.getByRole("button")
  act(() => {
    reduced = true
    listeners.forEach((notify) => notify())
  })
  act(() => button.click())
  expect(screen.getByRole("button")).toBe(button)
  expect(button.textContent).toBe("1")
  await waitFor(() => expect(screen.getByTestId("mounted").style.opacity).toBe("1"), { timeout: 150 })

  act(() => {
    reduced = false
    listeners.forEach((notify) => notify())
  })
  act(() => button.click())
  expect(button.textContent).toBe("2")
  expect(screen.getByTestId("mounted").style.opacity).toBe("1")
  await waitFor(() => expect(screen.getByTestId("mounted").style.opacity).toBe("0"))
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

it("restarts a decorative loop when clearing reduced motion", async () => {
  function Pulse() {
    const reduce = usePrefersReducedMotion()
    return <motion.div key={String(reduce)} data-testid="pulse" animate={{ scale: reduce ? 1 : [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
  }
  render(<MotionProvider><Pulse /></MotionProvider>)
  act(() => {
    reduced = true
    listeners.forEach((notify) => notify())
  })
  await waitFor(() => expect(screen.getByTestId("pulse").style.transform).toBe("none"))
  act(() => {
    reduced = false
    listeners.forEach((notify) => notify())
  })
  await waitFor(() => expect(screen.getByTestId("pulse").style.transform).toMatch(/scale\(1\.\d+/))
})
