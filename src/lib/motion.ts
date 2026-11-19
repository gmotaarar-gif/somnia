/**
 * Unified Motion Engine for Somna V2
 * Ports DesignBookmark's exact sub-stepped spring physics (`shared/motion.js` + `shared/tokens.css`)
 * alongside transitions.dev motion tokens, Catmull-Rom SVG spline helpers, FLIP / count-up hooks,
 * and Framer Motion presets.
 */

import * as React from "react"

export interface SpringState {
  x: number
  v: number
  t: number
  k: number
  c: number
}

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

const reducedMq =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null

export const prefersReducedMotion = () => !!reducedMq?.matches

/** Reactive OS reduced-motion subscription hook. */
export function useReducedMotionPref(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      reducedMq?.addEventListener("change", cb)
      return () => reducedMq?.removeEventListener("change", cb)
    },
    () => !!reducedMq?.matches,
    () => false
  )
}

export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** Eased RAF number tween synced with `prefers-reduced-motion`. */
export function useCountUp(target: number, duration = 850, enabled = true): number {
  const reduced = useReducedMotionPref()
  const [value, setValue] = React.useState(enabled && !reduced ? 0 : target)
  const curRef = React.useRef(value)
  curRef.current = value

  React.useEffect(() => {
    if (!enabled || reduced || !Number.isFinite(target)) {
      setValue(target)
      return
    }
    const from = curRef.current
    if (from === target) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      setValue(from + (target - from) * easeOutExpo(t))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, enabled, reduced])

  return value
}

/** FLIP layout glide helper for elements marked with `data-flip`. */
export function useFlip(
  container: React.RefObject<HTMLElement | null>,
  deps: unknown[],
  skip?: string | null
) {
  const rects = React.useRef(new Map<string, DOMRect>())
  React.useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const reduced = prefersReducedMotion()
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-flip]"))
    for (const el of nodes) {
      const id = el.dataset.flip
      if (!id) continue
      const prev = rects.current.get(id)
      const next = el.getBoundingClientRect()
      if (prev && id !== skip && !reduced && typeof el.animate === "function") {
        const dx = prev.left - next.left
        const dy = prev.top - next.top
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0,0)" }],
            { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" }
          )
        }
      }
    }
    const map = new Map<string, DOMRect>()
    for (const el of nodes) {
      if (el.dataset.flip) map.set(el.dataset.flip, el.getBoundingClientRect())
    }
    rects.current = map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Live clock hook for greetings and bedtime countdowns. */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

/** Reads a CSS custom property duration (`ms` or `s`) in milliseconds from `:root`. */
export function readCssMs(tokenName: string, fallbackMs = 0): number {
  if (typeof window === "undefined") return fallbackMs
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(tokenName)
    .trim()
  if (!raw) return fallbackMs
  const num = parseFloat(raw)
  if (Number.isNaN(num)) return fallbackMs
  return raw.endsWith("s") && !raw.endsWith("ms") ? num * 1000 : num
}

export function createSpring(x: number, k = 400, c = 30): SpringState {
  return { x, v: 0, t: x, k, c }
}

export function tuneSpring(s: SpringState, k: number, c: number) {
  s.k = k
  s.c = prefersReducedMotion() ? 2 * Math.sqrt(k) : c
}

export function stepSpring(s: SpringState, dt: number) {
  const a = -s.k * (s.x - s.t) - s.c * s.v
  s.v += a * dt
  s.x += s.v * dt
}

/** Exact spring constants from DesignBookmark `shared/tokens.css` */
export const DB_SPRINGS = {
  follow: [900, 50] as const,
  settle: [280, 22] as const,
  soft: [260, 24] as const,
  lead: [620, 36] as const,
  trail: [190, 19] as const,
  pop: [520, 16] as const,
  fade: [420, 32] as const,
  dockLead: [640, 38] as const,
  dockTrail: [150, 16] as const,
  dockDragLead: [1100, 56] as const,
  dockDragTrail: [320, 26] as const,
  dockOpenW: [340, 21] as const,
  dockOpenH: [230, 21] as const,
  dockClose: [420, 30] as const,
  dockPop: [520, 16] as const,
  wordRollWidth: [320, 30] as const,
  wordRollLetter: [420, 26] as const,
  rollLinksLetter: [380, 24] as const,
}

