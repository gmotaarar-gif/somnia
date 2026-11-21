import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/cn"

/* Lens ruler: a strip of values slides under a fixed pill. The value under the pill is magnified,
   its neighbours shrink and fade (a fisheye). Drag or throw the strip, tap a value, or use the keys. */

const stillness = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Fisheye spacing: about 72 px apart under the lens, 40 far out. */
const mapX = (d: number) => Math.sign(d) * (40 * Math.abs(d) + 26 * (1 - Math.exp(-Math.abs(d) * 1.25)))
/** Fisheye size: the value under the lens is 1.7× its far neighbours. */
const mapS = (d: number) => 1 + 0.7 * Math.exp((-d * d) / 0.42)
/** px of drag per value */
const DRAG_PX = 52
/** values drawn each side of the lens */
const REACH = 5

export function LensRuler({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format = String,
  className,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  label: string
  format?: (v: number) => string
  className?: string
}) {
  const still = stillness()
  const last = Math.round((max - min) / step)
  const toIndex = (v: number) => clamp(Math.round((v - min) / step), 0, last)
  const toValue = (i: number) => Number((min + i * step).toFixed(6))

  const [pos, setPos] = useState(() => toIndex(value))
  const p = useRef({ x: pos, v: 0, to: pos })
  const raf = useRef(0)
  const live = useRef({ onChange, last })
  live.current = { onChange, last }
  const reported = useRef(toIndex(value))
  /* true while the strip is following a value set from outside */
  const following = useRef(false)

  const set = (x: number) => {
    p.current.x = x
    setPos(x)
    if (following.current) return
    const i = clamp(Math.round(x), 0, live.current.last)
    if (i === reported.current) return
    reported.current = i
    live.current.onChange(toValue(i))
  }

  const run = () => {
    if (raf.current) return
    let prev = 0
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1
      prev = t
      const c = p.current
      c.v += ((c.to - c.x) * 0.03 - c.v * 0.3) * dt
      const x = c.x + c.v * dt
      if (Math.abs(c.to - x) < 0.002 && Math.abs(c.v) < 0.002) {
        c.v = 0
        raf.current = 0
        set(c.to)
        return
      }
      set(x)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }
  useEffect(() => () => { cancelAnimationFrame(raf.current); raf.current = 0 }, [])

  const goTo = (to: number, v = 0) => {
    const c = p.current
    c.to = clamp(Math.round(to), 0, live.current.last)
    c.v = v
    if (still) { c.v = 0; set(c.to); return }
    run()
  }

  const index = toIndex(value)
  useEffect(() => {
    if (index === reported.current) return
    reported.current = index
    following.current = true
    goTo(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const drag = useRef<null | { x: number; x0: number; t: number; v: number; k: number; moved: boolean }>(null)

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* a scripted pointer */ }
    cancelAnimationFrame(raf.current)
    raf.current = 0
    following.current = false
    p.current.v = 0
    const k = e.currentTarget.getBoundingClientRect().width / e.currentTarget.offsetWidth || 1
    drag.current = { x: e.clientX, x0: e.clientX, t: performance.now(), v: 0, k, moved: false }
  }

  const onMove = (e: React.PointerEvent) => {
    const g = drag.current
    if (!g) return
    if (Math.abs(e.clientX - g.x0) > 4) g.moved = true
    const now = performance.now()
    let d = -(e.clientX - g.x) / g.k / DRAG_PX
    /* past either end it gives a little and no more */
    const x = p.current.x
    if ((x < 0 && d < 0) || (x > live.current.last && d > 0)) d *= 0.25
    const dt = Math.max(1, now - g.t) / 16.67
    g.v = g.v * 0.5 + (d / dt) * 0.5
    g.x = e.clientX
    g.t = now
    set(clamp(x + d, -0.6, live.current.last + 0.6))
  }

  const onUp = (e: React.PointerEvent<HTMLDivElement>, thrown = true) => {
    const g = drag.current
    drag.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* never captured */ }
    if (!g) return
    if (thrown && !g.moved) {
      /* a tap goes to the value under the finger */
      const box = e.currentTarget.getBoundingClientRect()
      const px = (e.clientX - (box.left + box.width / 2)) / g.k
      let best = Math.round(p.current.x)
      let gap = Infinity
      for (let i = Math.max(0, best - REACH); i <= Math.min(live.current.last, best + REACH); i++) {
        const far = Math.abs(mapX(i - p.current.x) - px)
        if (far < gap) { gap = far; best = i }
      }
      goTo(best)
      return
    }
    const v = !thrown || performance.now() - g.t > 80 ? 0 : clamp(g.v, -0.5, 0.5)
    goTo(p.current.x + v * 9, v * 0.6)
  }

  const onKey = (e: React.KeyboardEvent) => {
    const at = p.current.to
    const to =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? at + 1
      : e.key === "ArrowLeft" || e.key === "ArrowDown" ? at - 1
      : e.key === "PageUp" ? at + 5
      : e.key === "PageDown" ? at - 5
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null
    if (to === null) return
    e.preventDefault()
    following.current = false
    goTo(to)
  }

  const shown = clamp(Math.round(pos), 0, last)
  const items = []
  for (let i = Math.max(0, Math.floor(pos - REACH)); i <= Math.min(last, Math.ceil(pos + REACH)); i++) {
    const d = i - pos
    const w = Math.exp((-d * d) / 0.3)
    items.push(
      <span
        key={i}
        className="lens-item"
        data-on={w > 0.5 || undefined}
        style={{
          transform: `translateX(${mapX(d).toFixed(2)}px) translateX(-50%) scale(${mapS(d).toFixed(3)})`,
          opacity: clamp(1 - Math.abs(d) / (REACH + 0.5), 0, 1) * (0.55 + 0.45 * w),
        }}
      >
        {format(toValue(i))}
      </span>,
    )
  }

  return (
    <div
      className={cn("lens", className)}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={toValue(shown)}
      aria-valuetext={format(toValue(shown))}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={(e) => onUp(e)}
      /* the browser took the gesture for a scroll: settle, never throw */
      onPointerCancel={(e) => onUp(e, false)}
      onKeyDown={onKey}
    >
      <span className="lens-pill" aria-hidden />
      <div className="lens-strip" aria-hidden>{items}</div>
    </div>
  )
}
