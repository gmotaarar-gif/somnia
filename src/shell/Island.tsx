import { AnimatePresence, motion } from "framer-motion"
import { Check, TriangleAlert } from "lucide-react"
import { DUR, EASE_OUT } from "@/lib/motion"
import { useIsFramed } from "@/shell/PhoneFrame"
import { useStore } from "@/store/store"

const SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.9 } as const

/**
 * Dynamic Island: confirms saves.
 * In the mock-up it morphs the camera pill; full-screen it appears only when there is something to show.
 */
export function Island() {
  const framed = useIsFramed()
  const { toast } = useStore()
  const mode = toast ? "toast" : "idle"

  const size = mode === "toast" ? { width: framed ? 371 : 320, height: 50 } : { width: 122, height: 35 }

  return (
    <AnimatePresence>
    {(framed || mode !== "idle") && <motion.div
      key="island"
      className="pointer-events-none absolute inset-x-0 z-[95] flex justify-center"
      style={{ top: framed ? 11 : "max(var(--safe-top), 10px)" }}
      initial={framed ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: DUR.quick, ease: EASE_OUT } }}
      transition={{ duration: DUR.fast, ease: EASE_OUT }}
    >
      <motion.div
        role="status"
        aria-live="polite"
        initial={false}
        animate={size}
        transition={SPRING}
        className="pointer-events-auto on-dark relative overflow-hidden rounded-[24px] bg-black shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_10px_30px_-10px_rgb(0_0_0/0.8)]"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === "toast" && toast && (
            <motion.div
              key={toast.id}
              className="absolute inset-0 flex items-center gap-3 px-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: DUR.fast, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: DUR.quick } }}
            >
              <motion.span
                className={`grid size-7 shrink-0 place-items-center rounded-full ${toast.variant === "error" ? "bg-red-500 text-white" : "bg-lime text-lime-ink"}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.14 }}
              >
                {toast.variant === "error" ? <TriangleAlert className="size-4" strokeWidth={3} /> : <Check className="size-4" strokeWidth={3} />}
              </motion.span>
              <span className="truncate text-[14px] font-medium">{toast.text}</span>
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
    </motion.div>}
    </AnimatePresence>
  )
}
