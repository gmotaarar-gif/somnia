import * as React from "react"
import { IconButton } from "@/ui/controls"
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
  const { userName, openSheet } = useStore()
  const initial = (userName.trim()[0] ?? "S").toUpperCase()
  return (
    <header className="flex items-start justify-between gap-4 px-1 pb-7 pt-4">
      <div className="min-w-0 flex-1">
        {sub && <p className="text-[13px] leading-snug text-ink-3">{sub}</p>}
        <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.08] tracking-[-0.045em] [overflow-wrap:anywhere]">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-1">
        {action}
        <IconButton label="Профиль" onClick={() => openSheet("profile")} className="text-[14px] font-medium">
          {initial}
        </IconButton>
      </div>
    </header>
  )
}
