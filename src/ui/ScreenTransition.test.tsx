// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import type { WaveOptions } from "distortion-waves"
import { ScreenTransition } from "./ScreenTransition"

// The package owns rendering, pictures and its reduced-motion crossfade.
// Exercise how the app binds its engine to the two screen layers.
const engine = vi.hoisted(() => {
  class Wave {
    options: WaveOptions = {}
    seen = ""
    update = vi.fn((options: WaveOptions) => { this.options = options })
    play = vi.fn((_: { source: Element | null }) => { this.seen = this.root.textContent ?? "" })
    reverse = vi.fn()
    reset = vi.fn()
    destroy = vi.fn()
    constructor(readonly root: HTMLElement, readonly content: HTMLElement, readonly revealed: HTMLElement | null) {
      state.made.push(this)
    }
    get debug() { return { content: state.picture, ...state.run } }
  }
  const state = {
    Wave, made: [] as Wave[], picture: { count: 0, walk: 0, raster: 0 },
    // How far the running wave is, and where it clears; unset once it has.
    run: {} as { progress?: number; clearAt?: number },
  }
  return state
})
vi.mock("distortion-waves", () => ({ WaveController: engine.Wave }))

beforeEach(() => {
  engine.made.length = 0
  engine.picture = { count: 0, walk: 0, raster: 0 }
  engine.run = {}
})
afterEach(cleanup)

const view = (key: string) => <ScreenTransition screenKey={key}><button>{key}</button></ScreenTransition>
const latest = () => engine.made[engine.made.length - 1]
const finish = () => act(() => latest().options.onFinish?.(true))
const screens = () => screen.getAllByRole("main").map((main) => main.textContent)

it("binds one engine from the showing layer to the empty one, with the overlay out of its picture", () => {
  render(<ScreenTransition screenKey="today" overlay={<nav>Dock</nav>}>Today</ScreenTransition>)
  expect(engine.made).toHaveLength(1)
  expect(latest().content.textContent).toBe("Today")
  expect(latest().revealed!.textContent).toBe("")
  expect(latest().options).toMatchObject({ type: "vertical", palette: "colorful", capture: true })
  expect(latest().play).not.toHaveBeenCalled()
  expect(screen.getByText("Dock").parentElement!.hasAttribute("data-dw-skip")).toBe(true)
  expect(latest().root.contains(screen.getByText("Dock"))).toBe(true)
})

it("sends the wave up from the pressed dock tab and keeps the dock live", () => {
  const dock = <nav><button>Sleep tab</button></nav>
  const { rerender } = render(<ScreenTransition screenKey="today" overlay={dock}>Today</ScreenTransition>)
  const trigger = screen.getByText("Sleep tab")
  fireEvent.click(trigger)
  rerender(<ScreenTransition screenKey="sleep" overlay={dock}>Sleep</ScreenTransition>)
  expect(engine.made).toHaveLength(1)
  expect(latest().options.type).toBe("vertical")
  expect(latest().play).toHaveBeenCalledTimes(1)
  expect(latest().play).toHaveBeenCalledWith({ source: trigger })
  expect(latest().content.textContent).toBe("Today")
  expect(latest().revealed!.textContent).toBe("Sleep")
  expect(screen.getByText("Sleep tab")).toBe(trigger)
})

it("sends a ring out of a card activated from the keyboard", () => {
  const { rerender } = render(<ScreenTransition screenKey="today"><div role="button" tabIndex={0}>Open sleep</div></ScreenTransition>)
  const card = screen.getByRole("button")
  fireEvent.keyDown(card, { key: "Enter" })
  rerender(view("sleep"))
  expect(latest().options.type).toBe("center")
  expect(latest().play).toHaveBeenCalledWith({ source: card })
})

it("falls back to the engine's own source when nothing in it was pressed", () => {
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  expect(latest().options.type).toBe("vertical")
  expect(latest().play).toHaveBeenCalledWith({ source: null })
})

