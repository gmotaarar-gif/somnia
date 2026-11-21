// @vitest-environment jsdom

import type { ReactNode } from "react"
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
      const { tab, setTab, toast } = useStore()
      return <><span>Selected: {tab}</span><span>{toast?.text}</span><button onClick={() => setTab("sleep")}>Sleep</button><button onClick={() => setTab("mind")}>Mind</button></>
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

it("keeps the app mounted and restores the selected tab after a chunk fails", async () => {
  render(<StoreProvider><Workspace /></StoreProvider>)
  fireEvent.click(screen.getByText("Mind"))
  expect(await screen.findByText("Не удалось загрузить раздел. Попробуйте ещё раз.")).toBeTruthy()
  expect(screen.getByText("Today content")).toBeTruthy()
  expect(screen.getByText("Selected: today")).toBeTruthy()
  fireEvent.click(screen.getByText("Sleep"))
  expect(await screen.findByText("Sleep content")).toBeTruthy()
})
