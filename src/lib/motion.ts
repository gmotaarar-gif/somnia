/** Motion scale shared by every animated surface (transitions.dev tokens). */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const DUR = {
  quick: 0.15,
  fast: 0.25,
  medium: 0.35,
  slow: 0.4,
  verySlow: 0.5,
} as const

export const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30 } as const

/** Tab screens slide in from the side the user navigated to (`custom` = direction). */
export const screenVariants = {
  enter: (dir: number = 1) => ({ opacity: 0, x: 28 * dir, scale: 0.985 }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: DUR.slow, ease: EASE_OUT },
  },
  exit: (dir: number = 1) => ({ opacity: 0, x: -20 * dir, transition: { duration: DUR.quick, ease: EASE_OUT } }),
}

export const riseIn = (i = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DUR.verySlow, ease: EASE_OUT, delay: 0.04 * i },
})
