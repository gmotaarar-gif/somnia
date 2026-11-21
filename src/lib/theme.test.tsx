// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { applyTheme, isThemeMode, THEME_BG, useResolvedTheme } from "@/lib/theme"

afterEach(() => vi.unstubAllGlobals())

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
