"use client"

import { cn } from "@/lib/utils"
import { motion, useReducedMotion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"

export interface ScrubberProps {
  /** Additional CSS classes */
  className?: string
  /** Number of decimal places to display */
  decimals?: number
  /** Default value for uncontrolled usage */
  defaultValue?: number
  /** Label displayed on the left side of the track */
  label?: string
  /** Optional unit suffix on the right side (e.g. '%', 'мин') */
  unit?: string
  /** Maximum value */
  max?: number
  /** Minimum value */
  min?: number
  /** Called when value changes during interaction */
  onValueChange?: (value: number) => void
  /** Step increment */
  step?: number
  /** Number of tick marks (0 to hide) */
  ticks?: number
  /** Controlled value */
  value?: number
}

const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max)

const roundToStep = (val: number, step: number, min: number) =>
  Math.round((val - min) / step) * step + min

export function Scrubber({
  label = "Значение",
  unit = "",
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  decimals = 0,
  ticks = 9,
  className,
}: ScrubberProps) {
  const shouldReduceMotion = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isHoverDevice, setIsHoverDevice] = useState(false)

  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const range = max - min
  const percentage = range > 0 ? ((value - min) / range) * 100 : 0
  const isActive = isDragging || (isHoverDevice && isHovering)

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)")
    setIsHoverDevice(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsHoverDevice(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const setValue = useCallback(
    (newValue: number) => {
      const clamped = clamp(roundToStep(newValue, step, min), min, max)
      if (!isControlled) {
        setInternalValue(clamped)
      }
      onValueChange?.(clamped)
    },
    [step, min, max, isControlled, onValueChange]
  )

  const getValueFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return value
      const rect = track.getBoundingClientRect()
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      return min + ratio * range
    },
    [min, range, value]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      trackRef.current?.setPointerCapture(e.pointerId)
      setIsDragging(true)
      setValue(getValueFromPointer(e.clientX))
    },
    [getValueFromPointer, setValue]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      setValue(getValueFromPointer(e.clientX))
    },
    [isDragging, getValueFromPointer, setValue]
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next: number | undefined
      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          next = value + step
          break
        case "ArrowLeft":
        case "ArrowDown":
          next = value - step
          break
        case "Home":
          next = min
          break
        case "End":
          next = max
          break
        default:
          return
      }
      e.preventDefault()
      setValue(next)
    },
    [value, step, min, max, setValue]
  )

  const springConfig = shouldReduceMotion
    ? { duration: 0 }
    : { bounce: 0.1, duration: 0.25, type: "spring" as const }

  return (
    <div className={cn("relative w-full select-none", className)}>
      <div
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={Number(value.toFixed(decimals))}
        className="relative cursor-ew-resize overflow-hidden rounded-full border border-white/12 bg-white/[0.06] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#e8ff1f]"
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={trackRef}
        role="slider"
        style={{
          height: 40,
          touchAction: "none",
        }}
        tabIndex={0}
      >
        {/* Fill indicator */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#e8ff1f]/18 to-[#e8ff1f]/28"
          style={{
            transition:
              isDragging || shouldReduceMotion
                ? "none"
                : "width var(--duration-quick) var(--ease-smooth-out)",
            width: `${percentage}%`,
          }}
        />

        {/* Tick marks */}
        {ticks > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: ticks }, (_, i) => {
              const pos = ((i + 1) / (ticks + 1)) * 100
              return (
                <div
                  className="absolute top-1/2 bg-white/22"
                  key={pos}
                  style={{
                    borderRadius: 999,
                    height: 7,
                    left: `${pos}%`,
                    transform: "translateX(-50%) translateY(-50%)",
                    width: 1,
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Scrub bar (capsule thumb) */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${percentage}%`,
            top: "50%",
            transform: "translateX(-50%) translateY(-50%)",
            transition:
              isDragging || shouldReduceMotion
                ? "none"
                : "left var(--duration-quick) var(--ease-smooth-out)",
            zIndex: 3,
          }}
        >
          <motion.div
            animate={{
              opacity: isActive ? 1 : 0.45,
              scaleX: isActive ? 1 : 0.78,
              scaleY: isActive ? 1 : 0.78,
            }}
            className="bg-[#e8ff1f] shadow-[0_0_10px_rgba(232,255,31,0.55)]"
            style={{
              borderRadius: 999,
              height: 24,
              width: 4,
            }}
            transition={springConfig}
          />
        </div>

        {/* Label */}
        <div
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 whitespace-nowrap text-white/85"
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            zIndex: 4,
          }}
        >
          {label}
        </div>

        {/* Value display */}
        <div
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-[#e8ff1f] tabular-nums"
          style={{
            fontSize: 13,
            fontWeight: 600,
            zIndex: 4,
          }}
        >
          {value.toFixed(decimals)}
          {unit ? <span className="ml-0.5 text-[11px] text-white/60">{unit}</span> : null}
        </div>
      </div>
    </div>
  )
}

export default Scrubber