it("leaves only after the arriving screen has drawn what its mount effects changed", () => {
  function Late() {
    const [text, setText] = useState("loading")
    useEffect(() => setText("drawn"), [])
    return text
  }
  const { rerender } = render(view("today"))
  rerender(<ScreenTransition screenKey="sleep"><Late /></ScreenTransition>)
  expect(latest().play).toHaveBeenCalledTimes(1)
  expect(latest().seen).toBe("todaydrawn")
})

it("does not remount the arriving screen when the wave settles, and turns the engine round", () => {
  function Counter() {
    const [count, setCount] = useState(0)
    return <button onClick={() => setCount(count + 1)}>Count {count}</button>
  }
  const { rerender } = render(view("today"))
  rerender(<ScreenTransition screenKey="sleep"><Counter /></ScreenTransition>)
  expect(screens()).toEqual(["today", "Count 0"])
  fireEvent.click(screen.getByText("Count 0"))
  const button = screen.getByText("Count 1")
  const first = latest()
  finish()
  expect(screen.getByText("Count 1")).toBe(button)
  expect(screens()).toEqual(["Count 1"])
  expect(first.destroy).toHaveBeenCalledTimes(1)
  expect(engine.made).toHaveLength(2)
  expect(latest().content).toBe(first.revealed)
  expect(latest().revealed).toBe(first.content)
  expect(latest().play).not.toHaveBeenCalled()
})

it("always leaves forward from the screen on show, never back into its source", () => {
  const { rerender } = render(view("today"))
  for (const [from, to] of [["today", "sleep"], ["sleep", "mind"], ["mind", "practices"], ["practices", "today"]]) {
    rerender(view(to))
    expect(latest().content.textContent).toBe(from)
    expect(latest().revealed!.textContent).toBe(to)
    expect(latest().play).toHaveBeenCalledTimes(1)
    finish()
    expect(screens()).toEqual([to])
  }
  expect(engine.made.some((wave) => wave.reverse.mock.calls.length > 0)).toBe(false)
})

it("carries on from the arriving screen when another is asked for mid-wave", () => {
  const { rerender } = render(view("today"))
  rerender(view("sleep"))
  const first = latest()
  rerender(view("mind"))
  expect(first.destroy).toHaveBeenCalledTimes(1)
  expect(latest()).not.toBe(first)
  expect(latest().content.textContent).toBe("sleep")
  expect(latest().revealed!.textContent).toBe("mind")
  expect(latest().play).toHaveBeenCalledTimes(1)
  expect(screen.queryByText("today")).toBeNull()
  // The wave that was cut short can no longer settle anything.
  act(() => first.options.onFinish?.(true))
  expect(screens()).toHaveLength(2)
  finish()
  expect(screens()).toEqual(["mind"])
})

it("returns to a screen that is still leaving without remounting it", () => {
  const { rerender } = render(view("today"))
  const today = screen.getByText("today")
  rerender(view("sleep"))
  rerender(view("today"))
  expect(screen.getByText("today")).toBe(today)
  expect(latest().content.textContent).toBe("sleep")
  expect(latest().revealed!.textContent).toBe("today")
  finish()
  expect(screens()).toEqual(["today"])
  expect(screen.getByText("today")).toBe(today)
})

it("leaves from the screen still on show when another is asked for as the wave gathers", () => {
  const { rerender } = render(view("today"))
  const today = screen.getByText("today")
  rerender(view("sleep"))
  const first = latest()
  engine.run = { progress: 0.1, clearAt: 0.4 }
  rerender(view("mind"))
  expect(latest()).toBe(first)
  expect(first.destroy).not.toHaveBeenCalled()
  expect(first.play).toHaveBeenCalledTimes(2)
  expect(screens()).toEqual(["today", "mind"])
  expect(screen.getByText("today")).toBe(today)
  expect(first.content.textContent).toBe("today")
  expect(first.revealed!.textContent).toBe("mind")
  finish()
  expect(screens()).toEqual(["mind"])
})

