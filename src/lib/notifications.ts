import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"

export interface ReminderSettings {
  reminder: boolean
  reminderTime: string
  morningReminder: boolean
  morningReminderTime: string
}

export async function requestReminderPermission() {
  if (!Capacitor.isNativePlatform()) return false
  try {
    return (await LocalNotifications.requestPermissions()).display === "granted"
  } catch {
    return false
  }
}

let pending = Promise.resolve()
export function syncReminders(settings: ReminderSettings) {
  if (!Capacitor.isNativePlatform()) return Promise.resolve()
  const run = async () => {
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }] })
    if ((await LocalNotifications.checkPermissions()).display !== "granted") return
    const notifications = [
      { id: 1001, enabled: settings.reminder, time: settings.reminderTime, title: "Пора замедлиться 🌙", body: "Оставьте заботы дня. Начнём готовиться ко сну?" },
      { id: 1002, enabled: settings.morningReminder, time: settings.morningReminderTime, title: "Доброе утро ☀️", body: "Как вы себя чувствуете? Уделите минутку себе." },
    ].flatMap(({ enabled, time, ...notification }) => {
      if (!enabled || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return []
      const [hour, minute] = time.split(":").map(Number)
      return [{ ...notification, schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true } }]
    })
    if (notifications.length) await LocalNotifications.schedule({ notifications })
  }
  const result = pending.then(run)
  pending = result.catch(() => {})
  return result
}

export function listenForReminders(openSheet: (sheet: "bodyscan" | "mood") => void) {
  if (!Capacitor.isNativePlatform()) return () => {}
  let disposed = false
  let remove: (() => void) | undefined
  const listener = LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
    if (notification.id === 1001) openSheet("bodyscan")
    if (notification.id === 1002) openSheet("mood")
  })
  void listener.then((handle) => {
    remove = () => { void handle.remove().catch(() => {}) }
    if (disposed) remove()
  }).catch(() => {})
  return () => {
    disposed = true
    remove?.()
  }
}
