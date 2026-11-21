// @vitest-environment jsdom

import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Capacitor } from "@capacitor/core"
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"
import { ProfileSheet } from "./ProfileSheet"

const state = vi.hoisted(() => ({
  userName: "Somna", sheet: "profile", sessions: [], nights: [], moods: [], worries: [], wellbeing: [],
  bedGoal: "23:30", wakeGoal: "07:30", chronotype: "balanced", volume: 50, reminder: false,
  notify: vi.fn(), patch: vi.fn(), openSheet: vi.fn(),
} ))

vi.mock("@/store/store", () => ({ useStore: () => state }))
vi.mock("@/account/LocalAccountCard", () => ({ LocalAccountCard: () => null }))
vi.mock("@/ui/SubscriptionCard", () => ({ SubscriptionCard: () => null }))
vi.mock("@/ui/Sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  Field: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock("@capacitor/filesystem", () => ({ Directory: { Cache: "CACHE" }, Encoding: { UTF8: "utf8" }, Filesystem: { writeFile: vi.fn() } }))
vi.mock("@capacitor/share", () => ({ Share: { share: vi.fn() } }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

function exportData() {
  render(<ProfileSheet />)
  fireEvent.click(screen.getByRole("button", { name: /Экспорт данных/ }))
}

it("writes even an empty journal to cache and waits for a native share target before success", async () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true)
  vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: "file:///cache/somna-export.json" })
  let complete!: (value: { activityType: string }) => void
  vi.mocked(Share.share).mockImplementation(() => new Promise(resolve => { complete = resolve }))
  exportData()
  await waitFor(() => expect(Share.share).toHaveBeenCalledWith({ title: "Somna", dialogTitle: "Экспорт данных", files: ["file:///cache/somna-export.json"] }))
  expect(state.notify).not.toHaveBeenCalled()
  const options = vi.mocked(Filesystem.writeFile).mock.calls[0][0]
  expect(options).toMatchObject({ path: "somna-export.json", directory: Directory.Cache, encoding: Encoding.UTF8 })
  expect(JSON.parse(options.data as string)).toMatchObject({ nights: [], moods: [], sessions: [], worries: [], wellbeing: [], bedGoal: "23:30", wakeGoal: "07:30" })
  complete({ activityType: "com.google.android.apps.docs" })
  await waitFor(() => expect(state.notify).toHaveBeenCalledWith("Данные выгружены"))
})

it.each(["write", "share", "cancel"])('does not report success after native %s failure', async failure => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true)
  vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: "file:///cache/somna-export.json" })
  if (failure === "write") vi.mocked(Filesystem.writeFile).mockRejectedValue(new Error("Disk full"))
  else if (failure === "share") vi.mocked(Share.share).mockRejectedValue(new Error("Share cancelled"))
  else vi.mocked(Share.share).mockResolvedValue({ activityType: "" })
  exportData()
  await waitFor(() => expect(state.notify).toHaveBeenCalledWith("Не удалось выгрузить данные"))
  expect(state.notify).not.toHaveBeenCalledWith("Данные выгружены")
  if (failure === "write") expect(Share.share).not.toHaveBeenCalled()
})

it("keeps the browser JSON download without calling native plugins", async () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false)
  const createObjectURL = vi.fn(() => "blob:export")
  const revokeObjectURL = vi.fn()
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  exportData()
  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
  expect(click).toHaveBeenCalledOnce()
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:export")
  expect(Filesystem.writeFile).not.toHaveBeenCalled()
  expect(Share.share).not.toHaveBeenCalled()
  await waitFor(() => expect(state.notify).toHaveBeenCalledWith("Данные выгружены"))
})
