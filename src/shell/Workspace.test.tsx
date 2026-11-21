// @vitest-environment jsdom

import { Component, type ReactNode } from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { StoreProvider } from "@/store/store"
import Workspace from "./Workspace"

const loading = vi.hoisted(() => {
  let resolve!: (value: { SleepScreen: () => ReactNode }) => void
  const sleep = new Promise<{ SleepScreen: () => ReactNode }>((done) => { resolve = done })
  return { sleep, resolve, requested: vi.fn() }
})
vi.mock("@/screens/Today", () => ({ TodayScreen: () => <div>Today content</div> }))
vi.mock("@/screens/Sleep", async () => { loading.requested(); return loading.sleep })
vi.mock("@/screens/Mind", () => { throw new Error("Chunk unavailable") })
vi.mock("@/shell/SheetHost", () => ({ SheetHost: () => null }))
vi.mock("@/shell/Dock", async () => {
  const { useStore } = await import("@/store/store")
  return {
    Dock: () => {
      const { setTab } = useStore()
      return <><button onClick={() => setTab("sleep")}>Sleep</button><button onClick={() => setTab("mind")}>Mind</button></>
    },
  }
})
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: { main: ({ children }: { children: ReactNode }) => <main>{children}</main> },
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

it("keeps the current screen mounted until the requested tab finishes loading", async () => {
  render(<StoreProvider><Workspace /></StoreProvider>)
  expect(screen.getByText("Today content")).toBeTruthy()
  expect(loading.requested).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText("Sleep"))
  expect(screen.getByText("Today content")).toBeTruthy()
  await act(async () => loading.resolve({ SleepScreen: () => <div>Sleep content</div> }))
  expect(await screen.findByText("Sleep content")).toBeTruthy()
  expect(screen.queryByText("Today content")).toBeNull()
})

it("surfaces a failed chunk load instead of silently leaving the wrong screen", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false }
    static getDerivedStateFromError() { return { failed: true } }
    render() { return this.state.failed ? <div>Load failed</div> : this.props.children }
  }
  render(<Boundary><StoreProvider><Workspace /></StoreProvider></Boundary>)
  fireEvent.click(screen.getByText("Mind"))
  expect(await screen.findByText("Load failed")).toBeTruthy()
})
