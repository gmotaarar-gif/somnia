import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { AnimatePresence, motion, useDragControls } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/cn"
import { DUR, EASE_OUT, SPRING_SOFT } from "@/lib/motion"
import { useScreenEl } from "@/shell/PhoneFrame"
import { IconButton } from "@/ui/controls"

interface SheetProps {
  open: boolean
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Full-height immersive sheet without the standard header */
  bare?: boolean
  /** Children render their own scroll area and footer (state resets on each open) */
  form?: boolean
  className?: string
}

/** Bottom sheet rendered inside the phone screen. */
export function Sheet({ open, onClose, onCloseAutoFocus, title, description, children, footer, bare, form, className }: SheetProps) {
  const drag = useDragControls()
  const container = useScreenEl()
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount container={container}>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.fast, ease: EASE_OUT }}
              />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
            <Dialog.Content asChild forceMount aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus}>
              <motion.div
                className={cn(
                  "pointer-events-auto relative flex max-h-[93%] w-full flex-col overflow-hidden rounded-t-[40px] bg-[#0d0d13] shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_-30px_80px_rgb(0_0_0/0.6)] outline-none",
                  "",
                  bare && "h-[93%]",
                  className
                )}
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0, transition: { duration: DUR.fast, ease: EASE_OUT } }}
                transition={SPRING_SOFT}
                drag="y"
                dragControls={drag}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120 || info.velocity.y > 700) onClose()
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 z-20 flex h-7 cursor-grab touch-none items-center justify-center"
                  onPointerDown={(e) => drag.start(e)}
                >
                  <span className="h-[5px] w-10 rounded-full bg-white/25" />
                </div>
                {bare ? (
                  <>
                    <Dialog.Title className="sr-only">{title}</Dialog.Title>
                    {children}
                  </>
                ) : (
                  <>
                    <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-8">
                      <div className="min-w-0">
                        <Dialog.Title className="text-[24px] font-semibold leading-tight tracking-[-0.03em]">
                          {title}
                        </Dialog.Title>
                        {description && <p className="mt-1.5 text-[14px] leading-snug text-ink-3">{description}</p>}
                      </div>
                      <IconButton label="Закрыть" onClick={onClose}>
                        <X />
                      </IconButton>
                    </header>
                    {form ? (
                      children
                    ) : (
                      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
                    )}
                    {footer && (
                      <footer className="border-t border-hair bg-[#0d0d13] px-6 pb-[max(var(--safe-bottom),20px)] pt-4">
                        {footer}
                      </footer>
                    )}
                  </>
                )}
              </motion.div>
            </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</h3>
        {hint != null && <span className="text-[13px] text-ink-2">{hint}</span>}
      </div>
      {children}
    </section>
  )
}
