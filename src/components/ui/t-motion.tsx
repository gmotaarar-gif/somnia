"use client"

import * as React from "react"
import { prefersReducedMotion, readCssMs } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── 19. Card hover tilt & cursor glare (fine-pointer safe, touch-action: pan-y) ── */
export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  maxTilt?: number
  glare?: boolean
  cardClassName?: string
  children: React.ReactNode
}

export function TiltCard({
  disabled = false,
  maxTilt = 10,
  glare = true,
  className,
  cardClassName,
  children,
  ...props
}: TiltCardProps) {
  const outerRef = React.useRef<HTMLDivElement>(null)
  const cardRef = React.useRef<HTMLDivElement>(null)

  const reset = React.useCallback(() => {
    const outer = outerRef.current
    const card = cardRef.current
    if (!outer || !card) return
    outer.classList.remove("is-hover")
    card.classList.remove("is-tilting")
    card.style.setProperty("--tilt-rx", "0deg")
    card.style.setProperty("--tilt-ry", "0deg")
  }, [])

  React.useEffect(() => {
    if (disabled) reset()
  }, [disabled, reset])

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || prefersReducedMotion()) return
      if (e.pointerType !== "mouse") return
      if (
        typeof window !== "undefined" &&
        !window.matchMedia("(hover: hover) and (pointer: fine)").matches
      ) {
        return
      }
      const outer = outerRef.current
      const card = cardRef.current
      if (!outer || !card) return
      const r = outer.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      outer.classList.add("is-hover")
      card.classList.add("is-tilting")
      card.style.setProperty("--tilt-ry", `${((px - 0.5) * maxTilt).toFixed(2)}deg`)
      card.style.setProperty("--tilt-rx", `${((0.5 - py) * maxTilt).toFixed(2)}deg`)
      card.style.setProperty("--tilt-gx", `${(px * 100).toFixed(1)}%`)
      card.style.setProperty("--tilt-gy", `${(py * 100).toFixed(1)}%`)
    },
    [disabled, maxTilt]
  )

  return (
    <div
      ref={outerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className={cn("t-tilt", className)}
      {...props}
    >
      <div ref={cardRef} className={cn("t-tilt-card h-full w-full", cardClassName)}>
        {children}
        {glare && !disabled ? <div aria-hidden className="t-tilt-glare z-30" /> : null}
      </div>
    </div>
  )
}

/* ── 16. SlidingTabs (measured glass pill, snaps on mount/resize without transition) ── */
export interface SlidingTabItem<T extends string = string> {
  id: T
  label: string
  icon?: React.ReactNode
}

export interface SlidingTabsProps<T extends string = string> {
  items: SlidingTabItem<T>[]
  value: T
  onValueChange: (id: T) => void
  ariaLabel: string
  size?: "xs" | "sm" | "md"
  className?: string
  fullWidth?: boolean
}

