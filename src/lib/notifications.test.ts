import { beforeEach, describe, expect, it, vi } from "vitest"
import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"
import { listenForReminders, requestReminderPermission, syncReminders } from "./notifications"

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn(() => true) } }))
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: {
  cancel: vi.fn(), schedule: vi.fn(), checkPermissions: vi.fn(), requestPermissions: vi.fn(), addListener: vi.fn(),
} }))
const settings = { reminder: true, reminderTime: "22:30", morningReminder: true, morningReminderTime: "08:00" }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
  vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "granted" })
})
describe("reminders", () => {
  it("replaces stable ids with daily local-time reminders", async () => {
    await syncReminders(settings)
    expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1001 }, { id: 1002 }] })
    expect(LocalNotifications.schedule).toHaveBeenCalledWith({ notifications: [
      expect.objectContaining({ id: 1001, schedule: { on: { hour: 22, minute: 30 }, repeats: true, allowWhileIdle: true } }),
      expect.objectContaining({ id: 1002, schedule: { on: { hour: 8, minute: 0 }, repeats: true, allowWhileIdle: true } }),
    ] })
  })
  it("cancels without scheduling when both are off or times are invalid", async () => {
    await syncReminders({ ...settings, reminder: false, morningReminder: false })
    await syncReminders({ ...settings, reminderTime: "", morningReminderTime: "25:00" })
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
  })
  it("does not schedule without permission", async () => {
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: "denied" })
    await syncReminders(settings)
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
  })
  it("is a no-op on web", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    await syncReminders(settings)
    expect(await requestReminderPermission()).toBe(true)
    listenForReminders(vi.fn())()
    expect(LocalNotifications.cancel).not.toHaveBeenCalled()
    expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled()
    expect(LocalNotifications.addListener).not.toHaveBeenCalled()
  })
  it("reports permission errors and recovers after scheduling errors", async () => {
    vi.mocked(LocalNotifications.requestPermissions).mockRejectedValue(new Error("unavailable"))
    expect(await requestReminderPermission()).toBe(false)
    vi.mocked(LocalNotifications.cancel).mockRejectedValueOnce(new Error("unavailable"))
    await expect(syncReminders(settings)).rejects.toThrow("unavailable")
    await syncReminders(settings)
    expect(LocalNotifications.schedule).toHaveBeenCalledOnce()
  })
  it("routes taps to wind-down and mood sheets and removes the listener", async () => {
    const remove = vi.fn()
    vi.mocked(LocalNotifications.addListener).mockResolvedValue({ remove })
    const open = vi.fn()
    const stop = listenForReminders(open)
    const callback = vi.mocked(LocalNotifications.addListener).mock.calls[0][1]
    callback({ notification: { id: 1001 } } as never)
    callback({ notification: { id: 1002 } } as never)
    callback({ notification: { id: 9999 } } as never)
    expect(open.mock.calls).toEqual([["bodyscan"], ["mood"]])
    stop()
    await Promise.resolve()
    expect(remove).toHaveBeenCalledOnce()
  })
})
