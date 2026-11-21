// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it("keeps zero volume silent on start, live adjustment, and sound changes", async () => {
  vi.resetModules()
  vi.useFakeTimers()
  const param = () => ({ value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() })
  const master = { gain: param(), connect: vi.fn(), disconnect: vi.fn() }
  let gains = 0
  class AudioContextMock {
    currentTime = 10
    state = "running"
    destination = {}
    sampleRate = 10
    createGain() { return gains++ === 0 ? master : { ...master, gain: param() } }
    createOscillator() { return { frequency: param(), connect() {}, disconnect() {}, start() {}, stop() {} } }
    createBiquadFilter() { return { frequency: param(), Q: param(), connect() {}, disconnect() {} } }
    createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) } }
    createBufferSource() { return { connect() {}, disconnect() {}, start() {}, stop() {} } }
  }
  vi.stubGlobal("AudioContext", AudioContextMock)
  const { setSoundVolume, startSound, stopSound } = await import("./audio")
  setSoundVolume(0)
  startSound("drone")
  expect(master.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10)
  expect(master.gain.exponentialRampToValueAtTime).not.toHaveBeenCalled()

  setSoundVolume(0.5)
  expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.5, 10, 0.12)
  master.gain.cancelScheduledValues.mockClear()
  setSoundVolume(0)
  expect(master.gain.cancelScheduledValues).toHaveBeenCalledWith(10)
  expect(master.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10)

  for (const mode of ["pink", "rain"] as const) {
    startSound(mode)
    expect(master.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10)
    expect(master.gain.exponentialRampToValueAtTime).not.toHaveBeenCalled()
  }
  stopSound()
  expect(master.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10)
  vi.runAllTimers()
})
