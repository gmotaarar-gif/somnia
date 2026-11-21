// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from "vitest"
import type { CaptureRequest, SnapshotOptions } from "distortion-waves"
import { createWaveCapture } from "./waveCapture"

const picture = vi.hoisted(() => ({ snapshot: vi.fn() }))
vi.mock("distortion-waves", () => ({ snapshot: picture.snapshot }))

beforeEach(() => {
  picture.snapshot.mockReset().mockImplementation(async () => ({ canvas: document.createElement("canvas") }))
})

function fixture() {
  const element = document.createElement("div")
  element.innerHTML = '<div data-dw-layer="content"><main>Today</main></div><div data-dw-layer="revealed"><main>Sleep</main></div><aside data-dw-skip>Live dock</aside>'
  return { element, slot: "content", width: 393, height: 781, scale: 1, background: "#080809", ignore: () => false } satisfies CaptureRequest
}

it("reuses prepared DOM pixels when an animation or focus invalidates a texture", async () => {
  const request = fixture()
  const pictures = createWaveCapture()
  const first = await pictures.capture(request)
  request.element.querySelector("main")!.textContent = "Live content changed during the wave"
  expect(await pictures.capture(request)).toBe(first)
  expect(picture.snapshot).toHaveBeenCalledTimes(1)
  // A later navigation must take a new picture, including changes since then.
  expect(await createWaveCapture().capture(request)).not.toBe(first)
  expect(picture.snapshot).toHaveBeenCalledTimes(2)
})

it("seeds both real scenes before playback even if the controller reused a fresh slot", async () => {
  const request = fixture()
  const pictures = createWaveCapture()
  await pictures.capture(request)
  await pictures.prepare()
  expect(picture.snapshot).toHaveBeenCalledTimes(2)
  const captured = picture.snapshot.mock.calls.map(([root]) => root.textContent)
  expect(captured).toEqual(["Today", "Sleep"])
  await pictures.capture({ ...request, slot: "revealed" })
  expect(picture.snapshot).toHaveBeenCalledTimes(2)
  const [scene, options] = picture.snapshot.mock.calls[0] as [HTMLElement, SnapshotOptions]
  expect(options.force!(scene)).toMatchObject({ opacity: "1", left: "0", top: "0" })
  expect(scene.querySelector("aside")).toBeNull()
})

it("takes a new picture for changed geometry instead of stretching an old texture", async () => {
  const request = fixture()
  const pictures = createWaveCapture()
  const first = await pictures.capture(request)
  expect(await pictures.capture({ ...request, width: 500 })).not.toBe(first)
  expect(picture.snapshot).toHaveBeenCalledTimes(2)
})

it("does not capture unnecessarily before WebGL requested a picture", async () => {
  await createWaveCapture().prepare()
  expect(picture.snapshot).not.toHaveBeenCalled()
})
