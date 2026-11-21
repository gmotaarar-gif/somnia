import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { useScreenEl } from "@/shell/PhoneFrame"

export function RecoveryPanel({ children }: { children: ReactNode }) {
  const screen = useScreenEl()
  return createPortal(
    <div role="alert" className="absolute inset-x-4 top-20 z-[100] isolate rounded-[24px] bg-sheet p-4 text-center text-[14px]">
      {children}
    </div>,
    screen ?? document.body
  )
}

export function RecoveryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" className="press glass rounded-full px-4 py-2" onClick={onClick}>{children}</button>
}
