import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { EASE_OUT } from "@/lib/motion"

const LETTERS = "Somna".split("")

/** Launch animation: a moon eclipses into the wordmark, then the app fades in underneath. */
export function Splash() {
  const [show, setShow] = React.useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !new URLSearchParams(location.search).has("nosplash")
  )
  React.useEffect(() => {
    if (!show) return
    const id = window.setTimeout(() => setShow(false), 1700)
    return () => window.clearTimeout(id)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-[94] grid place-items-center bg-[#07070c]"
          exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.5, ease: EASE_OUT } }}
          aria-hidden
        >
          <div className="flex flex-col items-center">
            <div className="relative size-[92px]">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute inset-0 rounded-full border border-dashed border-white/25"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1.3 + i * 0.45, opacity: [0, 0.7, 0] }}
                  transition={{ duration: 1.5, ease: EASE_OUT, delay: 0.15 + i * 0.14 }}
                />
              ))}
              <motion.span
                className="absolute inset-0 rounded-full bg-lime shadow-[0_0_60px_-6px_rgb(217_242_74/0.8)]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
              />
              <motion.span
                className="absolute inset-0 rounded-full bg-[#07070c]"
                initial={{ x: 92, y: -40 }}
                animate={{ x: 26, y: -18 }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.25 }}
              />
            </div>
            <div className="mt-8 flex text-[30px] font-semibold tracking-[-0.04em]">
              {LETTERS.map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.45 + i * 0.06 }}
                >
                  {ch}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
