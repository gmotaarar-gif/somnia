// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { startSound, stopSound } from "@/lib/audio"
import { StoreProvider, useStore } from "@/store/store"
import { SheetHost } from "./SheetHost"

const loading = vi.hoisted(() => {
  let reject!: (error: Error) => void
  const night = new Promise<never>((_, fail) => { reject = fail })
  return { night, reject }
})
vi.mock("@/shell/NightMode", async () => loading.night)
vi.mock("@/lib/audio", () => ({
  startSound: vi.fn(),
  stopSound: vi.fn(),
  setSoundVolume: vi.fn(),
}))

function Controls() {
  const { startNight, nightMode, nightStart, sheet } = useStore()
  return <>
    <main>Current screen</main>
    <button onClick={startNight}>Start night</button>
    <output>{JSON.stringify({ nightMode, nightStart, sheet })}</output>
  </>
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

it("stops night playback when its chunk fails without logging sleep or unmounting the screen", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  render(<StoreProvider><Controls /><SheetHost /></StoreProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Start night" }))
  expect(startSound).toHaveBeenCalledWith("pink")
  vi.mocked(stopSound).mockClear()

  await act(async () => loading.reject(new Error("Chunk unavailable")))

  expect(await screen.findByRole("alert")).toBeTruthy()
  expect(stopSound).toHaveBeenCalled()
  expect(screen.getByRole("status").textContent).toBe(JSON.stringify({ nightMode: false, nightStart: null, sheet: null }))
  expect(screen.getByText("Current screen")).toBeTruthy()
})