it("stays on a screen asked for again as the wave gathers", () => {
  const { rerender } = render(view("today"))
  const today = screen.getByText("today")
  rerender(view("sleep"))
  const first = latest()
  engine.run = { progress: 0.1, clearAt: 0.4 }
  rerender(view("today"))
  expect(screens()).toEqual(["today"])
  expect(screen.getByText("today")).toBe(today)
  expect(latest()).toBe(first)
  expect(first.reset).toHaveBeenCalledTimes(1)
  expect(first.play).toHaveBeenCalledTimes(1)
  // The wave that was called off can no longer settle anything.
  act(() => first.options.onFinish?.(true))
  expect(screens()).toEqual(["today"])
  engine.run = {}
  rerender(view("sleep"))
  expect(first.play).toHaveBeenCalledTimes(2)
  expect(screens()).toEqual(["today", "sleep"])
})

it("shows the arriving screen at rest instead of its entrance frame", () => {
  const { rerender } = render(view("today"))
  rerender(<ScreenTransition screenKey="sleep">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>Sleep chart</motion.div>
  </ScreenTransition>)
  expect(screen.getByText("Sleep chart").style.opacity).toBe("1")
})

it("keeps a multi-layer screen current after theme updates and repeated navigation", () => {
  const layered = (key: string, theme: string) => <ScreenTransition screenKey={key}>
    <div>Backdrop {theme}</div>
    <div>{key} content</div>
  </ScreenTransition>
  const errors = vi.spyOn(console, "error").mockImplementation(() => {})
  const { rerender } = render(layered("today", "dark"))
  for (const key of ["sleep", "mind", "practices", "today", "practices"]) {
    rerender(layered(key, "light"))
    finish()
    expect(screens()).toEqual([`Backdrop light${key} content`])
  }
  expect(errors.mock.calls.filter((args) => args.some((arg) => String(arg).includes("same key")))).toEqual([])
  errors.mockRestore()
})

it("runs on colour alone after two slow pictures running, then tries the lens again", () => {
  const { rerender } = render(view("today"))
  const keys = ["sleep", "mind", "practices", "today"]
  let at = 0
  // The lens setting a wave leaves with; the next engine starts from the same.
  const leave = () => {
    rerender(view(keys[at++ % keys.length]))
    const { capture } = latest().options
    expect(latest().play).toHaveBeenCalledTimes(1)
    finish()
    expect(latest().options.capture).toBe(capture)
    return capture
  }
  // The first picture of a session also fills caches, and is allowed longer.
  engine.picture = { count: 1, walk: 250, raster: 150 }
  expect(leave()).toBe(true)
  // One slow picture is a busy moment.
  expect(leave()).toBe(true)
  engine.picture = { count: 1, walk: 60, raster: 40 }
  expect(leave()).toBe(true)
  // Two running is a slow device.
  engine.picture = { count: 1, walk: 250, raster: 150 }
  expect(leave()).toBe(true)
  expect(leave()).toBe(false)
  // Colour alone takes no pictures; after a rest the lens gets another go.
  engine.picture = { count: 0, walk: 0, raster: 0 }
  for (let i = 0; i < 5; i++) expect(leave()).toBe(false)
  expect(leave()).toBe(true)
  // Still slow: off again at once, and for longer.
  engine.picture = { count: 1, walk: 250, raster: 150 }
  expect(leave()).toBe(false)
  engine.picture = { count: 0, walk: 0, raster: 0 }
  for (let i = 0; i < 11; i++) expect(leave()).toBe(false)
  expect(leave()).toBe(true)
  // Quick this time: the lens stays.
  engine.picture = { count: 1, walk: 60, raster: 40 }
  expect(leave()).toBe(true)
  expect(leave()).toBe(true)
})

it("releases the engine with the screens", () => {
  const { unmount } = render(view("today"))
  const wave = latest()
  unmount()
  expect(wave.destroy).toHaveBeenCalledTimes(1)
})
