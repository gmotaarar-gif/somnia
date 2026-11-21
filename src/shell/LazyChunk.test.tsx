// @vitest-environment jsdom

import { Suspense } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Deferred } from "./Deferred"
import { lazyWithRetry, loadWithRetry } from "./LazyChunk"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

it("recovers a transient import failure automatically", async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue("Loaded")
  await expect(loadWithRetry(load)).resolves.toBe("Loaded")
  expect(load).toHaveBeenCalledTimes(2)
})

it("keeps the shell mounted after repeated failure and retries with a fresh lazy component", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  const onLoadError = vi.fn()
  const load = vi.fn()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValue({ default: () => <div>Recovered workspace</div> })
  const Content = lazyWithRetry(load)
  render(<><header>App shell</header><Suspense fallback={null}><Content onLoadError={onLoadError} /></Suspense></>)

  expect(await screen.findByRole("alert")).toBeTruthy()
  expect(screen.getByRole("alert").parentElement).toBe(document.body)
  expect(screen.getByRole("alert").classList.contains("bg-sheet")).toBe(true)
  expect(screen.getByRole("alert").classList.contains("z-[100]")).toBe(true)
  expect(screen.getByRole("alert").classList.contains("glass")).toBe(false)
  expect(screen.getByText("App shell")).toBeTruthy()
  expect(onLoadError).toHaveBeenCalledTimes(1)
  expect(load).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }))
  expect(await screen.findByText("Recovered workspace")).toBeTruthy()
  expect(load).toHaveBeenCalledTimes(3)
  expect(screen.queryByRole("alert")).toBeNull()
})

it("contains a rejected sheet import without unmounting the current screen", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  const load = vi.fn().mockRejectedValue(new Error("Stale chunk"))
  const Sheet = lazyWithRetry(load)
  const { rerender } = render(<><main>Current screen</main><Deferred active={false}><Sheet /></Deferred></>)
  expect(load).not.toHaveBeenCalled()
  rerender(<><main>Current screen</main><Deferred active><Sheet /></Deferred></>)
  expect(await screen.findByRole("alert")).toBeTruthy()
  expect(screen.getByText("Current screen")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Обновить" })).toBeTruthy()
  expect(load).toHaveBeenCalledTimes(2)
})

it("blames saved data, not the connection, when a loaded screen crashes", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  const onLoadError = vi.fn()
  const Crashing = lazyWithRetry(async () => ({ default: () => { throw new TypeError("Cannot read properties of null") } }))
  localStorage.setItem("somna-state-v6", "{\"nights\":[1]}")
  render(<Suspense fallback={null}><Crashing onLoadError={onLoadError} /></Suspense>)

  const alert = await screen.findByRole("alert")
  expect(alert.textContent).toContain("сохранённые данные повреждены")
  expect(alert.textContent).not.toContain("подключение")
  expect(screen.queryByRole("button", { name: "Повторить" })).toBeNull()
  expect(onLoadError).toHaveBeenCalledTimes(1)

  // Starting over asks twice and keeps a backup of what it removes.
  fireEvent.click(screen.getByRole("button", { name: "Начать заново" }))
  expect(localStorage.getItem("somna-state-v6")).toBe("{\"nights\":[1]}")
  fireEvent.click(screen.getByRole("button", { name: "Удалить и начать" }))
  expect(localStorage.getItem("somna-state-v6")).toBeNull()
  expect(localStorage.getItem("somna-state-v6-backup")).toBe("{\"nights\":[1]}")
})
