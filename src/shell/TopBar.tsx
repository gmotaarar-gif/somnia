import * as React from "react"
import { IconButton } from "@/ui/controls"
import { Moon, Sun } from "lucide-react"
import { useResolvedTheme } from "@/lib/theme"
import { useStore } from "@/store/store"

export function TopBar({
  title,
  sub,
  action,
}: {
  title: string
  sub?: string
  action?: React.ReactNode
}) {
  const { userName, openSheet, theme, patch } = useStore()
  const resolvedTheme = useResolvedTheme(theme)
  const initial = (userName.trim()[0] ?? "S").toUpperCase()
  return (
    <header className="screen-heading flex items-start justify-between gap-3 px-1 pb-7 pt-4">
      <div className="min-w-0 flex-1">
        {sub && <p className="text-[13px] leading-snug text-ink-3">{sub}</p>}
        <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.08] tracking-[-0.045em] [overflow-wrap:anywhere]">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-1">
        {action}
        <IconButton
          label={resolvedTheme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
          onClick={() => patch({ theme: resolvedTheme === "dark" ? "light" : "dark" })}
        >
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
        </IconButton>
        <IconButton label="Профиль" onClick={() => openSheet("profile")} className="text-[14px] font-medium">
          {initial}
        </IconButton>
      </div>
    </header>
  )
}