/** transitions.dev shared easing curves */
export const MOTION_EASINGS = {
  smoothOut: [0.22, 1, 0.36, 1] as const,
  iosDrawer: [0.32, 0.72, 0, 1] as const,
  bounce: [0.34, 1.36, 0.64, 1] as const,
  bounceStrong: [0.34, 3.85, 0.64, 1] as const,
  inOut: "easeInOut" as const,
  out: "easeOut" as const,
  linear: "linear" as const,
}

/** transitions.dev shared motion token scale (seconds / pixels / scales) */
export const MOTION_TOKENS = {
  durations: {
    stagger: 0.04,
    micro: 0.08,
    quick: 0.15,
    fast: 0.25,
    medium: 0.35,
    slow: 0.4,
    verySlow: 0.5,
  },
  distances: {
    micro: 4,
    small: 6,
    base: 8,
    medium: 12,
    large: 30,
  },
  scales: {
    large: 0.96,
    medium: 0.97,
    small: 0.98,
    tiny: 0.99,
  },
  blurs: {
    small: 2,
    medium: 3,
    large: 8,
  },
  easings: MOTION_EASINGS,
} as const

/** Global Slow-Motion controller (0.25x) shared across DesignBookmark studies */
type SlowListener = (slow: boolean) => void
let globalSlow = false
const slowListeners = new Set<SlowListener>()

export function getMotionTimeScale() {
  return globalSlow ? 0.25 : 1
}

export function isSlowMotion() {
  return globalSlow
}

export function setSlowMotion(slow: boolean) {
  globalSlow = slow
  slowListeners.forEach((fn) => fn(slow))
}

export function subscribeSlowMotion(fn: SlowListener) {
  slowListeners.add(fn)
  return () => {
    slowListeners.delete(fn)
  }
}

/**
 * Catmull-Rom smooth SVG path generator (exact match with `FinanceBento` `smoothPath`)
 */
export function smoothSvgPath(points: [number, number][], move = true): string {
  if (points.length === 0) return ""
  let d = `${move ? "M" : "L"}${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const k = 0.17
    const cp1x = p1[0] + (p2[0] - p0[0]) * k
    const cp1y = p1[1] + (p2[1] - p0[1]) * k
    const cp2x = p2[0] - (p3[0] - p1[0]) * k
    const cp2y = p2[1] - (p3[1] - p1[1]) * k
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

/** Asymmetric open/close and symmetric navigation presets aligned to transitions.dev */
export const SOMNA_TRANSITIONS = {
  tabSpring: { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.9 },
  cardSpring: { type: "spring" as const, stiffness: 360, damping: 28 },
  sheetPushback: { type: "spring" as const, stiffness: 340, damping: 32 },
  islandSpring: { type: "spring" as const, stiffness: 400, damping: 28 },
  modalOpen: {
    duration: MOTION_TOKENS.durations.fast,
    ease: MOTION_EASINGS.smoothOut,
  },
  modalClose: {
    duration: MOTION_TOKENS.durations.quick,
    ease: MOTION_EASINGS.smoothOut,
  },
  panelOpen: {
    duration: MOTION_TOKENS.durations.slow,
    ease: MOTION_EASINGS.smoothOut,
  },
  panelClose: {
    duration: MOTION_TOKENS.durations.medium,
    ease: MOTION_EASINGS.smoothOut,
  },
  pageSlide: {
    duration: MOTION_TOKENS.durations.fast,
    ease: MOTION_EASINGS.smoothOut,
  },
  textReveal: {
    duration: MOTION_TOKENS.durations.verySlow,
    ease: MOTION_EASINGS.smoothOut,
  },
}
