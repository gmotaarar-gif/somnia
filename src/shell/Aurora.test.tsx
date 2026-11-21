// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Aurora } from "./Aurora"

vi.mock("@/ui/wavePerformance", () => ({ useWavePerformance: () => false }))
vi.mock("@/ui/MotionProvider", () => ({ usePrefersReducedMotion: () => false }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it("uses the CSS backdrop without compiling WebGL shaders on slow/unverified graphics", () => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
  const { container, rerender } = render(<Aurora tab="today" theme="light" snapshot />)
  for (const tab of ["sleep", "mind", "practices"]) {
    rerender(<Aurora tab={tab} theme="dark" snapshot />)
    expect(container.querySelector(".aurora")?.getAttribute("data-tab")).toBe(tab)
    expect(container.querySelector("[data-webgl]")).toBeNull()
    expect(container.querySelectorAll(".aurora-blob")).toHaveLength(3)
  }
  expect(context).not.toHaveBeenCalled()
})
