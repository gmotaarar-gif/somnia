// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import type { DistortionWaveProps } from "distortion-waves"
import { ScreenTransition } from "./ScreenTransition"

// Exercise app lifecycle independently of WebGL; the package owns rendering
// and its no-WebGL crossfade. Retain both views until it reports completion.
const wave = vi.hoisted(() => ({ props: {} as DistortionWaveProps }))
vi.mock("distortion-waves", () => ({
  DistortionWave: (props: DistortionWaveProps) => {
    wave.props = props
    return <div onClickCapture={props.onClickCapture} onKeyDownCapture={props.onKeyDownCapture}>
      <div>{props.children}</div><div>{props.revealedContent}</div><aside>{props.overlay}</aside>
    </div>
  },
}))

let reduced = false
const listeners = new Set<() => void>()
beforeEach(() => {
  reduced = false
  listeners.clear()
  vi.stubGlobal("matchMedia", () => ({
    get matches() { return reduced },
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const view = (key: string) => <ScreenTransition screenKey={key}><button>{key}</button></ScreenTransition>
const finish = () => act(() => wave.props.onFinish?.(!!wave.props.revealed))

it("keeps only the latest destination interactive during rapid navigation", () => {
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  expect(screen.getByRole("main").textContent).toBe("sleep")
  expect(screen.getByText("today").closest("main")!.hasAttribute("inert")).toBe(true)
  rerender(view("mind"))
  rerender(view("practices"))
  expect(screen.getByRole("main").textContent).toBe("practices")
  expect(screen.getAllByRole("main", { hidden: true })).toHaveLength(2)
  finish()
  expect(screen.getAllByRole("main", { hidden: true })).toHaveLength(1)
})

it("can return to a screen that is still leaving without leaving it inert", () => {
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  rerender(view("today"))
  expect(screen.getByRole("main").hasAttribute("inert")).toBe(false)
  expect(screen.getByRole("main").textContent).toBe("today")
  finish()
  expect(screen.getAllByRole("main", { hidden: true })).toHaveLength(1)
})

it("does not remount a destination or reset its local state when the wave settles", () => {
  function Counter() {
    const [count, setCount] = useState(0)
    return <button onClick={() => setCount(count + 1)}>Count {count}</button>
  }
  const { rerender } = render(view("today"))
  rerender(<ScreenTransition screenKey="sleep"><Counter /></ScreenTransition>)
  fireEvent.click(screen.getByText("Count 0"))
  const button = screen.getByText("Count 1")
  finish()
  expect(screen.getByText("Count 1")).toBe(button)
})

it("retains the pressed dock control as source while a section loads, with a live overlay", () => {
  const dock = <nav><button>Sleep tab</button></nav>
  const { rerender } = render(<ScreenTransition screenKey="today" overlay={dock}>Today</ScreenTransition>)
  const trigger = screen.getByText("Sleep tab")
  fireEvent.click(trigger)
  rerender(<ScreenTransition screenKey="sleep" overlay={dock}>Sleep</ScreenTransition>)
  expect(wave.props.type).toBe("vertical")
  expect((wave.props.source as { current: Element }).current).toBe(trigger)
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
  expect((wave.props.source as { current: Element }).current).toBe(card)
})

it("honors live reduced-motion changes without resetting the current view", () => {
  render(view("today"))
  const button = screen.getByText("today")
  act(() => { reduced = true; listeners.forEach((notify) => notify()) })
  expect(wave.props.reducedMotion).toBe("always")
  expect(screen.getByText("today")).toBe(button)
})
