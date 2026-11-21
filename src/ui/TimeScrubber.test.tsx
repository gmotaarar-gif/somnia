// @vitest-environment jsdom

import { useState } from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { TimeScrubber } from "@/ui/TimeScrubber"

beforeEach(() => {
  // Reduced motion makes the ruler land at once, so no animation frames are needed.
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Host({ initial, onChange }: { initial: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <TimeScrubber label="Отбой" value={value} onChange={(v) => { setValue(v); onChange?.(v) }} />
      <button onClick={() => setValue("07:30")}>preset</button>
    </>
  )
}

it("steps with the arrow keys and wraps past midnight", () => {
  const onChange = vi.fn()
  render(<Host initial="23:55" onChange={onChange} />)
  const ruler = screen.getByRole("slider", { name: "Отбой" })
  fireEvent.keyDown(ruler, { key: "ArrowRight" })
  expect(onChange).toHaveBeenLastCalledWith("00:00")
  expect(ruler.getAttribute("aria-valuetext")).toBe("00:00")
  fireEvent.keyDown(ruler, { key: "ArrowLeft" })
  fireEvent.keyDown(ruler, { key: "ArrowLeft" })
  expect(onChange).toHaveBeenLastCalledWith("23:50")
})

it("follows a value set from outside without reporting it back", () => {
  const onChange = vi.fn()
  render(<Host initial="23:30" onChange={onChange} />)
  fireEvent.click(screen.getByText("preset"))
  expect(screen.getByRole("slider", { name: "Отбой" }).getAttribute("aria-valuetext")).toBe("07:30")
  expect(onChange).not.toHaveBeenCalled()
})

it("reports the snapped time when the value starts between steps", () => {
  const onChange = vi.fn()
  render(<Host initial="23:32" onChange={onChange} />)
  const ruler = screen.getByRole("slider", { name: "Отбой" })
  fireEvent.pointerDown(ruler, { clientX: 100 })
  fireEvent.pointerUp(ruler, { clientX: 100 })
  expect(ruler.getAttribute("aria-valuetext")).toBe("23:30")
  expect(onChange).toHaveBeenLastCalledWith("23:30")
})

it("does not report the times it passes while turning to an outside value", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.useFakeTimers()
  try {
    const onChange = vi.fn()
    render(<Host initial="23:30" onChange={onChange} />)
    fireEvent.click(screen.getByText("preset"))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.getByRole("slider", { name: "Отбой" }).getAttribute("aria-valuetext")).toBe("07:30")
    expect(onChange).not.toHaveBeenCalled()
  } finally {
    vi.useRealTimers()
  }
})
