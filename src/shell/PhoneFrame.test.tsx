// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { Capacitor } from "@capacitor/core"
import { afterEach, expect, it, vi } from "vitest"
import { PhoneFrame } from "./PhoneFrame"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it("never renders a device mock-up on native, even without matchMedia", () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true)
  vi.stubGlobal("matchMedia", undefined)
  const { container } = render(<PhoneFrame tab="today"><span>Native content</span></PhoneFrame>)
  expect(container.querySelector(".stage")).toBeNull()
  expect(container.querySelector(".phone-screen")?.hasAttribute("data-framed")).toBe(false)
})

it.each([true, false])("preserves browser media query framing: %s", matches => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false)
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  const { container } = render(<PhoneFrame tab="today">Browser content</PhoneFrame>)
  expect(Boolean(container.querySelector(".stage"))).toBe(matches)
})

it("preserves the active screen and local edits across the desktop breakpoint", () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false)
  let framed = true
  const listeners = new Set<() => void>()
  vi.stubGlobal("matchMedia", () => ({
    get matches() { return framed },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))
  function Screen() {
    const [text, setText] = useState("Today")
    return <button onClick={() => setText("Practices draft")}>{text}</button>
  }
  const { container } = render(<PhoneFrame tab="practices"><Screen /></PhoneFrame>)
  fireEvent.click(screen.getByRole("button"))
  const activeScreen = container.querySelector(".phone-screen")
  for (const next of [false, true]) {
    act(() => { framed = next; listeners.forEach((listener) => listener()) })
    expect(screen.getByRole("button").textContent).toBe("Practices draft")
    expect(container.querySelector(".phone-screen")).toBe(activeScreen)
  }
})
