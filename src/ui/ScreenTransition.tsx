import { forwardRef, type ReactNode } from "react"
import { AnimatePresence, motion, useIsPresent } from "framer-motion"
import { screenVariants } from "@/lib/motion"
import { usePrefersReducedMotion } from "./MotionProvider"

const instantVariants = {
  enter: { opacity: 1, x: 0 },
  center: { opacity: 1, x: 0, transition: { duration: 0 } },
  exit: { opacity: 0, x: 0, transition: { duration: 0 } },
}

const Screen = forwardRef<HTMLElement, { direction: number; children: ReactNode }>(function Screen(
  { direction, children }, ref
) {
  const present = useIsPresent()
  const reduce = usePrefersReducedMotion()
  return (
    <motion.main
      ref={ref}
      custom={direction}
      variants={reduce ? instantVariants : screenVariants}
      initial="enter"
      animate="center"
      exit="exit"
      inert={!present}
      aria-hidden={!present || undefined}
    >
      {children}
    </motion.main>
  )
})

/** Show the latest tab immediately, even if a previous tab is still leaving. */
export function ScreenTransition({ screenKey, direction, children }: {
  screenKey: string
  direction: number
  children: ReactNode
}) {
  return (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <Screen key={screenKey} direction={direction}>{children}</Screen>
      </AnimatePresence>
    </div>
  )
}
