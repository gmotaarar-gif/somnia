import { MotionConfig } from "framer-motion"
import { useSyncExternalStore, type ReactNode } from "react"

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
  return (
    <MotionConfig reducedMotion="user" skipAnimations={!!reduce}>
      {children}
    </MotionConfig>
  )
}
