import { MotionConfig, MotionGlobalConfig } from "framer-motion"
import { useInsertionEffect, useSyncExternalStore, type ReactNode } from "react"
import { riseIn } from "@/lib/motion"

const QUERY = "(prefers-reduced-motion: reduce)"
const snapshot = () => window.matchMedia(QUERY).matches
const serverSnapshot = () => false
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(QUERY)
  const onChange = () => {
    // A consumer can commit before the root's subscription is notified.
    // Update Motion before *any* consumer can restart a decorative loop.
    MotionGlobalConfig.skipAnimations = query.matches
    notify()
  }
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** Unlike Motion's hook, this also follows preference changes without a reload. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}

/** Mount content visibly rather than waiting for Motion's first scheduled frame. */
export function useRiseIn() {
  const reduce = usePrefersReducedMotion()
  return (index = 0) => reduce ? {
    initial: false as const,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0, delay: 0, skipAnimations: true },
  } : riseIn(index)
}

/** MotionConfig's reducedMotion flag alone still animates opacity, SVGs and delays. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduce = usePrefersReducedMotion()
  useInsertionEffect(() => {
    // This is the sole app root. Unlike per-element MotionConfig flags, the
    // public global switch is read on every animation, including mounted nodes.
    // Set it before child layout effects start or restart their animations.
    const previous = MotionGlobalConfig.skipAnimations
    MotionGlobalConfig.skipAnimations = reduce
    return () => { MotionGlobalConfig.skipAnimations = previous }
  }, [reduce])
  return (
    <MotionConfig reducedMotion="never">
      {children}
    </MotionConfig>
  )
}
