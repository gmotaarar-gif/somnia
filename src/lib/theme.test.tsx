// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { applyTheme, isThemeMode, THEME_BG, useResolvedTheme } from "@/lib/theme"

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const stubSystem = (light: boolean) =>
  vi.stubGlobal("matchMedia", () => ({ matches: light, addEventListener() {}, removeEventListener() {} }))

it("follows the device setting only in system mode", () => {
  stubSystem(true)
  expect(renderHook(() => useResolvedTheme("system")).result.current).toBe("light")
  expect(renderHook(() => useResolvedTheme("dark")).result.current).toBe("dark")
  stubSystem(false)
  expect(renderHook(() => useResolvedTheme("system")).result.current).toBe("dark")
  expect(renderHook(() => useResolvedTheme("light")).result.current).toBe("light")
})

it("applies the theme to the document and browser chrome", () => {
  document.head.innerHTML = '<meta name="theme-color" content=""><meta name="color-scheme" content="">'
  applyTheme("light")
  expect(document.documentElement.dataset.theme).toBe("light")
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(THEME_BG.light)
  expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute("content")).toBe("light")
})

it("rejects unknown saved modes", () => {
  expect(isThemeMode("light")).toBe(true)
  expect(isThemeMode("sepia")).toBe(false)
})

it("updates system mode live, keeps explicit modes and unsubscribes", () => {
  let light = false
  const listeners = new Set<() => void>()
  vi.stubGlobal("matchMedia", () => ({
    get matches() { return light },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))
  const system = renderHook(() => useResolvedTheme("system"))
  const explicit = renderHook(() => useResolvedTheme("dark"))
  act(() => { light = true; listeners.forEach((listener) => listener()) })
  expect(system.result.current).toBe("light")
  expect(explicit.result.current).toBe("dark")
  system.unmount()
  explicit.unmount()
  expect(listeners.size).toBe(0)
})
