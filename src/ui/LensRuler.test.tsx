// @vitest-environment jsdom

import { useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { LensRuler } from "@/ui/LensRuler"

beforeEach(() => {
  // Reduced motion makes the strip land at once, so no animation frames are needed.
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Host({ onChange }: { onChange: (v: number) => void }) {
  const [value, setValue] = useState(7.5)
  return (
    <>
      <LensRuler label="Часы" min={4} max={10} step={0.5} value={value} onChange={(v) => { setValue(v); onChange(v) }} />
      <button onClick={() => setValue(6)}>preset</button>
    </>
  )
}

it("moves by a step with the arrows and stops at both ends", () => {
  const onChange = vi.fn()
  render(<Host onChange={onChange} />)
  const ruler = screen.getByRole("slider", { name: "Часы" })
  fireEvent.keyDown(ruler, { key: "ArrowRight" })
  expect(onChange).toHaveBeenLastCalledWith(8)
  fireEvent.keyDown(ruler, { key: "End" })
  fireEvent.keyDown(ruler, { key: "ArrowRight" })
  expect(onChange).toHaveBeenLastCalledWith(10)
  fireEvent.keyDown(ruler, { key: "Home" })
  expect(onChange).toHaveBeenLastCalledWith(4)
  expect(ruler.getAttribute("aria-valuenow")).toBe("4")
})

it("follows a value set from outside without reporting it back", () => {
  const onChange = vi.fn()
  render(<Host onChange={onChange} />)
  fireEvent.click(screen.getByText("preset"))
  expect(screen.getByRole("slider", { name: "Часы" }).getAttribute("aria-valuenow")).toBe("6")
  expect(onChange).not.toHaveBeenCalled()
})
