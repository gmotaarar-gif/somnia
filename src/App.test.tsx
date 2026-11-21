// @vitest-environment jsdom

import type { ReactNode } from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import App from "./App"
// Keep the registration chunk cached so a pending workspace is the only load gate.
import "@/account/RegistrationSheet"

const { workspaceLoaded, releaseWorkspace } = vi.hoisted(() => {
  let releaseWorkspace!: () => void
  const workspaceLoaded = new Promise<void>((resolve) => { releaseWorkspace = resolve })
  return { workspaceLoaded, releaseWorkspace }
})

vi.mock("@/shell/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
  useScreenEl: () => null,
}))
vi.mock("@/shell/Aurora", () => ({ Aurora: () => <div data-testid="aurora" /> }))
vi.mock("@/shell/Island", () => ({ Island: () => <div data-testid="island" /> }))
vi.mock("@/shell/Splash", () => ({ Splash: () => <div data-testid="splash" /> }))
vi.mock("@/ui/MotionProvider", () => ({ MotionProvider: ({ children }: { children: ReactNode }) => children }))
vi.mock("@/screens/Onboarding", async () => {
  const { useStore } = await import("@/store/store")
  const { useLocalAccount } = await import("@/account/LocalAccountProvider")
  return {
    Onboarding: () => {
      const { finishOnboarding } = useStore()
      const { openRegistration } = useLocalAccount()
      return <>
        <button onClick={() => finishOnboarding({})}>Finish onboarding</button>
        <button onClick={() => { finishOnboarding({ bedGoal: "22:45", wakeGoal: "07:30" }); openRegistration() }}>Register after onboarding</button>
      </>
    },
  }
})
vi.mock("@/shell/Workspace", async () => {
  await workspaceLoaded
  return { default: () => <div>Workspace</div> }
})

afterEach(() => {
  releaseWorkspace()
  cleanup()
  localStorage.clear()
})

it("waits for onboarding to commit before allowing registration", async () => {
  render(<App />)

  const register = await screen.findByText("Register after onboarding")
  await act(async () => { fireEvent.click(register) })
  expect(screen.queryByRole("dialog", { name: "Регистрация" })).toBeNull()
  expect(screen.queryByText("Workspace")).toBeNull()

  releaseWorkspace()
  expect(await screen.findByText("Workspace")).toBeTruthy()
  expect(await screen.findByRole("dialog", { name: "Регистрация" })).toBeTruthy()

  fireEvent.change(screen.getByLabelText("Как к вам обращаться"), { target: { value: "Мира" } })
  fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "мира@почта.рф" } })
  fireEvent.click(screen.getByRole("button", { name: "Создать локальный профиль" }))

  expect(screen.getByRole("status").textContent).toContain("Профиль готов, Мира")
  const saved = JSON.parse(localStorage.getItem("somna-state-v6")!)
  expect(saved.onboarded).toBe(true)
  expect(saved.bedGoal).toBe("22:45")
  expect(saved.wakeGoal).toBe("07:30")
  expect(saved.userName).toBe("Мира")
  expect(saved.localAccount.email).toBe("мира@почта.рф")
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
  localStorage.setItem("somna-state-v6", JSON.stringify({ onboarded: true, theme: "light" }))
  render(<App />)

  expect(await screen.findByText("Workspace")).toBeTruthy()
  expect(screen.queryByTestId("aurora")).toBeNull()
  expect(screen.queryByText("Finish onboarding")).toBeNull()
})

it("loads onboarding when stored data is corrupt", async () => {
  localStorage.setItem("somna-state-v6", "{invalid")
  render(<App />)

  expect(await screen.findByText("Finish onboarding")).toBeTruthy()
  expect(screen.queryByText("Workspace")).toBeNull()
})
