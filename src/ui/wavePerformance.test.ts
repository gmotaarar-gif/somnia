// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { probeWavePerformance } from "./wavePerformance"

let worker: {
  onmessage: ((event: MessageEvent) => void) | null
  onerror: (() => void) | null
  onmessageerror: (() => void) | null
  postMessage: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.useFakeTimers()
  worker = { onmessage: null, onerror: null, onmessageerror: null, postMessage: vi.fn(), terminate: vi.fn() }
  vi.stubGlobal("Worker", vi.fn(function () { return worker }))
  vi.stubGlobal("OffscreenCanvas", class {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it("enables the renderer only after a positive worker result and releases the probe", () => {
  const report = vi.fn()
  const stop = probeWavePerformance(report)
  expect(report).not.toHaveBeenCalled()
  expect(worker.postMessage).toHaveBeenCalledOnce()
  worker.onmessage!(new MessageEvent("message", { data: true }))
  expect(report).toHaveBeenCalledExactlyOnceWith(true)
  expect(worker.terminate).toHaveBeenCalledOnce()
  stop()
  vi.runAllTimers()
  expect(report).toHaveBeenCalledTimes(1)
  expect(worker.terminate).toHaveBeenCalledOnce()
})

it("keeps a blocked probe off the navigation path and ignores its late result", () => {
  const report = vi.fn()
  probeWavePerformance(report)
  vi.advanceTimersByTime(249)
  expect(report).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(report).toHaveBeenCalledExactlyOnceWith(false)
  expect(worker.terminate).toHaveBeenCalledOnce()
  worker.onmessage!(new MessageEvent("message", { data: true }))
  expect(report).toHaveBeenCalledTimes(1)
})

it("treats unavailable worker graphics and worker startup errors as ordinary navigation", () => {
  const report = vi.fn()
  vi.stubGlobal("OffscreenCanvas", undefined)
  probeWavePerformance(report)
  expect(report).toHaveBeenCalledExactlyOnceWith(false)
  expect(Worker).not.toHaveBeenCalled()
  vi.stubGlobal("OffscreenCanvas", class {})
  vi.stubGlobal("Worker", vi.fn(function () { throw new Error("CSP blocked worker") }))
  probeWavePerformance(report)
  expect(report.mock.calls).toEqual([[false], [false]])
})

it("fails closed on worker errors and malformed results", () => {
  for (const fail of [
    () => worker.onerror!(),
    () => worker.onmessageerror!(),
    () => worker.onmessage!(new MessageEvent("message", { data: "true" })),
    () => worker.onmessage!(new MessageEvent("message", { data: false })),
  ]) {
    const report = vi.fn()
    probeWavePerformance(report)
    fail()
    expect(report).toHaveBeenCalledExactlyOnceWith(false)
  }
})

it("cancels work on unmount without updating the abandoned screen", () => {
  const report = vi.fn()
  const stop = probeWavePerformance(report)
  stop()
  worker.onmessage!(new MessageEvent("message", { data: true }))
  vi.runAllTimers()
  expect(report).not.toHaveBeenCalled()
  expect(worker.terminate).toHaveBeenCalledOnce()
})
