import { MotionConfig, MotionGlobalConfig } from "framer-motion"
import { useInsertionEffect, useSyncExternalStore, type ReactNode } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"
const snapshot = () => window.matchMedia(QUERY).matches
const serverSnapshot = () => false
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}

/** Unlike Motion's hook, this also follows preference changes without a reload. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
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
