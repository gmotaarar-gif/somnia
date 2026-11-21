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
    <header className="flex items-center justify-between gap-3 pb-5 pt-1">
      <IconButton label="Профиль" onClick={() => openSheet("profile")} className="text-[15px] font-semibold">
        {initial}
      </IconButton>
      <div className="min-w-0 text-center">
        <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
        {sub && <p className="mt-0.5 truncate text-[12px] text-ink-3">{sub}</p>}
      </div>
      <div className="flex min-w-11 justify-end gap-2">{action}</div>
    </header>
  )
}
