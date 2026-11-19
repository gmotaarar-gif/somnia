import * as React from "react"
import {
  DB_SPRINGS,
  clamp,
  createSpring,
  getMotionTimeScale,
  prefersReducedMotion,
  stepSpring,
  type SpringState,
} from "@/lib/motion"
import { cn } from "@/lib/utils"

interface LiveWordInstance {
  id: number
  text: string
  out: boolean
  el: HTMLSpanElement | null
  letters: {
    ch: string
    el: HTMLSpanElement | null
    s: SpringState
  }[]
}

export interface WordRollProps {
  /** Static lead text before the rolling slot */
  lead?: string
  /** Words to roll through letter-by-letter */
  words?: string[]
  /** Auto-advance interval in seconds (0 to disable auto-roll) */
  intervalSec?: number
  /** Controlled active word (if provided, rolls whenever this string changes) */
  value?: string
  accentClassName?: string
  leadClassName?: string
  className?: string
}

const DEFAULT_WORDS = ["ясное утро", "ровный ритм", "тихий вечер", "осознанный отдых"]

function springSettled(s: SpringState) {
  return Math.abs(s.x - s.t) < 0.0005 && Math.abs(s.v) < 0.0005
}

/**
 * DesignBookmark "Word Roll" rebuilt in React for Somna.
 * Preserves exact springs from `word-roll/roll.js`, sleeps RAF when idle,
 * and honors `prefers-reduced-motion`.
 */
