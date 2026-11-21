// @vitest-environment jsdom

import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import App from "./App"

vi.mock("@/shell/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
  useScreenEl: () => null,
}))
vi.mock("@/shell/Aurora", () => ({ Aurora: () => <div data-testid="aurora" /> }))
vi.mock("@/shell/Island", () => ({ Island: () => <div data-testid="island" /> }))
vi.mock("@/shell/Splash", () => ({ Splash: () => <div data-testid="splash" /> }))
vi.mock("@/screens/Onboarding", async () => {
  const { useStore } = await import("@/store/store")
  const { useLocalAccount } = await import("@/account/LocalAccountProvider")
  return {
    Onboarding: () => {
      const { finishOnboarding } = useStore()
      const { openRegistration } = useLocalAccount()
      return <>
        <button onClick={() => finishOnboarding({})}>Finish onboarding</button>
        <button onClick={() => { finishOnboarding({}); openRegistration() }}>Register after onboarding</button>
      </>
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

it("keeps registration available across the lazy onboarding-to-workspace transition", async () => {
  render(<App />)

  fireEvent.click(await screen.findByText("Register after onboarding"))
  expect(await screen.findByText("Workspace")).toBeTruthy()
  expect(await screen.findByRole("dialog", { name: "Регистрация" })).toBeTruthy()

  fireEvent.change(screen.getByLabelText("Как к вам обращаться"), { target: { value: "Мира" } })
  fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "мира@почта.рф" } })
  fireEvent.click(screen.getByRole("button", { name: "Создать локальный профиль" }))

  expect(screen.getByRole("status").textContent).toContain("Профиль готов, Мира")
  const saved = JSON.parse(localStorage.getItem("somna-state-v6")!)
  expect(saved.onboarded).toBe(true)
  expect(saved.userName).toBe("Мира")
  expect(saved.localAccount.email).toBe("мира@почта.рф")
})

it("loads onboarding when stored data is corrupt", async () => {
  localStorage.setItem("somna-state-v6", "{invalid")
  render(<App />)

  expect(await screen.findByText("Finish onboarding")).toBeTruthy()
  expect(screen.queryByText("Workspace")).toBeNull()
})