export function SlidingTabs<T extends string>({
  items,
  value,
  onValueChange,
  ariaLabel,
  size = "sm",
  className,
  fullWidth = false,
}: SlidingTabsProps<T>) {
  const barRef = React.useRef<HTMLDivElement>(null)
  const pillRef = React.useRef<HTMLSpanElement>(null)
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const hasMountedRef = React.useRef(false)

  const syncPill = React.useCallback(
    (animate: boolean) => {
      const pill = pillRef.current
      const activeTab = tabRefs.current[value]
      if (!pill || !activeTab) return
      const left = activeTab.offsetLeft
      const width = activeTab.offsetWidth
      if (!animate || prefersReducedMotion()) {
        const prev = pill.style.transition
        pill.style.transition = "none"
        pill.style.transform = `translateX(${left}px)`
        pill.style.width = `${width}px`
        void pill.offsetWidth
        pill.style.transition = prev
      } else {
        pill.style.transform = `translateX(${left}px)`
        pill.style.width = `${width}px`
      }
    },
    [value]
  )

  React.useLayoutEffect(() => {
    const animate = hasMountedRef.current
    hasMountedRef.current = true
    syncPill(animate)
  }, [syncPill, items.length])

  React.useEffect(() => {
    const bar = barRef.current
    if (!bar || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => syncPill(false))
    ro.observe(bar)
    return () => ro.disconnect()
  }, [syncPill])

  const heightCls =
    size === "xs"
      ? "h-6.5 px-2.5 text-[11px]"
      : size === "md"
        ? "h-9 px-4 text-xs"
        : "h-7.5 px-3 text-[11.5px]"

  return (
    <div
      ref={barRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "t-tabs border border-white/10 bg-white/[0.06] backdrop-blur-md",
        fullWidth ? "flex w-full" : "inline-flex",
        className
      )}
    >
      <span
        ref={pillRef}
        aria-hidden="true"
        className="t-tabs-pill border border-white/18 bg-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]"
      />
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[item.id] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.id)}
            className={cn(
              "t-tab inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap",
              fullWidth && "flex-1",
              heightCls
            )}
          >
            {item.icon ? <span className="inline-flex shrink-0">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── 34. TextSwapSoft (in-place cross-blur with eased width) ── */
export interface TextSwapSoftProps {
  value: string | number
  align?: "start" | "end"
  className?: string
}

export function TextSwapSoft({
  value,
  align = "start",
  className,
}: TextSwapSoftProps) {
  const nextStr = String(value)
  const spanRef = React.useRef<HTMLSpanElement>(null)
  const currentRef = React.useRef(nextStr)
  const timerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const el = spanRef.current
    if (!el) return
    const prev = currentRef.current
    if (prev === nextStr) return
    currentRef.current = nextStr

    if (prefersReducedMotion()) {
      el.textContent = nextStr
      return
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    const out = document.createElement("span")
    out.className = "t-text-soft-old"
    out.setAttribute("aria-hidden", "true")
    out.textContent = prev

    const inn = document.createElement("span")
    inn.className = "t-text-soft-new"
    inn.textContent = nextStr

    const w0 = el.getBoundingClientRect().width
    el.classList.remove("is-swapping")
    el.replaceChildren(out, inn)
    const w1 = inn.getBoundingClientRect().width
    el.style.width = `${w0}px`
    void el.offsetWidth
    el.classList.add("is-swapping")
    el.style.width = `${w1}px`

    const dur = Math.max(
      readCssMs("--text-soft-dur", 200),
      readCssMs("--text-soft-resize-dur", 240)
    )
    timerRef.current = window.setTimeout(() => {
      el.classList.remove("is-swapping")
      el.style.removeProperty("width")
      el.textContent = nextStr
      timerRef.current = null
    }, dur + 40)
  }, [nextStr])

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <span
      ref={spanRef}
      style={{ "--text-soft-align": align } as React.CSSProperties}
      className={cn("t-text-soft", className)}
    >
      {nextStr}
    </span>
  )
}

/* ── 33. TextMorph (keeps shared prefix/suffix letters, morphs only changing slice) ── */
export interface TextMorphProps {
  value: string
  className?: string
}

export function TextMorph({ value, className }: TextMorphProps) {
  const spanRef = React.useRef<HTMLSpanElement>(null)
  const currentRef = React.useRef(value)
  const timerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const el = spanRef.current
    if (!el) return
    const prev = currentRef.current
    if (prev === value) return
    currentRef.current = value

    if (prefersReducedMotion()) {
      el.textContent = value
      return
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    let a = 0
    while (a < prev.length && a < value.length && prev[a] === value[a]) a++
    let b = 0
    while (
      b < prev.length - a &&
      b < value.length - a &&
      prev[prev.length - 1 - b] === value[value.length - 1 - b]
    ) {
      b++
    }

    const swap = document.createElement("span")
    swap.className = "t-morph-swap"
    const out = document.createElement("span")
    out.className = "t-morph-old"
    out.setAttribute("aria-hidden", "true")
    out.textContent = prev.slice(a, prev.length - b)
    const inn = document.createElement("span")
    inn.className = "t-morph-new"
    inn.textContent = value.slice(a, value.length - b)
    swap.append(out, inn)

    el.textContent = ""
    el.append(value.slice(0, a), swap, value.slice(value.length - b))

    swap.style.width = `${out.getBoundingClientRect().width}px`
    void swap.offsetWidth
    swap.classList.add("is-morphing")
    swap.style.width = `${inn.getBoundingClientRect().width}px`

    const dur = Math.max(
      readCssMs("--text-morph-dur", 180),
      readCssMs("--text-morph-resize-dur", 240)
    )
    timerRef.current = window.setTimeout(() => {
      el.textContent = value
      timerRef.current = null
    }, dur + 40)
  }, [value])

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <span ref={spanRef} className={cn("t-morph", className)}>
      {value}
    </span>
  )
}

