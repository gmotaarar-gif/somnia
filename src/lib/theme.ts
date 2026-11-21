import { useSyncExternalStore } from "react"

export type ThemeMode = "system" | "light" | "dark"
export type Theme = "light" | "dark"

const QUERY = "(prefers-color-scheme: light)"
const prefersLight = () => typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches
const subscribe = (notify: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {}
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}

export const isThemeMode = (v: unknown): v is ThemeMode => v === "system" || v === "light" || v === "dark"

/** The theme actually shown: "system" follows the OS and keeps following it live. */
export function useResolvedTheme(mode: ThemeMode): Theme {
  const light = useSyncExternalStore(subscribe, prefersLight, () => false)
  return mode === "system" ? (light ? "light" : "dark") : mode
}

/** Page background per theme; mirrors --color-bg for the browser chrome. */
export const THEME_BG: Record<Theme, string> = { dark: "#080809", light: "#f2f1f6" }

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_BG[theme])
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme)
}
