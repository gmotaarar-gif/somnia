// @vitest-environment jsdom

import { Profiler } from "react"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { StoreProvider, type WidgetKind } from "@/store/store"
import { WidgetTile } from "./Widget"

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it.each(["sleep", "week", "energy", "rhythm", "debt"] as WidgetKind[])("shows an empty state for the %s widget", (kind) => {
  render(<StoreProvider><WidgetTile widget={{ id: kind, kind, size: "1x1", tone: "plum", visible: true }} /></StoreProvider>)
  expect(screen.getByText("Пока нет данных. Запишите сон.")).toBeTruthy()
})

it.each(["1x1", "2x1"] as const)("renders missing mood and wellbeing as plain dashes without units (%s)", (size) => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  render(<StoreProvider>{(["mood", "wellbeing"] as const).map((kind) => <WidgetTile key={kind} widget={{ id: kind, kind, size, tone: "plum", visible: true }} />)}</StoreProvider>)
  expect(screen.getAllByText("—", { exact: true })).toHaveLength(2)
  expect(screen.queryByRole("img", { name: "--" })).toBeNull()
  expect(screen.queryByText("/ 100")).toBeNull()
})

it("only updates the time-dependent widget on a wall-clock tick", () => {
  vi.useFakeTimers()
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const commits: Record<string, number> = { streak: 0, sleep: 0, water: 0, evening: 0 }
  render(
    <StoreProvider>
      {Object.keys(commits).map((kind) => (
        <Profiler key={kind} id={kind} onRender={(id) => { commits[id]++ }}>
          <WidgetTile widget={{ id: kind, kind: kind as WidgetKind, size: "1x1", tone: "plum", visible: true }} />
        </Profiler>
      ))}
    </StoreProvider>
  )
  for (const kind of Object.keys(commits)) commits[kind] = 0
  act(() => vi.advanceTimersByTime(30_000))
  console.log("30s widget commits:", JSON.stringify(commits))
  expect(commits).toEqual({ streak: 0, sleep: 0, water: 0, evening: 1 })
})
