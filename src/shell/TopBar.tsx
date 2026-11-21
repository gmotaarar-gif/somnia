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
    <header className="flex items-center justify-between gap-3 px-1 pb-6 pt-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-[27px] font-semibold leading-[1.12] tracking-[-0.045em] [overflow-wrap:anywhere]">{title}</h1>
        {sub && <p className="mt-2 text-[12px] leading-snug text-ink-2">{sub}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <IconButton label="Профиль" onClick={() => openSheet("profile")} className="size-10 text-[14px] font-medium text-[#d4c9f4]">
          {initial}
        </IconButton>
      </div>
    </header>
  )
}
