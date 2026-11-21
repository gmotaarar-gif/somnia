// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Mascot, mascotState } from "./Mascot"

vi.mock("bot-avatars", () => ({ BotAvatar: (props: Record<string, unknown>) => <span data-testid="avatar">{JSON.stringify(props)}</span> }))
vi.mock("@/store/store", () => ({ useStore: () => ({ nightMode: false, sheet: null }) }))
vi.mock("@/store/derived", () => ({ useNow: () => new Date(2026, 0, 1, 12) }))
afterEach(cleanup)

it.each([
  [false, false, 12, "default"],
  [true, false, 12, "sleeping"],
  [true, true, 12, "sleeping"],
  [false, true, 12, "working"],
  [false, true, 23, "working"],
  [false, false, 23, "sleeping"],
  [false, false, 5, "sleeping"],
  [false, false, 6, "default"],
])("derives night=%s active=%s hour=%s as %s", (night, active, hour, expected) => {
  expect(mascotState(night, active, hour)).toBe(expected)
})

it("uses a palette-matched cloud with automatic theme for an empty/default session", () => {
  render(<Mascot />)
  expect(JSON.parse(screen.getByTestId("avatar").textContent!)).toMatchObject({ type: "cloud", theme: "auto", state: "default", size: 64, interactive: false })
})

it("responds when a timer starts and pauses", () => {
  const { rerender } = render(<Mascot active />)
  expect(screen.getByTestId("avatar").textContent).toContain('"state":"working"')
  rerender(<Mascot active={false} />)
  expect(screen.getByTestId("avatar").textContent).toContain('"state":"default"')
})
