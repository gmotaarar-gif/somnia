// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useImperativeHandle, useState, type Ref } from "react"
import { motion } from "framer-motion"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import type { DistortionWaveHandle, DistortionWaveProps } from "distortion-waves"
import { ScreenTransition } from "./ScreenTransition"

// Exercise app lifecycle independently of WebGL; the package owns rendering
// and its no-WebGL crossfade. Retain both views until it reports completion.
const wave = vi.hoisted(() => ({ props: {} as DistortionWaveProps, prepare: vi.fn<() => Promise<void>>() }))
vi.mock("distortion-waves", () => ({
  DistortionWave: ({ ref, ...props }: DistortionWaveProps & { ref: Ref<DistortionWaveHandle> }) => {
    useImperativeHandle(ref, () => ({
      prepare: wave.prepare, play() {}, reverse() {}, reset() {}, element: null, controller: null,
    }))
    wave.props = props
    return <div data-testid="wave" onClickCapture={props.onClickCapture} onKeyDownCapture={props.onKeyDownCapture}>
      <div>{props.children}</div><div>{props.revealedContent}</div><aside>{props.overlay}</aside>
    </div>
  },
}))

let reduced = false
const listeners = new Set<() => void>()
beforeEach(() => {
  reduced = false
  wave.prepare.mockReset().mockResolvedValue(undefined)
  listeners.clear()
  vi.stubGlobal("matchMedia", () => ({
    get matches() { return reduced },
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

const view = (key: string) => <ScreenTransition screenKey={key}><button>{key}</button></ScreenTransition>
const finish = () => act(() => wave.props.onFinish?.(!!wave.props.revealed))
const ready = () => act(async () => {})

it("keeps the current view until captures are ready, then selects only the latest destination", async () => {
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  expect(screen.getByRole("main").textContent).toBe("sleep")
  expect(wave.props.revealed).toBe(false)
  rerender(view("mind"))
  rerender(view("practices"))
  await ready()
  expect(screen.getByRole("main").textContent).toBe("practices")
  expect(screen.getByText("today").closest("main")!.hasAttribute("inert")).toBe(true)
  expect(screen.getAllByRole("main", { hidden: true })).toHaveLength(2)
  finish()
  expect(screen.getAllByRole("main", { hidden: true })).toHaveLength(1)
})

it("can return to a screen that is still leaving without leaving it inert", async () => {
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  rerender(view("today"))
  await ready()
  expect(screen.getByRole("main").hasAttribute("inert")).toBe(false)
  expect(screen.getByRole("main").textContent).toBe("today")
  finish()
  expect(screen.getAllByRole("main", { hidden: true })).toHaveLength(1)
})

it("does not remount a destination or reset its local state when the wave settles", async () => {
  function Counter() {
    const [count, setCount] = useState(0)
    return <button onClick={() => setCount(count + 1)}>Count {count}</button>
  }
  const { rerender } = render(view("today"))
  rerender(<ScreenTransition screenKey="sleep"><Counter /></ScreenTransition>)
  await ready()
  fireEvent.click(screen.getByText("Count 0"))
  const button = screen.getByText("Count 1")
  finish()
  expect(screen.getByText("Count 1")).toBe(button)
})

it("retains the pressed dock control as source while a section loads, with a live overlay", async () => {
  const dock = <nav><button>Sleep tab</button></nav>
  const { rerender } = render(<ScreenTransition screenKey="today" overlay={dock}>Today</ScreenTransition>)
  const trigger = screen.getByText("Sleep tab")
  fireEvent.click(trigger)
  rerender(<ScreenTransition screenKey="sleep" overlay={dock}>Sleep</ScreenTransition>)
  await ready()
  expect(wave.props.type).toBe("vertical")
  expect(wave.props.source).toBe(trigger)
  expect(trigger.closest("main")).toBeNull()
  expect(screen.getByText("Sleep tab")).toBe(trigger)
  finish()
})

it("opens a center wave from a keyboard-activated card", () => {
  const { rerender } = render(<ScreenTransition screenKey="today"><div role="button" tabIndex={0}>Open sleep</div></ScreenTransition>)
  const card = screen.getByRole("button")
  fireEvent.keyDown(card, { key: "Enter" })
  rerender(view("sleep"))
  expect(wave.props.type).toBe("center")
  expect(wave.props.source).toBe(card)
})

it("honors live reduced-motion changes without resetting the current view", () => {
  render(view("today"))
  const button = screen.getByText("today")
  act(() => { reduced = true; listeners.forEach((notify) => notify()) })
  expect(wave.props.reducedMotion).toBe("always")
  expect(screen.getByText("today")).toBe(button)
})

it("waits for slow captures without running down the animation clock", async () => {
  let resolve!: () => void
  wave.prepare.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done }))
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  await ready()
  expect(wave.props.revealed).toBe(false)
  await act(async () => resolve())
  expect(wave.props.revealed).toBe(true)
  expect(wave.props.live).toBe(false)
  expect(wave.props.prewarm).toBe(false)
})

it("does not start an obsolete wave when a pending capture completes", async () => {
  let resolveFirst!: () => void
  let resolveLatest!: () => void
  wave.prepare.mockImplementationOnce(() => new Promise<void>((done) => { resolveFirst = done }))
    .mockImplementationOnce(() => new Promise<void>((done) => { resolveLatest = done }))
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  await ready()
  rerender(view("mind"))
  await act(async () => resolveFirst())
  expect(wave.props.revealed).toBe(false)
  expect(screen.getByRole("main").textContent).toBe("mind")
  expect(screen.queryByText("sleep")).toBeNull()
  await act(async () => resolveLatest())
  expect(screen.getByRole("main").textContent).toBe("mind")
})

it("crossfades after a capture timeout and ignores the late result", async () => {
  vi.useFakeTimers()
  let resolve!: () => void
  wave.prepare.mockImplementation(() => new Promise<void>((done) => { resolve = done }))
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  await ready()
  await act(async () => { vi.advanceTimersByTime(1200) })
  expect(wave.props.reducedMotion).toBe("always")
  expect(wave.props.revealed).toBe(true)
  finish()
  rerender(view("mind"))
  expect(screen.getByRole("main").textContent).toBe("mind")
  await act(async () => resolve())
  expect(screen.getByRole("main").textContent).toBe("mind")
  expect(wave.prepare).toHaveBeenCalledTimes(1)
})

it("pictures destination content fully visible instead of its entrance frame", async () => {
  const { rerender } = render(view("today"))
  rerender(<ScreenTransition screenKey="sleep">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>Sleep chart</motion.div>
  </ScreenTransition>)
  expect(screen.getByText("Sleep chart").style.opacity).toBe("1")
  await ready()
})

it("keeps a multi-layer screen current after theme updates and repeated navigation", async () => {
  const layered = (key: string, theme: string) => <ScreenTransition screenKey={key}>
    <div>Backdrop {theme}</div>
    <div>{key} content</div>
  </ScreenTransition>
  const errors = vi.spyOn(console, "error").mockImplementation(() => {})
  const { rerender } = render(layered("today", "dark"))
  for (const key of ["sleep", "mind", "practices", "today", "practices"]) {
    rerender(layered(key, "light"))
    await ready()
    finish()
    expect(screen.getByRole("main").textContent).toBe(`Backdrop light${key} content`)
  }
  expect(errors.mock.calls.filter((args) => args.some((arg) => String(arg).includes("same key")))).toEqual([])
  errors.mockRestore()
})

it("does not dirty prepared main attributes when playback starts", async () => {
  const { container, rerender } = render(view("today"))
  rerender(view("sleep"))
  const attributes = () => Array.from(container.querySelectorAll("main"), (el) => el.outerHTML.split(">")[0])
  const prepared = attributes()
  await ready()
  expect(wave.props.revealed).toBe(true)
  expect(attributes()).toEqual(prepared)
})

it("enforces the capture budget even when synchronous work starves timers", async () => {
  let time = 0
  const clock = vi.spyOn(performance, "now").mockImplementation(() => time)
  wave.prepare.mockImplementation(async () => { time = 1500 })
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  await ready()
  expect(wave.props.reducedMotion).toBe("always")
  expect(wave.props.revealed).toBe(true)
  clock.mockRestore()
})

it("reveals the live destination if playback never completes and skips later slow waves", async () => {
  vi.useFakeTimers()
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  await ready()
  expect(wave.props.revealed).toBe(true)
  // Simulate a renderer that prepared successfully but never calls onFinish.
  await act(async () => { vi.advanceTimersByTime(2500) })
  expect(screen.queryByTestId("wave")).toBeNull()
  expect(screen.getAllByRole("main", { hidden: true })).toHaveLength(1)
  expect(screen.getByRole("main").textContent).toBe("sleep")
  rerender(view("practices"))
  await ready()
  expect(screen.queryByTestId("wave")).toBeNull()
  expect(screen.getByRole("main").textContent).toBe("practices")
  await act(async () => { vi.advanceTimersByTime(5000) })
  expect(screen.getByRole("main").textContent).toBe("practices")
})
