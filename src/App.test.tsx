// @vitest-environment jsdom

import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import App from "./App"

vi.mock("@/shell/PhoneFrame", () => ({ PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock("@/shell/Aurora", () => ({ Aurora: () => <div data-testid="aurora" /> }))
vi.mock("@/shell/Island", () => ({ Island: () => <div data-testid="island" /> }))
vi.mock("@/shell/Splash", () => ({ Splash: () => <div data-testid="splash" /> }))
vi.mock("@/screens/Onboarding", async () => {
  const { useStore } = await import("@/store/store")
  return {
    Onboarding: () => {
      const { finishOnboarding } = useStore()
      return <button onClick={() => finishOnboarding({})}>Finish onboarding</button>
    },
  }
})
vi.mock("@/shell/Workspace", () => ({ default: () => <div>Workspace</div> }))

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it("keeps the shell visible while loading onboarding for empty storage", async () => {
  render(<App />)

  expect(screen.getByTestId("aurora")).toBeTruthy()
  expect(screen.getByTestId("island")).toBeTruthy()
  expect(screen.getByTestId("splash")).toBeTruthy()
  expect(await screen.findByText("Finish onboarding")).toBeTruthy()
  expect(screen.queryByText("Workspace")).toBeNull()

  fireEvent.click(screen.getByText("Finish onboarding"))
  expect(await screen.findByText("Workspace")).toBeTruthy()
  expect(screen.queryByText("Finish onboarding")).toBeNull()
})

it("loads the workspace directly for returning users", async () => {
  localStorage.setItem("somna-state-v6", JSON.stringify({ onboarded: true }))
  render(<App />)

  expect(await screen.findByText("Workspace")).toBeTruthy()
  expect(screen.queryByText("Finish onboarding")).toBeNull()
})

it("loads onboarding when stored data is corrupt", async () => {
  localStorage.setItem("somna-state-v6", "{invalid")
  render(<App />)

  expect(await screen.findByText("Finish onboarding")).toBeTruthy()
  expect(screen.queryByText("Workspace")).toBeNull()
})
