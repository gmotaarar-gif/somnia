// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { StoreProvider } from "@/store/store"
import { SubscriptionProvider } from "@/store/subscription"
import { MindScreen } from "./Mind"

vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => true,
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it("shows a check-in's note next to its tags in the diary", () => {
  localStorage.setItem("somna-state-v6", JSON.stringify({
    layout: 2,
    moods: [{ id: "m1", at: new Date().toISOString(), valence: 0.4, emotions: ["Радость"], factors: ["Прогулка"], note: "прогулка помогла" }],
  }))
  render(<StoreProvider><SubscriptionProvider><MindScreen /></SubscriptionProvider></StoreProvider>)

  const entry = screen.getByRole("button", { name: /Радость · Прогулка/ })
  expect(entry.textContent).toContain("прогулка помогла")
  expect(entry.getAttribute("aria-expanded")).toBe("false")

  fireEvent.click(entry)

  expect(entry.getAttribute("aria-expanded")).toBe("true")
})
