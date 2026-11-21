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
        <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-3"><span className="size-1.5 rounded-full bg-accent" aria-hidden />Somna · в своём ритме</p>
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.045em] [overflow-wrap:anywhere]">{title}</h1>
        {sub && <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{sub}</p>}
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
