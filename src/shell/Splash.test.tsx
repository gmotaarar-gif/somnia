// @vitest-environment jsdom

import type { ReactNode } from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Splash } from "./Splash"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    span: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  },
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it("keeps the existing splash until delayed content has committed", () => {
  vi.useFakeTimers()
  vi.stubGlobal("matchMedia", () => ({ matches: false }))
  const { container, rerender } = render(<Splash ready={false} />)
  act(() => vi.advanceTimersByTime(3000))
  expect(container.textContent).toBe("Somna")
  rerender(<Splash ready />)
  expect(container.textContent).toBe("")
})

it("keeps the original minimum splash duration for fast loads", () => {
  vi.useFakeTimers()
  vi.stubGlobal("matchMedia", () => ({ matches: false }))
  const { container } = render(<Splash ready />)
  act(() => vi.advanceTimersByTime(1699))
  expect(container.textContent).toBe("Somna")
  act(() => vi.advanceTimersByTime(1))
  expect(container.textContent).toBe("")
})

it("does not introduce a splash for reduced-motion users", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }))
  const { container } = render(<Splash ready={false} />)
  expect(container.textContent).toBe("")
})
