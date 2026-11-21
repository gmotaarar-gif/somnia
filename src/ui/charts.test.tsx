// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { Bars, Wave } from "./charts"
import { MoodTrend } from "./MoodTrend"

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it.each([{ values: [] }, { values: [5] }, { values: [4, 7, 6] }])("renders charts safely with $values", ({ values }) => {
  const { container } = render(<><Wave values={values} /><Bars values={values} /><MoodTrend days={values.map((value, i) => ({ key: String(i), label: String(i), value }))} /></>)
  expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
})