/* ── 04. TextStatesSwap (3-phase blurred Y-swap for unrelated status labels) ── */
export interface TextStatesSwapProps {
  value: string
  className?: string
}

export function TextStatesSwap({ value, className }: TextStatesSwapProps) {
  const spanRef = React.useRef<HTMLSpanElement>(null)
  const currentRef = React.useRef(value)
  const timerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const el = spanRef.current
    if (!el) return
    if (currentRef.current === value) return
    currentRef.current = value

    if (prefersReducedMotion()) {
      el.textContent = value
      return
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    const dur = readCssMs("--text-swap-dur", 150)
    el.classList.add("is-exit")
    timerRef.current = window.setTimeout(() => {
      el.textContent = value
      el.classList.remove("is-exit")
      el.classList.add("is-enter-start")
      void el.offsetHeight
      el.classList.remove("is-enter-start")
      timerRef.current = null
    }, dur)
  }, [value])

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <span ref={spanRef} className={cn("t-text-swap", className)}>
      {value}
    </span>
  )
}

/* ── 36. SubtleNumber (quiet per-digit cross-fade rising or falling with value) ── */
export interface SubtleNumberProps {
  value: number | string
  suffix?: string
  className?: string
  suffixClassName?: string
}

export function SubtleNumber({
  value,
  suffix,
  className,
  suffixClassName,
}: SubtleNumberProps) {
  const str = String(value)
  const [prevStr, setPrevStr] = React.useState(str)
  const [animKey, setAnimKey] = React.useState(0)
  const [dir, setDir] = React.useState<1 | -1>(1)
  const wrapRef = React.useRef<HTMLSpanElement>(null)
  const lastStrRef = React.useRef(str)
  const lastNumRef = React.useRef(Number(str.replace(/[^0-9.-]/g, "")) || 0)

  React.useEffect(() => {
    if (lastStrRef.current === str) return
    const nextNum = Number(str.replace(/[^0-9.-]/g, ""))
    const nextDir: 1 | -1 =
      !Number.isNaN(nextNum) && nextNum < lastNumRef.current ? -1 : 1
    setPrevStr(lastStrRef.current)
    setDir(nextDir)
    lastStrRef.current = str
    if (!Number.isNaN(nextNum)) lastNumRef.current = nextNum

    if (prefersReducedMotion()) return
    const el = wrapRef.current
    if (el) {
      el.classList.remove("is-animating")
      void el.offsetHeight
      el.classList.add("is-animating")
    }
    setAnimKey((k) => k + 1)
  }, [str])

  const sameLen = prevStr.length === str.length

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span
        ref={wrapRef}
        aria-label={str}
        style={{ "--subtle-dir": dir } as React.CSSProperties}
        className="t-subtle-number is-animating"
      >
        {[...str].map((ch, idx) => {
          const unchanged = sameLen && prevStr[idx] === ch
          if (unchanged || animKey === 0) {
            return <React.Fragment key={idx}>{ch}</React.Fragment>
          }
          return (
            <span key={`${idx}-${animKey}`} className="t-subtle-slot">
              {sameLen ? (
                <span className="t-subtle-old" aria-hidden="true">
                  {prevStr[idx]}
                </span>
              ) : null}
              <span className="t-subtle-new">{ch}</span>
            </span>
          )
        })}
      </span>
      {suffix ? (
        <span className={cn("text-xs font-medium text-white/55", suffixClassName)}>
          {suffix}
        </span>
      ) : null}
    </span>
  )
}

/* ── 02. PopNumber (3D drum digit bounce for milestone counters) ── */
export interface PopNumberProps {
  value: number | string
  suffix?: string
  className?: string
  suffixClassName?: string
}

