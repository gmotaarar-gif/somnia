import { useEffect, useState } from "react"

// No navigation waits for this. In particular, do not probe a renderer on the
// UI thread: shader compilation/texture upload can starve its fallback timer.
const PROBE_BUDGET = 250

export function probeWavePerformance(report: (ready: boolean) => void) {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    report(false)
    return () => {}
  }

  let worker: Worker
  try {
    worker = new Worker(new URL("./wavePerformance.worker.ts", import.meta.url), { type: "module" })
  } catch {
    report(false)
    return () => {}
  }

  let settled = false
  const dispose = () => {
    if (settled) return
    settled = true
    window.clearTimeout(timer)
    worker.terminate()
  }
  const finish = (ready: boolean) => {
    if (settled) return
    dispose()
    report(ready)
  }
  const timer = window.setTimeout(() => finish(false), PROBE_BUDGET)
  worker.onmessage = (event: MessageEvent<unknown>) => finish(event.data === true)
  worker.onerror = () => finish(false)
  worker.onmessageerror = () => finish(false)
  try {
    worker.postMessage({ width: Math.min(innerWidth, 480), height: Math.min(innerHeight, 1000) })
  } catch {
    finish(false)
  }
  return dispose
}

let performanceResult: Promise<boolean> | undefined

/** Share the conservative result across the wave and its WebGL backdrop.
 * A backdrop shader can stall presentation even without a wave canvas.
 */
export function useWavePerformance(enabled: boolean) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let current = true
    performanceResult ??= new Promise((resolve) => { probeWavePerformance(resolve) })
    void performanceResult.then((value) => { if (current) setReady(value) })
    return () => { current = false }
  }, [enabled])
  return enabled && ready
}
