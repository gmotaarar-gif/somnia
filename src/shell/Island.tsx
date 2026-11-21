import { AnimatePresence, motion } from "framer-motion"
import { Check, Wind } from "lucide-react"
import { DUR, EASE_OUT } from "@/lib/motion"
import { useIsFramed } from "@/shell/PhoneFrame"
import { useBreath, useStore } from "@/store/store"

const SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.9 } as const

/**
 * Dynamic Island: confirms saves and keeps a running breathing session in view.
 * In the mock-up it morphs the camera pill; full-screen it appears only when there is something to show.
 */
export function Island() {
  const framed = useIsFramed()
  const { toast, tab, setTab, nightMode } = useStore()
  const { breath } = useBreath()
  const live = breath.running && tab !== "practices" && !nightMode
  const mode = toast ? "toast" : live ? "live" : "idle"
  if (!framed && mode === "idle") return <AnimatePresence />

  const size =
    mode === "toast" ? { width: 300, height: 48 } : mode === "live" ? { width: 214, height: 38 } : { width: 122, height: 35 }
  const mm = Math.floor(breath.remainingSec / 60)
  const ss = String(breath.remainingSec % 60).padStart(2, "0")

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[95] flex justify-center"
      style={{ top: framed ? 11 : "max(var(--safe-top), 10px)" }}
    >
      <motion.div
        role="status"
        aria-live="polite"
        initial={framed ? false : { opacity: 0, y: -16, scale: 0.8 }}
        animate={{ ...size, opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        onClick={live && !toast ? () => setTab("practices") : undefined}
        className="pointer-events-auto relative overflow-hidden rounded-[24px] bg-black shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_10px_30px_-10px_rgb(0_0_0/0.8)]"
        style={{ cursor: live && !toast ? "pointer" : undefined }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === "toast" && toast && (
            <motion.div
              key={toast.id}
              className="absolute inset-0 flex items-center gap-3 px-3"
              initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: DUR.fast, ease: EASE_OUT, delay: 0.08 } }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: DUR.quick } }}
            >
              <motion.span
                className="grid size-7 shrink-0 place-items-center rounded-full bg-lime text-lime-ink"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.14 }}
              >
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
              <span className="truncate text-[14px] font-medium">{toast.text}</span>
            </motion.div>
          )}
          {mode === "live" && (
            <motion.div
              key="live"
              className="absolute inset-0 flex items-center justify-between px-3.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1 } }}
              exit={{ opacity: 0, transition: { duration: DUR.quick } }}
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-lime">
                <Wind className="size-4" /> Дыхание
              </span>
              <span className="flex items-center gap-2 text-[13px] font-semibold tabular-nums">
                <span className="size-1.5 animate-pulse rounded-full bg-lime" />
                {mm}:{ss}
              </span>
            </motion.div>
          )}
          {mode === "idle" && (
            <motion.span
              key="cam"
              className="absolute right-[14px] top-1/2 size-[11px] -translate-y-1/2 rounded-full bg-[#0c0f1f] shadow-[inset_0_0_3px_1px_rgb(70_90_190/0.5)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