export function PopNumber({
  value,
  suffix,
  className,
  suffixClassName,
}: PopNumberProps) {
  const str = String(value)
  const [prevStr, setPrevStr] = React.useState(str)
  const [animKey, setAnimKey] = React.useState(0)
  const groupRef = React.useRef<HTMLSpanElement>(null)
  const lastStrRef = React.useRef(str)

  React.useEffect(() => {
    if (lastStrRef.current === str) return
    setPrevStr(lastStrRef.current)
    lastStrRef.current = str
    if (prefersReducedMotion()) return
    const el = groupRef.current
    if (el) {
      el.classList.remove("is-animating")
      void el.offsetHeight
      el.classList.add("is-animating")
    }
    setAnimKey((k) => k + 1)
  }, [str])

  let samePrefix = 0
  while (
    samePrefix < prevStr.length &&
    samePrefix < str.length &&
    prevStr[samePrefix] === str[samePrefix]
  ) {
    samePrefix++
  }

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span
        ref={groupRef}
        aria-label={str}
        className="t-digit-group is-animating"
      >
        {[...str].map((ch, idx) => {
          const isStatic =
            animKey === 0 || idx < samePrefix || !/\d/.test(ch)
          if (isStatic) {
            return (
              <span key={idx} className="t-digit" data-same="">
                {ch}
              </span>
            )
          }
          const fromEnd = str.length - 1 - idx
          const stagger = fromEnd === 1 ? "1" : fromEnd === 0 ? "2" : undefined
          const oldCh = prevStr[prevStr.length - (str.length - idx)]
          return (
            <span
              key={`${idx}-${animKey}`}
              className="t-digit-slot"
              data-stagger={stagger}
            >
              {oldCh && /\d/.test(oldCh) ? (
                <span className="t-digit-old" aria-hidden="true">
                  {oldCh}
                </span>
              ) : null}
              <span className="t-digit">{ch}</span>
            </span>
          )
        })}
      </span>
      {suffix ? (
        <span className={cn("text-xs font-medium text-white/55", suffixClassName)}>
          {suffix}
        </span>
      ) : null}
    </span>
  )
}

/* ── 18. StaggerReveal / TextsReveal (blurred staggered entrance, quiet exit) ── */
export interface StaggerRevealProps {
  shown?: boolean
  index?: number
  className?: string
  children: React.ReactNode
}

export function StaggerReveal({
  shown = true,
  index,
  className,
  children,
}: StaggerRevealProps) {
  const [visible, setVisible] = React.useState(() =>
    prefersReducedMotion() ? shown : false
  )
  const [hiding, setHiding] = React.useState(false)

  React.useEffect(() => {
    if (prefersReducedMotion()) {
      setVisible(shown)
      setHiding(false)
      return
    }
    if (shown) {
      setHiding(false)
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    } else {
      setVisible(false)
      setHiding(true)
      const t = window.setTimeout(() => setHiding(false), 200)
      return () => window.clearTimeout(t)
    }
  }, [shown])

  if (index !== undefined) {
    const cappedDelay = Math.min(index, 7) * 40
    return (
      <div
        className={cn(
          "t-stagger",
          visible && "is-shown",
          hiding && "is-hiding",
          className
        )}
      >
        <div
          className="t-stagger-line"
          style={{ transitionDelay: visible ? `${cappedDelay}ms` : "0ms" }}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "t-stagger",
        visible && "is-shown",
        hiding && "is-hiding",
        className
      )}
    >
      {children}
    </div>
  )
}

export const TextsReveal = StaggerReveal

/* ── 09. IconSwap (cross-blur & scale without will-change raster freeze) ── */
export interface IconSwapProps {
  state: "a" | "b"
  iconA: React.ReactNode
  iconB: React.ReactNode
  className?: string
}

export function IconSwap({ state, iconA, iconB, className }: IconSwapProps) {
  return (
    <span className={cn("t-icon-swap", className)} data-state={state}>
      <span className="t-icon" data-icon="a" aria-hidden={state !== "a"}>
        {iconA}
      </span>
      <span className="t-icon" data-icon="b" aria-hidden={state !== "b"}>
        {iconB}
      </span>
    </span>
  )
}