export function WordRoll({
  lead = "Фокус вечера:",
  words = DEFAULT_WORDS,
  intervalSec = 2.6,
  value,
  accentClassName = "text-[#e8ff1f]",
  leadClassName = "text-white/50",
  className,
}: WordRollProps) {
  const slotRef = React.useRef<HTMLSpanElement>(null)
  const widthSpringRef = React.useRef<SpringState>(
    createSpring(0, ...DB_SPRINGS.wordRollWidth)
  )
  const liveRef = React.useRef<LiveWordInstance[]>([])
  const indexRef = React.useRef(0)
  const idCounterRef = React.useRef(0)
  const timersRef = React.useRef<{ t: number; fn: () => void }[]>([])
  const autoTimeoutRef = React.useRef<number | null>(null)
  const ensureRafRef = React.useRef<(() => void) | null>(null)

  const [, forceRender] = React.useState(0)
  const [ariaWord, setAriaWord] = React.useState(value ?? words[0] ?? "")

  const after = React.useCallback((sec: number, fn: () => void) => {
    const item = { t: sec, fn }
    timersRef.current.push(item)
    return item
  }, [])

  const showWord = React.useCallback(
    (wordText: string, first = false) => {
      const reduce = prefersReducedMotion()
      if (reduce) {
        liveRef.current = [
          {
            id: ++idCounterRef.current,
            text: wordText,
            out: false,
            el: null,
            letters: [...wordText].map((ch) => {
              const s = createSpring(0, ...DB_SPRINGS.wordRollLetter)
              s.t = 0
              return { ch, el: null, s }
            }),
          },
        ]
        setAriaWord(wordText)
        forceRender((n) => n + 1)
        requestAnimationFrame(() => {
          const inst = liveRef.current[0]
          if (inst?.el && slotRef.current) {
            const measured = inst.el.offsetWidth
            widthSpringRef.current.t = measured
            widthSpringRef.current.x = measured
            slotRef.current.style.width = `${measured.toFixed(1)}px`
          }
        })
        return
      }

      // Roll out existing live words
      liveRef.current.forEach((w) => {
        if (w.out) return
        w.out = true
        w.letters.forEach((l, k) => {
          after(k * 0.022, () => {
            l.s.t = -1
          })
        })
        after(0.95, () => {
          liveRef.current = liveRef.current.filter((x) => x !== w)
          forceRender((n) => n + 1)
        })
      })

      const inst: LiveWordInstance = {
        id: ++idCounterRef.current,
        text: wordText,
        out: false,
        el: null,
        letters: [...wordText].map((ch) => {
          const s = createSpring(first ? 0 : 1, ...DB_SPRINGS.wordRollLetter)
          if (first) s.t = 0
          return { ch, el: null, s }
        }),
      }

      if (!first) {
        inst.letters.forEach((l, k) => {
          after(0.06 + k * 0.028, () => {
            l.s.t = 0
          })
        })
      }

      liveRef.current.push(inst)
      setAriaWord(wordText)
      forceRender((n) => n + 1)

      requestAnimationFrame(() => {
        if (inst.el) {
          const measured = inst.el.offsetWidth
          widthSpringRef.current.t = measured
          if (first) widthSpringRef.current.x = measured
        }
        ensureRafRef.current?.()
      })
    },
    [after]
  )

  const scheduleNext = React.useCallback(() => {
    if (autoTimeoutRef.current !== null) {
      window.clearTimeout(autoTimeoutRef.current)
      autoTimeoutRef.current = null
    }
    if (value !== undefined || intervalSec <= 0 || words.length <= 1) return
    const ms = Math.round((intervalSec * 1000) / Math.max(0.25, getMotionTimeScale()))
    autoTimeoutRef.current = window.setTimeout(() => {
      indexRef.current = (indexRef.current + 1) % words.length
      showWord(words[indexRef.current], false)
      scheduleNext()
    }, ms)
  }, [intervalSec, showWord, value, words])

  const turnNow = React.useCallback(() => {
    if (value !== undefined || words.length <= 1) return
    indexRef.current = (indexRef.current + 1) % words.length
    showWord(words[indexRef.current], false)
    scheduleNext()
  }, [scheduleNext, showWord, value, words])

  // Initial mount + idle-sleeping physics loop
  React.useEffect(() => {
    const initialWord = value ?? words[0] ?? ""
    showWord(initialWord, true)
    scheduleNext()

    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        const latest = liveRef.current[liveRef.current.length - 1]
        if (latest?.el) {
          widthSpringRef.current.t = latest.el.offsetWidth
          if (prefersReducedMotion() && slotRef.current) {
            widthSpringRef.current.x = latest.el.offsetWidth
            slotRef.current.style.width = `${latest.el.offsetWidth.toFixed(1)}px`
          } else {
            ensureRafRef.current?.()
          }
        }
      })
    }

    let rafId = 0
    let last = performance.now()

    const loop = (now: number) => {
      rafId = 0
      const dt = Math.min((now - last) / 1000, 1 / 30) * getMotionTimeScale()
      last = now

      for (let i = timersRef.current.length - 1; i >= 0; i--) {
        timersRef.current[i].t -= dt
        if (timersRef.current[i].t <= 0) {
          const item = timersRef.current.splice(i, 1)[0]
          item.fn()
        }
      }

      const sub = 4
      for (let k = 0; k < sub; k++) {
        stepSpring(widthSpringRef.current, dt / sub)
        for (const w of liveRef.current) {
          for (const l of w.letters) {
            stepSpring(l.s, dt / sub)
          }
        }
      }

      if (slotRef.current && widthSpringRef.current.x > 0) {
        slotRef.current.style.width = `${widthSpringRef.current.x.toFixed(1)}px`
      }

      let active = timersRef.current.length > 0 || !springSettled(widthSpringRef.current)
      for (const w of liveRef.current) {
        for (const l of w.letters) {
          if (!springSettled(l.s)) active = true
          if (l.el) {
            const y = l.s.x
            l.el.style.transform = `translateY(${(y * 105).toFixed(2)}%)`
            l.el.style.opacity = String(clamp(1 - Math.abs(y) * 0.9, 0, 1))
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

    if (!prefersReducedMotion()) {
      rafId = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(rafId)
      if (autoTimeoutRef.current !== null) window.clearTimeout(autoTimeoutRef.current)
      ensureRafRef.current = null
      timersRef.current = []
      liveRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Controlled `value` prop updates
  const prevControlledRef = React.useRef(value)
  React.useEffect(() => {
    if (value !== undefined && value !== prevControlledRef.current) {
      prevControlledRef.current = value
      showWord(value, false)
    }
  }, [value, showWord])

  return (
    <span
      role={value === undefined ? "button" : undefined}
      tabIndex={value === undefined ? 0 : undefined}
      aria-label={`${lead ? `${lead} ` : ""}${ariaWord}`}
      onClick={value === undefined ? turnNow : undefined}
      onKeyDown={
        value === undefined
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                turnNow()
              }
            }
          : undefined
      }
      className={cn(
        "inline-flex items-center gap-[0.28em] whitespace-nowrap leading-[1.25] tracking-[-0.025em] outline-none select-none",
        value === undefined && "cursor-pointer",
        className
      )}
    >
      {lead ? (
        <span aria-hidden className={cn("font-medium", leadClassName)}>
          {lead}
        </span>
      ) : null}

      <span
        ref={slotRef}
        aria-hidden
        style={{ clipPath: "inset(0 -0.45em)" }}
        className={cn("relative inline-block h-[1.25em] font-semibold", accentClassName)}
      >
        {liveRef.current.map((w) => (
          <span
            key={w.id}
            ref={(el) => {
              w.el = el
            }}
            className="absolute top-0 left-0 flex"
          >
            {w.letters.map((l, idx) => (
              <span
                key={idx}
                ref={(el) => {
                  l.el = el
                }}
                className="inline-block whitespace-pre will-change-[transform,opacity]"
              >
                {l.ch}
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  )
}

export default WordRoll
