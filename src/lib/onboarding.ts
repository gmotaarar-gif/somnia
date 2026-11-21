import { DEFAULT_WIDGETS, type Widget } from "@/store/store"

/**
 * Home widgets after onboarding: built-in widgets follow the picks, while the user's
 * own widgets, their counters and the existing order are kept.
 */
export function onboardingWidgets(current: Widget[], picked: string[]): Widget[] {
  const builtIn = new Set(DEFAULT_WIDGETS.map((w) => w.id))
  const kept = current.map((w) => (builtIn.has(w.id) ? { ...w, visible: picked.includes(w.id) } : w))
  const missing = DEFAULT_WIDGETS.filter((w) => !current.some((x) => x.id === w.id)).map((w) => ({
    ...w,
    visible: picked.includes(w.id),
  }))
  return [...kept, ...missing]
}
