import * as React from "react"
import {
  DB_SPRINGS,
  createSpring,
  getMotionTimeScale,
  prefersReducedMotion,
  stepSpring,
  type SpringState,
} from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface RollLinkItem {
  id: string
  label: string
  badge?: string
}

export interface RollLinksProps {
  items: RollLinkItem[]
  activeId?: string
  onSelect?: (id: string) => void
  /** Auto-tour idle items when pointer is away (DesignBookmark signature) */
  autoTour?: boolean
  className?: string
}

const STAGGER = 0.03

function springSettled(s: SpringState) {
  return Math.abs(s.x - s.t) < 0.0005 && Math.abs(s.v) < 0.0005
}

/**
 * DesignBookmark "Roll Links" rebuilt in React for Somna.
 * Preserves exact springs from `roll-links/links.js`, sleeps RAF when idle,
 * and honors `prefers-reduced-motion`.
 */
export function RollLinks({
  items,
  activeId,
  onSelect,
  autoTour = true,
  className,
}: RollLinksProps) {
  const [hotIdx, setHotIdx] = React.useState<number | null>(null)
  const ensureRafRef = React.useRef<(() => void) | null>(null)

  const stateRef = React.useRef<{
    pointerInside: boolean
    autoIdx: number
    timers: { t: number; fn: () => void }[]
    links: {
      on: boolean
      letters: { el: HTMLSpanElement | null; s: SpringState }[]
    }[]
  }>({
    pointerInside: false,
    autoIdx: 0,
    timers: [],
    links: items.map((it) => ({
      on: false,
      letters: [...it.label].map(() => ({
        el: null,
        s: createSpring(0, ...DB_SPRINGS.rollLinksLetter),
      })),
    })),
  })

  if (stateRef.current.links.length !== items.length) {
    stateRef.current.links = items.map((it) => ({
      on: false,
      letters: [...it.label].map(() => ({
        el: null,
        s: createSpring(0, ...DB_SPRINGS.rollLinksLetter),
      })),
    }))
  }

  const after = React.useCallback((sec: number, fn: () => void) => {
    stateRef.current.timers.push({ t: sec, fn })
  }, [])

  const hoverLink = React.useCallback(
    (idx: number) => {
      const st = stateRef.current
      const reduce = prefersReducedMotion()
      st.links.forEach((lk, j) => {
        if (j !== idx && lk.on) {
          lk.on = false
          lk.letters.forEach((l, k) => {
            if (reduce) {
              l.s.t = 0
              l.s.x = 0
              if (l.el) l.el.style.transform = "translateY(0%)"
            } else {
              after(k * STAGGER, () => {
                if (!lk.on) l.s.t = 0
              })
            }
          })
        }
      })
      const target = st.links[idx]
      if (!target) return
      target.on = true
      setHotIdx(idx)
      target.letters.forEach((l, k) => {
        if (reduce) {
          l.s.t = 1
          l.s.x = 1
          if (l.el) l.el.style.transform = "translateY(-50%)"
        } else {
          after(k * STAGGER, () => {
            if (target.on) l.s.t = 1
          })
        }
      })
      ensureRafRef.current?.()
    },
    [after]
  )

  const unhoverLink = React.useCallback(
    (idx: number) => {
      const st = stateRef.current
      const target = st.links[idx]
      if (!target) return
      target.on = false
      if (!st.links.some((l) => l.on)) setHotIdx(null)
      const reduce = prefersReducedMotion()
      target.letters.forEach((l, k) => {
        if (reduce) {
          l.s.t = 0
          l.s.x = 0
          if (l.el) l.el.style.transform = "translateY(0%)"
        } else {
          after(k * STAGGER, () => {
            if (!target.on) l.s.t = 0
          })
        }
      })
      ensureRafRef.current?.()
    },
    [after]
  )

  React.useEffect(() => {
    let rafId = 0
    let last = performance.now()
    let tourTimer: number | null = null

    const scheduleTour = (delayMs: number) => {
      if (tourTimer !== null) window.clearTimeout(tourTimer)
      if (!autoTour || prefersReducedMotion()) return
      tourTimer = window.setTimeout(() => {
        const st = stateRef.current
        if (!st.pointerInside && st.links.length > 0) {
          const curIdx = st.links.findIndex((l) => l.on)
          if (curIdx >= 0) {
            unhoverLink(curIdx)
            st.autoIdx = (st.autoIdx + 1) % st.links.length
            scheduleTour(450)
          } else {
            hoverLink(st.autoIdx)
            scheduleTour(1350)
          }
        } else {
          scheduleTour(900)
        }
      }, delayMs)
    }

    const loop = (now: number) => {
      rafId = 0
      const dt = Math.min((now - last) / 1000, 1 / 30) * getMotionTimeScale()
      last = now
      const st = stateRef.current

      for (let i = st.timers.length - 1; i >= 0; i--) {
        st.timers[i].t -= dt
        if (st.timers[i].t <= 0) {
          const item = st.timers.splice(i, 1)[0]
          item.fn()
        }
      }

      const sub = 4
      for (let k = 0; k < sub; k++) {
        for (const lk of st.links) {
          for (const l of lk.letters) {
            stepSpring(l.s, dt / sub)
          }
        }
      }

      let active = st.timers.length > 0
      for (const lk of st.links) {
        for (const l of lk.letters) {
          if (!springSettled(l.s)) active = true
          if (l.el) {
            l.el.style.transform = `translateY(${(-l.s.x * 50).toFixed(2)}%)`
          }
        }
      }

      if (active) {
        rafId = requestAnimationFrame(loop)
      }
    }

    ensureRafRef.current = () => {
      if (prefersReducedMotion()) return
      if (!rafId) {
        last = performance.now()
        rafId = requestAnimationFrame(loop)
      }
    }

    scheduleTour(900)
    return () => {
      cancelAnimationFrame(rafId)
      if (tourTimer !== null) window.clearTimeout(tourTimer)
      ensureRafRef.current = null
    }
  }, [autoTour, hoverLink, unhoverLink])

  return (
    <nav
      aria-label="Навигация Somna"
      onPointerLeave={() => {
        stateRef.current.pointerInside = false
      }}
      className={cn("flex flex-col items-start gap-1 select-none", className)}
    >
      {items.map((item, idx) => {
        const isCurrent = activeId === item.id
        const isHot = hotIdx === idx
        const dimmed = hotIdx !== null && !isHot
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            onClick={() => onSelect?.(item.id)}
            onPointerEnter={() => {
              stateRef.current.pointerInside = true
              hoverLink(idx)
            }}
            onPointerLeave={() => unhoverLink(idx)}
            onFocus={() => hoverLink(idx)}
            onBlur={() => unhoverLink(idx)}
            className={cn(
              "group flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-left text-[21px] leading-[1.12] font-bold tracking-[-0.035em] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none outline-none",
              dimmed
                ? "text-white/30"
                : isCurrent
                  ? "text-[#e8ff1f]"
                  : "text-white"
            )}
          >
            <span aria-hidden className="flex">
              {[...item.label].map((ch, cIdx) => (
                <span
                  key={cIdx}
                  className="inline-block h-[1.12em] overflow-hidden whitespace-pre"
                >
                  <span
                    ref={(el) => {
                      const lk = stateRef.current.links[idx]
                      if (lk?.letters[cIdx]) lk.letters[cIdx].el = el
                    }}
                    className="flex flex-col will-change-transform"
                  >
                    <i className="h-[1.12em] not-italic">{ch}</i>
                    <i className="h-[1.12em] not-italic text-[#e8ff1f]">{ch}</i>
                  </span>
                </span>
              ))}
            </span>

            <span
              aria-hidden
              className={cn(
                "mt-1 self-start font-mono text-[10px] font-medium tracking-normal tabular-nums transition-colors duration-[var(--duration-quick)] motion-reduce:transition-none",
                isCurrent ? "text-[#e8ff1f]" : "text-white/38"
              )}
            >
              {item.badge ?? String(idx + 1).padStart(2, "0")}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default RollLinks
