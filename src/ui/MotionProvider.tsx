import { MotionConfig, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

/** MotionConfig's reducedMotion flag alone still animates opacity, SVGs and delays. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <MotionConfig reducedMotion="user" skipAnimations={!!reduce}>
      {children}
    </MotionConfig>
  )
}
