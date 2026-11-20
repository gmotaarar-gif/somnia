"use client"

import * as React from "react"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import {
  type MotionValue,
  m,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion"
import { SubtleNumber } from "@/components/ui/t-motion"
import { cn } from "@/lib/utils"

export interface ExposureSliderProps {
  /** Accent color for the active notch and progress ring (CSS color value) */
  accentColor?: string
  /** Additional CSS classes */
  className?: string
  /** Controlled value */
  value?: number
  /** Initial value */
  defaultValue?: number
  /** Maximum value */
  max?: number
  /** Minimum value */
  min?: number
  /** Callback fired when the value changes */
  onChange?: (value: number) => void
  /** Show the circular progress indicator with the current value */
  showIndicator?: boolean
  /** Step size between values */
  step?: number
  /** Optional subtitle above orb */
  label?: string
  /** Dial geometry: convex 140deg semicircular arc (default) or linear strip */
  variant?: "arc" | "linear"
  /** Optional handler for inner dome `<<` / `>>` stepper buttons */
  onStep?: (delta: number) => void
  /** Show `<<` / `>>` soft stepper controls inside the arc dome */
  showDomeSteppers?: boolean
}

const NOTCH_WIDTH = 13
const DEG_PER_STEP = 18
const PX_PER_STEP = 26
const SPRING_CONFIG = { damping: 30, mass: 0.5, stiffness: 300 }
const DEFAULT_ACCENT = "#fb7185"

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function snapToStep(v: number, min: number, max: number, step: number) {
  const stepped = Math.round((v - min) / step) * step + min
  return clamp(Number(stepped.toFixed(4)), min, max)
}

export function ExposureSlider({
  min = 1,
  max = 10,
  step = 1,
  value,
  defaultValue = 5,
  onChange,
  showIndicator = true,
  accentColor,
  label,
  variant = "arc",
  onStep,
  showDomeSteppers = true,
  className,
}: ExposureSliderProps) {
  const shouldReduceMotion = useReducedMotion()
  const isDraggingRef = React.useRef(false)
  const lastEmittedRef = React.useRef<number>(value ?? defaultValue)

  const initialVal = clamp(value ?? defaultValue, min, max)
  const [displayNum, setDisplayNum] = React.useState(() =>
    Math.round(snapToStep(initialVal, min, max, step))
  )

  const rawVal = useMotionValue(initialVal)
  const springVal = useSpring(rawVal, SPRING_CONFIG)
  const smoothVal = shouldReduceMotion ? rawVal : springVal

  React.useEffect(() => {
    if (value === undefined || isDraggingRef.current) return
    const clamped = clamp(value, min, max)
    lastEmittedRef.current = clamped
    rawVal.set(clamped)
    setDisplayNum(Math.round(clamped))
  }, [value, min, max, rawVal])

  useMotionValueEvent(smoothVal, "change", (latest) => {
    const rounded = Math.round(snapToStep(latest, min, max, step))
    setDisplayNum((prev) => (prev === rounded ? prev : rounded))
  })

  const emitIfChanged = React.useCallback(
    (nextSnapped: number) => {
      if (nextSnapped !== lastEmittedRef.current) {
        lastEmittedRef.current = nextSnapped
        onChange?.(nextSnapped)
      }
    },
    [onChange]
  )

  const stepBy = React.useCallback(
    (deltaSteps: number) => {
      if (onStep) {
        onStep(deltaSteps)
        return
      }
      const base = value ?? lastEmittedRef.current
      const next = snapToStep(base + deltaSteps * step, min, max, step)
      rawVal.set(next)
      setDisplayNum(Math.round(next))
      emitIfChanged(next)
    },
    [onStep, value, step, min, max, rawVal, emitIfChanged]
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const current = value ?? lastEmittedRef.current
      let next: number | null = null
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        next = snapToStep(current + step, min, max, step)
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        next = snapToStep(current - step, min, max, step)
      } else if (e.key === "Home") {
        next = min
      } else if (e.key === "End") {
        next = max
      }
      if (next === null) return
      e.preventDefault()
      rawVal.set(next)
      setDisplayNum(Math.round(next))
      emitIfChanged(next)
    },
    [value, step, min, max, rawVal, emitIfChanged]
  )

  return (
    <div
      className={cn(
        "flex w-full max-w-[500px] flex-col items-center gap-2.5 text-white",
        className
      )}
      style={
        { "--es-accent": accentColor ?? DEFAULT_ACCENT } as React.CSSProperties
      }
    >
      {label ? (
        <div className="text-[11.5px] font-medium tracking-wide text-white/75">
          {label}
        </div>
      ) : null}

      {showIndicator ? <SmokedGlassOrb displayNum={displayNum} /> : null}

      {variant === "arc" ? (
        <ConvexArcDial
          min={min}
          max={max}
          step={step}
          displayNum={displayNum}
          rawVal={rawVal}
          smoothVal={smoothVal}
          isDraggingRef={isDraggingRef}
          emitIfChanged={emitIfChanged}
          onStepPress={stepBy}
          showDomeSteppers={showDomeSteppers}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <LinearTickerDial
          min={min}
          max={max}
          step={step}
          displayNum={displayNum}
          rawVal={rawVal}
          smoothVal={smoothVal}
          isDraggingRef={isDraggingRef}
          emitIfChanged={emitIfChanged}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  )
}

/** 54px smoked-glass center orb matching the Stress 04:00 reference */
function SmokedGlassOrb({ displayNum }: { displayNum: number }) {
  return (
    <div className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full border border-white/[0.16] bg-[#0f0a0b]/85 shadow-[inset_0_-1.5px_1px_rgba(255,255,255,0.36),0_0_24px_rgba(251,113,133,0.18)] backdrop-blur-md">
      <span className="relative z-10 font-sans text-[20px] font-light tracking-tight text-white tabular-nums">
        <SubtleNumber value={displayNum} />
      </span>
    </div>
  )
}

/** Convex 140° semicircular radial dial (`37` ticks, tilted flanks, inner dome steppers) */
function ConvexArcDial({
  min,
  max,
  step,
  displayNum,
  rawVal,
  smoothVal,
  isDraggingRef,
  emitIfChanged,
  onStepPress,
  showDomeSteppers,
  onKeyDown,
}: {
  min: number
  max: number
  step: number
  displayNum: number
  rawVal: MotionValue<number>
  smoothVal: MotionValue<number>
  isDraggingRef: React.MutableRefObject<boolean>
  emitIfChanged: (val: number) => void
  onStepPress: (delta: number) => void
  showDomeSteppers: boolean
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  const dialRef = React.useRef<HTMLDivElement>(null)
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")

  const W = 280
  const H = 98
  const cx = W / 2
  const cy = 128
  const R = 112
  const midVal = (min + max) / 2

  const wheelRotation = useTransform(
    smoothVal,
    (v) => -(v - midVal) * DEG_PER_STEP
  )

  const ticks = React.useMemo(() => {
    const subStepsPerUnit = 4
    const totalSteps = Math.max(1, Math.round((max - min) / step))
    const totalTicks = totalSteps * subStepsPerUnit + 1
    // Guarantee at least 37 visual ticks across the dial
    const extraPad = Math.max(0, Math.ceil((37 - totalTicks) / 2))
    const list: { key: number; angle: number; major: boolean; inRange: boolean }[] = []
    for (let i = -extraPad; i < totalTicks + extraPad; i++) {
      const tickVal = min + (i / subStepsPerUnit) * step
      const angle = (tickVal - midVal) * DEG_PER_STEP
      const major = i % subStepsPerUnit === 0
      const inRange = i >= 0 && i < totalTicks
      list.push({ key: i, angle, major, inRange })
    }
    return list
  }, [min, max, step, midVal])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    const startX = e.clientX
    const startVal = rawVal.get()

    const handleMove = (mv: PointerEvent) => {
      const dx = mv.clientX - startX
      const next = clamp(startVal - dx / PX_PER_STEP, min, max)
      rawVal.set(next)
      emitIfChanged(snapToStep(next, min, max, step))
    }

    const handleUp = () => {
      isDraggingRef.current = false
      const snapped = snapToStep(rawVal.get(), min, max, step)
      rawVal.set(snapped)
      emitIfChanged(snapped)
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("pointercancel", handleUp)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("pointercancel", handleUp)
  }

  const prevNeighbour = displayNum - step >= min ? displayNum - step : null
  const nextNeighbour = displayNum + step <= max ? displayNum + step : null

  return (
    <div className="relative flex h-[104px] w-full max-w-[288px] flex-col items-center justify-start select-none">
      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-label="Шкала интенсивности"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={displayNum}
        onKeyDown={onKeyDown}
        onPointerDown={handlePointerDown}
        style={{ touchAction: "pan-y" }}
        className="relative flex h-full w-full cursor-grab flex-col items-center justify-start active:cursor-grabbing focus-visible:outline-none"
      >
        {/* Flanking tilted ghost digits sitting on the visible curved arc shoulders */}
        {prevNeighbour !== null ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-[14px] left-[54px] -rotate-[24deg] font-sans text-[13px] font-light text-white/32 tabular-nums transition-opacity duration-[var(--duration-quick)] motion-reduce:transition-none"
          >
            {prevNeighbour}
          </span>
        ) : null}
        {nextNeighbour !== null ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-[14px] right-[54px] rotate-[24deg] font-sans text-[13px] font-light text-white/32 tabular-nums transition-opacity duration-[var(--duration-quick)] motion-reduce:transition-none"
          >
            {nextNeighbour}
          </span>
        ) : null}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="pointer-events-none h-[98px] w-full overflow-visible"
        >
          <defs>
            {/* 140° convex edge-fade mask */}
            <linearGradient id={`es-arc-fade-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="14%" stopColor="white" stopOpacity="0.16" />
              <stop offset="32%" stopColor="white" stopOpacity="0.62" />
              <stop offset="50%" stopColor="white" stopOpacity="1" />
              <stop offset="68%" stopColor="white" stopOpacity="0.62" />
              <stop offset="86%" stopColor="white" stopOpacity="0.16" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask id={`es-arc-mask-${uid}`}>
              <rect x="0" y="0" width={W} height={H} fill={`url(#es-arc-fade-${uid})`} />
            </mask>
          </defs>

          {/* Soft interior dome arc line */}
          <path
            d={`M ${(cx - R * Math.sin((70 * Math.PI) / 180)).toFixed(1)} ${(cy - R * Math.cos((70 * Math.PI) / 180)).toFixed(1)} A ${R} ${R} 0 0 1 ${(cx + R * Math.sin((70 * Math.PI) / 180)).toFixed(1)} ${(cy - R * Math.cos((70 * Math.PI) / 180)).toFixed(1)}`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            mask={`url(#es-arc-mask-${uid})`}
          />

          {/* Rotating radial ticks wheel */}
          <g mask={`url(#es-arc-mask-${uid})`}>
            <m.g
              style={{
                rotate: wheelRotation,
                originX: `${cx}px`,
                originY: `${cy}px`,
              }}
            >
            {ticks.map((t) => {
              const rad = (t.angle * Math.PI) / 180
              const outerR = R + (t.major ? 2.5 : 0.5)
              const innerR = outerR - (t.major ? 10 : 6.5)
              const x1 = cx + innerR * Math.sin(rad)
              const y1 = cy - innerR * Math.cos(rad)
              const x2 = cx + outerR * Math.sin(rad)
              const y2 = cy - outerR * Math.cos(rad)
              return (
                <line
                  key={t.key}
                  x1={x1.toFixed(2)}
                  y1={y1.toFixed(2)}
                  x2={x2.toFixed(2)}
                  y2={y2.toFixed(2)}
                  stroke={
                    !t.inRange
                      ? "rgba(255,255,255,0.14)"
                      : t.major
                        ? "rgba(255,255,255,0.86)"
                        : "rgba(255,255,255,0.46)"
                  }
                  strokeWidth={t.major ? 1.5 : 1.15}
                  strokeLinecap="round"
                />
              )
            })}
            </m.g>
          </g>

          {/* Fixed 12 o'clock apex needle & dot */}
          <line
            x1={cx}
            y1={cy - R + 7.5}
            x2={cx}
            y2={cy - R - 5.5}
            stroke="var(--es-accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle
            cx={cx}
            cy={cy - R - 10}
            r="2.2"
            fill="var(--es-accent)"
          />
        </svg>
      </div>

      {/* Soft glass `<<` / `>>` stepper pills rendered outside role="slider" */}
      {showDomeSteppers ? (
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-10">
          <button
            type="button"
            aria-label="Уменьшить"
            onClick={() => onStepPress(-1)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.06] text-white/75 backdrop-blur-md transition-[transform,background-color,color] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.14] hover:text-white active:scale-95 motion-reduce:transition-none"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Увеличить"
            onClick={() => onStepPress(1)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.06] text-white/75 backdrop-blur-md transition-[transform,background-color,color] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.14] hover:text-white active:scale-95 motion-reduce:transition-none"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** Linear fallback variant (GPU scaleY instead of clipPath) */
function LinearTickerDial({
  min,
  max,
  step,
  displayNum,
  rawVal,
  smoothVal,
  isDraggingRef,
  emitIfChanged,
  onKeyDown,
}: {
  min: number
  max: number
  step: number
  displayNum: number
  rawVal: MotionValue<number>
  smoothVal: MotionValue<number>
  isDraggingRef: React.MutableRefObject<boolean>
  emitIfChanged: (val: number) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  const count = Math.floor((max - min) / step) + 1
  const midIdx = Math.floor((count - 1) / 2)
  const x = useTransform(smoothVal, (v) => {
    const idx = (v - min) / step
    return -(idx - midIdx) * NOTCH_WIDTH
  })

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    const startX = e.clientX
    const startVal = rawVal.get()

    const handleMove = (mv: PointerEvent) => {
      const dx = mv.clientX - startX
      const next = clamp(startVal - (dx / NOTCH_WIDTH) * step, min, max)
      rawVal.set(next)
      emitIfChanged(snapToStep(next, min, max, step))
    }

    const handleUp = () => {
      isDraggingRef.current = false
      const snapped = snapToStep(rawVal.get(), min, max, step)
      rawVal.set(snapped)
      emitIfChanged(snapped)
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("pointercancel", handleUp)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("pointercancel", handleUp)
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Шкала интенсивности"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={displayNum}
      onKeyDown={onKeyDown}
      className="relative flex h-9 w-full items-center justify-center focus-visible:outline-none"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
        style={{ backgroundColor: "var(--es-accent)" }}
      />
      <div
        className="relative h-full w-full cursor-grab select-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        style={{
          padding: `0 calc(50% - ${NOTCH_WIDTH / 2}px)`,
          touchAction: "pan-y",
        }}
      >
        <m.ul
          className="relative m-0 flex h-full list-none items-center p-0"
          style={{ marginLeft: -midIdx * NOTCH_WIDTH, x }}
        >
          {Array.from({ length: count }, (_, i) => (
            <LinearNotch key={i} index={i} midIdx={midIdx} x={x} />
          ))}
        </m.ul>
      </div>
    </div>
  )
}

function LinearNotch({
  index,
  midIdx,
  x,
}: {
  index: number
  midIdx: number
  x: MotionValue<number>
}) {
  const distance = useTransform(x, (latest) => {
    const currentCenter = midIdx + -latest / NOTCH_WIDTH
    return Math.abs(index - currentCenter)
  })
  const opacity = useTransform(distance, [0, 1, 3], [1, 0.58, 0.25])
  const scaleY = useTransform(distance, [0, 1, 2], [1, 0.72, 0.48])
  const isCenter = useTransform(distance, (d) => d < 0.5)
  const bg = useTransform(isCenter, (center) =>
    center ? "var(--es-accent)" : "rgba(255,255,255,0.85)"
  )

  return (
    <li className="relative shrink-0 grow-0" style={{ height: "fit-content" }}>
      <div style={{ padding: "0 5px" }}>
        <m.div
          className="rounded-full"
          style={{
            backgroundColor: bg,
            height: 32,
            opacity,
            scaleY,
            transformOrigin: "bottom",
            width: 3,
          }}
        />
      </div>
    </li>
  )
}

export default ExposureSlider