/* ── 10. SuccessCheck (500ms bob/rotate/blur + 80ms delayed calibrated path draw) ── */
export interface SuccessCheckProps {
  show?: boolean
  size?: number
  strokeWidth?: number
  color?: string
  className?: string
}

export function SuccessCheck({
  show = true,
  size = 24,
  strokeWidth = 3.2,
  color = "currentColor",
  className,
}: SuccessCheckProps) {
  const wrapRef = React.useRef<HTMLSpanElement>(null)
  const pathRef = React.useRef<SVGPathElement>(null)

  React.useLayoutEffect(() => {
    const path = pathRef.current
    if (!path) return
    const len = Math.ceil(path.getTotalLength()) + 1
    path.style.strokeDasharray = String(len)
    if (!show || prefersReducedMotion()) {
      path.style.strokeDashoffset = prefersReducedMotion() && show ? "0" : String(len)
    }
  }, [show])

  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    if (show) {
      el.setAttribute("data-state", "out")
      void el.offsetWidth
      el.setAttribute("data-state", "in")
    } else {
      el.setAttribute("data-state", "out")
    }
  }, [show])

  return (
    <span
      ref={wrapRef}
      className={cn("t-success-check", className)}
      data-state={show ? "in" : "out"}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
      >
        <path
          ref={pathRef}
          d="M14 25.5L21 32.5L35 17.5"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/* ── 31. MatrixLoader (4x4 2px dot matrix loader) ── */
const MATRIX_CORNERS = new Set([0, 3, 12, 15])
const MATRIX_RING = [1, 2, 7, 11, 14, 13, 8, 4]
const MATRIX_INNER = new Set([5, 6, 9, 10])
const MATRIX_TWINKLE = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4]

export interface MatrixLoaderProps {
  variant?: "scan" | "twinkle" | "orbit" | "pulse"
  rounded?: boolean
  label?: string
  className?: string
}

export function MatrixLoader({
  variant = "scan",
  rounded = false,
  label = "Загрузка",
  className,
}: MatrixLoaderProps) {
  const cycle = 1200

  return (
    <div
      role="status"
      aria-label={label}
      data-variant={variant}
      data-rounded={rounded ? "true" : "false"}
      className={cn("t-matrix inline-grid shrink-0", className)}
    >
      {Array.from({ length: 16 }, (_, idx) => {
        if (rounded && MATRIX_CORNERS.has(idx)) {
          return <i key={idx} className="is-gap" aria-hidden="true" />
        }
        const col = idx % 4
        let delay = 0
        let steady = false

        if (variant === "scan") {
          delay = Math.round(col * (cycle / 10))
        } else if (variant === "twinkle") {
          delay = Math.round(MATRIX_TWINKLE[idx] * (cycle / 16))
        } else if (variant === "orbit") {
          const k = MATRIX_RING.indexOf(idx)
          if (k !== -1) delay = Math.round(k * (cycle / 8))
          else steady = true
        } else if (variant === "pulse") {
          const ring = MATRIX_INNER.has(idx) ? 0 : 1
          delay = Math.round(ring * (cycle * 0.16))
        }

        return (
          <i
            key={idx}
            aria-hidden="true"
            style={
              steady
                ? { animation: "none" }
                : ({ "--d": delay } as React.CSSProperties)
            }
          />
        )
      })}
    </div>
  )
}

/* ── 21. SoftAccordion (0fr <-> 1fr grid collapse + symmetric scaleY(-1) chevron) ── */
export interface SoftAccordionProps {
  open: boolean
  onToggle: () => void
  header: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}

export function SoftAccordion({
  open,
  onToggle,
  header,
  children,
  className,
  headerClassName,
  contentClassName,
}: SoftAccordionProps) {
  return (
    <div className={cn("t-acc", className)} data-open={open ? "true" : "false"}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          "t-acc-head flex w-full cursor-pointer items-center justify-between text-left",
          headerClassName
        )}
      >
        <div className="min-w-0 flex-1">{header}</div>
        <span className="t-acc-chevron ml-2 shrink-0 text-white/65" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6.5L8 10.5L12 6.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel">
        <div className={cn("t-acc-panel-inner", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
