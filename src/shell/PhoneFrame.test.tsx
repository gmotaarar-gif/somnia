// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react"
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
