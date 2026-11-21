// PeekRating from React Bits (reactbits.dev), ported to TypeScript, with this app's lucide
// icons in place of Hugeicons. Hovering or dragging previews a rating: the glyphs up to the
// pointer rise, and a tip names the level. A tap commits it with a small pop.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import { Heart, Star, Zap } from "lucide-react"
import "./PeekRating.css"

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"
const SHAPES = { star: Star, heart: Heart, bolt: Zap }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

export interface PeekRatingProps {
  value?: number
  defaultValue?: number
  onChange?: (value: number) => void
  onPreview?: (value: number | null) => void
  count?: number
  shape?: keyof typeof SHAPES
  icon?: ReactNode
  /** One label per glyph: the tip while previewing, and each glyph's accessible name. */
  labels?: string[]
  activeColor?: string
  idleColor?: string
  tipColor?: string
  tipTextColor?: string
  size?: number
  lift?: number
  magnify?: number
  riseDuration?: number
  popScale?: number
  showTip?: boolean
  allowClear?: boolean
  readOnly?: boolean
  disabled?: boolean
  ariaLabel?: string
  /** Id of the element that names the group, instead of `ariaLabel`. */
  ariaLabelledBy?: string
  className?: string
}

export default function PeekRating({
  value: valueProp,
  defaultValue = 0,
  onChange,
  onPreview,
  count = 5,
  shape = "star",
  icon,
  labels = [],
  activeColor = "#f5b400",
  idleColor = "#52525b",
  tipColor = "#27272a",
  tipTextColor = "#f5f5f5",
  size = 28,
  lift = 6,
  magnify = 1.15,
  riseDuration = 320,
  popScale = 1.3,
  showTip = true,
  allowClear = true,
  readOnly = false,
  disabled = false,
  ariaLabel = "Оценка",
  ariaLabelledBy,
  className = "",
}: PeekRatingProps) {
  const [inner, setInner] = useState(defaultValue)
  const value = clamp(valueProp ?? inner, 0, count)
  const interactive = !readOnly && !disabled

  const rootRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const tipEl = useRef<HTMLSpanElement>(null)
  const starEls = useRef<(HTMLElement | null)[]>([])
  const liftEls = useRef<(HTMLSpanElement | null)[]>([])
  const glyphEls = useRef<(HTMLSpanElement | null)[]>([])
  const st = useRef({
    hover: null as number | null,
    pressing: false,
    pointerId: null as number | null,
    settled: false,
    rect: null as DOMRect | null,
    rtl: false,
    // A press that already committed: the click that follows it is not a second rating.
    committed: false,
  })

  const paint = () => {
    const { hover, settled, rtl } = st.current
    const previewing = hover !== null && !settled
    const shown = previewing ? hover + 1 : value
    const still = reducedMotion()

    for (let i = 0; i < count; i++) {
      const liftEl = liftEls.current[i]
      const glyphEl = glyphEls.current[i]
      if (!liftEl || !glyphEl) continue
      const lifted = previewing && !still && i <= hover
      liftEl.style.transform = lifted ? `translateY(${-lift}px) scale(${i === hover ? magnify : 1})` : "translateY(0px) scale(1)"
      glyphEl.dataset.lit = String(i < shown)
    }

    const tip = tipEl.current
    if (!tip) return
    if (previewing && showTip) {
      const row = rowRef.current
      const slot = row ? row.clientWidth / count : size
      const visual = rtl ? count - 1 - hover : hover
      const wasHidden = tip.dataset.show !== "true"
      if (wasHidden) tip.style.transition = "none"
      tip.textContent = labels[hover] ?? String(hover + 1)
      tip.style.transform = `translate(calc(${slot * (visual + 0.5)}px - 50%), 0)`
      if (wasHidden) {
        void tip.offsetWidth
        tip.style.transition = ""
      }
      tip.dataset.show = "true"
    } else {
      tip.dataset.show = "false"
    }
  }
  useLayoutEffect(paint)

  const setHover = (index: number | null) => {
    if (index === st.current.hover) return
    st.current.hover = index
    if (index !== null) st.current.settled = false
    paint()
    onPreview?.(index === null ? null : index + 1)
  }
  const setHoverRef = useRef(setHover)
  setHoverRef.current = setHover

  const measure = () => {
    const row = rowRef.current
    if (!row) return
    st.current.rect = row.getBoundingClientRect()
    st.current.rtl = getComputedStyle(row).direction === "rtl"
  }

  const indexAt = (x: number, y: number) => {
    const { rect, pressing, rtl } = st.current
    if (!rect || !rect.width) return null
    if (pressing && (y < rect.top - size || y > rect.bottom + size)) return null
    const index = clamp(Math.floor(((x - rect.left) / rect.width) * count), 0, count - 1)
    return rtl ? count - 1 - index : index
  }

  const commit = (next: number, pop = true) => {
    if (valueProp === undefined) setInner(next)
    onChange?.(next)
    st.current.settled = true
    paint()
    const glyph = glyphEls.current[next - 1]
    if (pop && next > 0 && popScale > 1 && glyph && typeof glyph.animate === "function" && !reducedMotion()) {
      glyph.getAnimations().forEach((animation) => animation.cancel())
      glyph.animate(
        [
          { transform: "scale(1)", easing: EASE_OUT },
          { transform: `scale(${popScale})`, offset: 0.35, easing: EASE_OUT },
          { transform: "scale(1)" },
        ],
        { duration: 300 }
      )
    }
  }

  const handlePointerEnter = (e: PointerEvent) => {
    if (!interactive || e.pointerType !== "mouse") return
    rootRef.current?.removeAttribute("data-instant")
    measure()
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button !== 0 || st.current.pointerId !== null) return
    rootRef.current?.removeAttribute("data-instant")
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* a scripted pointer */
    }
    st.current.pointerId = e.pointerId
    st.current.pressing = true
    measure()
    setHover(indexAt(e.clientX, e.clientY))
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!interactive) return
    const { pressing, pointerId } = st.current
    if (e.pointerType !== "mouse" && !pressing) return
    if (pressing && e.pointerId !== pointerId) return
    if (!pressing && !st.current.rect) measure()
    setHover(indexAt(e.clientX, e.clientY))
  }

  const endPress = (e: PointerEvent) => {
    const { pressing, pointerId, hover } = st.current
    if (!pressing || e.pointerId !== pointerId) return
    st.current.pressing = false
    st.current.pointerId = null
    if (e.type === "pointerup" && hover !== null) {
      const next = hover + 1
      st.current.committed = true
      commit(allowClear && next === value ? 0 : next)
    }
    if (e.pointerType !== "mouse") setHover(null)
  }

  const handlePointerLeave = () => {
    if (!st.current.pressing) setHover(null)
  }

  // A click with no press before it: a screen reader, or a scripted activation.
  const handleClick = (index: number) => {
    if (!interactive) return
    if (st.current.committed) {
      st.current.committed = false
      return
    }
    commit(allowClear && index + 1 === value ? 0 : index + 1)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!interactive) return
    const min = allowClear ? 0 : 1
    let next: number
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = clamp(value + 1, min, count)
        break
      case "ArrowLeft":
      case "ArrowDown":
        next = clamp(value - 1, min, count)
        break
      case "Home":
        next = 1
        break
      case "End":
        next = count
        break
      case "Backspace":
      case "Delete":
        if (!allowClear) return
        next = 0
        break
      case " ":
      case "Enter": {
        const index = starEls.current.indexOf(e.target as HTMLElement)
        if (index === -1) return
        next = allowClear && index + 1 === value ? 0 : index + 1
        break
      }
      default:
        return
    }
    e.preventDefault()
    rootRef.current?.setAttribute("data-instant", "true")
    st.current.hover = null
    commit(next, false)
    starEls.current[Math.max(next, 1) - 1]?.focus()
  }

  useEffect(() => {
    const reset = () => {
      st.current.pressing = false
      st.current.pointerId = null
      setHoverRef.current(null)
    }
    const onVisibility = () => {
      if (document.hidden) reset()
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", reset)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", reset)
    }
  }, [])

  const Glyph = SHAPES[shape] || SHAPES.star
  const tipRoom = interactive && showTip ? Math.round(size * 0.9) : 0

  return (
    <div
      ref={rootRef}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `${value} из ${count}` : ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={readOnly ? undefined : ariaLabelledBy}
      aria-disabled={disabled || undefined}
      className={`peek-rating${className ? ` ${className}` : ""}`}
      style={
        {
          "--pr-active": activeColor,
          "--pr-idle": idleColor,
          "--pr-tip": tipColor,
          "--pr-tip-text": tipTextColor,
          "--pr-size": `${size}px`,
          "--pr-gap": `${Math.round(size * 0.22)}px`,
          "--pr-room": `${lift + tipRoom}px`,
          "--pr-rise": `${riseDuration}ms`,
        } as CSSProperties
      }
      onKeyDown={readOnly ? undefined : handleKeyDown}
    >
      <div
        ref={rowRef}
        className="peek-rating__row"
        onPointerEnter={handlePointerEnter}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onLostPointerCapture={endPress}
        onPointerLeave={handlePointerLeave}
      >
        {interactive && showTip ? <span ref={tipEl} className="peek-rating__tip" aria-hidden="true" /> : null}
        {Array.from({ length: count }, (_, i) => {
          const checked = value === i + 1
          const label = labels[i] ?? `${i + 1} из ${count}`
          const Item = readOnly ? "span" : "button"
          return (
            <Item
              key={i}
              ref={(el: HTMLElement | null) => {
                starEls.current[i] = el
              }}
              type={readOnly ? undefined : "button"}
              className="peek-rating__star"
              role={readOnly ? undefined : "radio"}
              aria-checked={readOnly ? undefined : checked}
              aria-label={readOnly ? undefined : label}
              aria-hidden={readOnly || undefined}
              tabIndex={!interactive ? -1 : (value === 0 ? i === 0 : checked) ? 0 : -1}
              onClick={readOnly ? undefined : () => handleClick(i)}
            >
              <span
                ref={(el) => {
                  liftEls.current[i] = el
                }}
                className="peek-rating__lift"
              >
                <span
                  ref={(el) => {
                    glyphEls.current[i] = el
                  }}
                  className="peek-rating__glyph"
                >
                  {icon ?? <Glyph size={size} fill="currentColor" strokeWidth={1.5} />}
                </span>
              </span>
            </Item>
          )
        })}
      </div>
    </div>
  )
}
