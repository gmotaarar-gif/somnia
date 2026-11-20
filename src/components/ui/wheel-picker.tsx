"use client"

/**
 * Kokonut UI 3D Cylindrical Wheel Picker adapted to Somna OLED Dark Glass.
 * Preserves exact 3D drum geometry (`ITEM_HEIGHT = 34`, `ITEM_ANGLE = 20`, `COAST = 0.32`,
 * `stiffness: 140, damping: 24`) and clipped dual-drum rendering.
 */

import {
  type AnimationPlaybackControls,
  animate,
  type MotionValue,
  m,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion"
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  SOMNA_TIME_COLUMNS,
  type WheelColumn,
  type WheelOption,
} from "@/lib/wheelColumns"
import { cn } from "@/lib/utils"

const DEFAULT_VALUE: Record<string, string> = {
  hour: "23",
  minute: "30",
}

const ITEM_HEIGHT = 34
const ITEM_ANGLE = 20
const RADIUS =
  Math.round(
    (ITEM_HEIGHT / 2 / Math.tan((ITEM_ANGLE / 2) * (Math.PI / 180))) * 100
  ) / 100
const WINDOW = Math.ceil(90 / ITEM_ANGLE)
const VIEW_HEIGHT = Math.min(148, Math.round(RADIUS * 1.52))
const MAX_OVERSCROLL = 1.2
const VELOCITY_WINDOW_MS = 80
const TAP_SLOP = 4
const COAST = 0.32

const mod = (n: number, m: number) => ((n % m) + m) % m

function damp(distance: number, max: number) {
  return max * (1 - Math.exp(-distance / max))
}

function hapticTick() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(1)
  }
}

export interface WheelPickerProps {
  columns?: WheelColumn[]
  value?: Record<string, string>
  defaultValue?: Record<string, string>
  onValueChange?: (value: Record<string, string>) => void
  label?: string
  className?: string
}

export function WheelPicker({
  columns = SOMNA_TIME_COLUMNS,
  value: valueProp,
  defaultValue = DEFAULT_VALUE,
  onValueChange,
  label = "Выбор времени",
  className,
}: WheelPickerProps) {
  const [internal, setInternal] = useState(defaultValue)
  const value = valueProp ?? internal
  const latestValue = useRef(value)
  useEffect(() => {
    latestValue.current = value
  }, [value])

  const select = (columnId: string, optionValue: string) => {
    const current = latestValue.current
    if (current[columnId] === optionValue) {
      return
    }
    const next = { ...current, [columnId]: optionValue }
    latestValue.current = next
    if (valueProp === undefined) {
      setInternal(next)
    }
    onValueChange?.(next)
  }

  return (
    <div
      aria-label={label}
      className={cn(
        "relative flex select-none items-center justify-center gap-1 rounded-[22px] border border-white/12 bg-[#0b0c14] px-2.5 shadow-inner",
        className
      )}
      role="group"
    >
      {/* Frosted glass selection band */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/[0.08]"
        style={{ height: ITEM_HEIGHT }}
      />
      {/* Neon-lime hairline ticks on either side of the band */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1 h-[2px] w-1.5 -translate-y-1/2 rounded-full bg-[#e8ff1f]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-1 h-[2px] w-1.5 -translate-y-1/2 rounded-full bg-[#e8ff1f]"
      />

      {columns.map((column, idx) => (
        <div key={column.id} className="flex items-center">
          {idx > 0 ? (
            <span
              aria-hidden
              className="pointer-events-none z-10 px-0.5 font-mono text-base font-bold text-white/55"
            >
              :
            </span>
          ) : null}
          <WheelColumnView
            column={column}
            onSelect={(optionValue) => select(column.id, optionValue)}
            selected={value[column.id]}
          />
        </div>
      ))}
    </div>
  )
}

function WheelColumnView({
  column,
  selected,
  onSelect,
}: {
  column: WheelColumn
  selected: string | undefined
  onSelect: (value: string) => void
}) {
  const { options, loop = false } = column
  const count = options.length
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === selected),
    0
  )
  const reduceMotion = useReducedMotion()

  const position = useMotionValue(selectedIndex)
  const [center, setCenter] = useState(selectedIndex)
  const animation = useRef<AnimationPlaybackControls | null>(null)
  const pointerType = useRef("mouse")
  const drag = useRef<{
    id: number
    startY: number
    startPosition: number
    moved: boolean
    samples: { t: number; v: number }[]
  } | null>(null)
  const columnRef = useRef<HTMLDivElement>(null)

  const drum = useTransform(
    position,
    (p) => `translateZ(${-RADIUS}px) rotateX(${p * ITEM_ANGLE}deg)`
  )

  const optionAt = (index: number) => options[mod(index, count)]

  useMotionValueEvent(position, "change", (p) => {
    const rounded = Math.round(p)
    if (rounded !== center) {
      setCenter(rounded)
      if (pointerType.current === "touch") {
        hapticTick()
      }
    }
  })

  useEffect(() => {
    if (drag.current || animation.current) {
      return
    }
    const current = mod(Math.round(position.get()), count)
    if (current === selectedIndex) {
      return
    }
    let delta = selectedIndex - current
    if (loop && Math.abs(delta) > count / 2) {
      delta -= Math.sign(delta) * count
    }
    position.jump(Math.round(position.get()) + delta)
  }, [selectedIndex, count, loop, position])

  useEffect(() => () => animation.current?.stop(), [])

  const settle = () => {
    animation.current = null
    onSelect(optionAt(Math.round(position.get())).value)
  }

  const clampIndex = (index: number) =>
    loop ? index : Math.min(Math.max(index, 0), count - 1)

  const goTo = (target: number) => {
    animation.current?.stop()
    animation.current = null
    if (reduceMotion) {
      position.jump(target)
      settle()
      return
    }
    animation.current = animate(position, target, {
      type: "spring",
      duration: 0.4,
      bounce: 0.15,
      restDelta: 0.001,
      onComplete: settle,
    })
  }

  const withOverscroll = (raw: number) => {
    if (loop) return raw
    if (raw < 0) return -damp(-raw, MAX_OVERSCROLL)
    if (raw > count - 1) return count - 1 + damp(raw - (count - 1), MAX_OVERSCROLL)
    return raw
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    animation.current?.stop()
    animation.current = null
    pointerType.current = event.pointerType
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      id: event.pointerId,
      startY: event.clientY,
      startPosition: position.get(),
      moved: false,
      samples: [{ t: event.timeStamp, v: position.get() }],
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    const dy = event.clientY - current.startY
    if (!current.moved && Math.abs(dy) < TAP_SLOP) return
    current.moved = true
    const raw = current.startPosition - dy / ITEM_HEIGHT
    position.set(withOverscroll(raw))
    current.samples.push({ t: event.timeStamp, v: raw })
    while (
      current.samples.length > 2 &&
      event.timeStamp - current.samples[0].t > VELOCITY_WINDOW_MS
    ) {
      current.samples.shift()
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    drag.current = null

    if (!current.moved && event.type !== "pointerup") {
      goTo(clampIndex(Math.round(position.get())))
      return
    }
    if (!current.moved) {
      const rect = event.currentTarget.getBoundingClientRect()
      const offsetY = event.clientY - (rect.top + rect.height / 2)
      const ratio = Math.max(-1, Math.min(1, offsetY / RADIUS))
      const rows = Math.round((Math.asin(ratio) * 180) / Math.PI / ITEM_ANGLE)
      goTo(clampIndex(Math.round(position.get()) + rows))
      return
    }

    const first = current.samples[0]
    const last = current.samples.at(-1) ?? first
    const elapsed = (last.t - first.t) / 1000
    const paused = event.timeStamp - last.t > VELOCITY_WINDOW_MS
    const velocity = elapsed > 0 && !paused ? (last.v - first.v) / elapsed : 0
    const p = position.get()
    const outOfBounds = !loop && (p < 0 || p > count - 1)

    if (reduceMotion || outOfBounds || Math.abs(velocity) < 2) {
      goTo(clampIndex(Math.round(p)))
      return
    }

    animation.current?.stop()
    const target = clampIndex(Math.round(p + velocity * COAST))
    animation.current = animate(position, target, {
      type: "spring",
      velocity,
      stiffness: 140,
      damping: 24,
      restDelta: 0.005,
      onComplete: settle,
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = Math.round(position.get())
    const moves: Record<string, number> = {
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: 5,
      PageDown: -5,
    }
    let target: number
    if (event.key === "Home") {
      target = index - mod(index, count)
    } else if (event.key === "End") {
      target = index - mod(index, count) + count - 1
    } else if (event.key in moves) {
      target = clampIndex(index + moves[event.key])
    } else {
      return
    }
    event.preventDefault()
    animation.current?.stop()
    pointerType.current = "keyboard"
    position.jump(target)
    settle()
  }

  const wheel = useRef({ loop, count, goTo, clampIndex })
  useEffect(() => {
    wheel.current = { loop, count, goTo, clampIndex }
  })
  useEffect(() => {
    const node = columnRef.current
    if (!node) return
    let timer: number | undefined
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const latest = wheel.current
      animation.current?.stop()
      animation.current = null
      pointerType.current = "mouse"
      const raw = position.get() + (event.deltaY / ITEM_HEIGHT) * 0.4
      position.set(
        latest.loop
          ? raw
          : Math.min(Math.max(raw, -0.4), latest.count - 1 + 0.4)
      )
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const settled = wheel.current
        settled.goTo(settled.clampIndex(Math.round(position.get())))
      }, 120)
    }
    node.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      node.removeEventListener("wheel", onWheel)
      window.clearTimeout(timer)
    }
  }, [position])

  const rows: number[] = []
  for (let i = center - WINDOW; i <= center + WINDOW; i++) {
    if (loop || (i >= 0 && i < count)) {
      rows.push(i)
    }
  }

  return (
    <div
      aria-label={column.label}
      aria-valuemax={count - 1}
      aria-valuemin={0}
      aria-valuenow={selectedIndex}
      aria-valuetext={options[selectedIndex]?.label}
      className={cn(
        "relative cursor-grab touch-none rounded-lg outline-none active:cursor-grabbing",
        "focus-visible:ring-2 focus-visible:ring-[#e8ff1f]/60 focus-visible:ring-inset",
        column.className ?? "w-15"
      )}
      onKeyDown={handleKeyDown}
      onLostPointerCapture={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={columnRef}
      role="spinbutton"
      style={{ height: VIEW_HEIGHT }}
      tabIndex={0}
    >
      <div
        className="absolute inset-0"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, #000 32%, #000 68%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, #000 32%, #000 68%, transparent 100%)",
        }}
      >
        <Drum
          drum={drum}
          optionAt={optionAt}
          rowClassName="text-white/32 font-mono text-[17px]"
          rows={rows}
        />
        <Drum
          clip
          drum={drum}
          optionAt={optionAt}
          rowClassName="font-mono font-semibold text-white text-[18px]"
          rows={rows}
        />
      </div>
    </div>
  )
}

function Drum({
  drum,
  rows,
  optionAt,
  rowClassName,
  clip = false,
}: {
  drum: MotionValue<string>
  rows: number[]
  optionAt: (index: number) => WheelOption
  rowClassName: string
  clip?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        perspective: 900,
        clipPath: clip
          ? `inset(calc(50% - ${ITEM_HEIGHT / 2}px) 0 calc(50% - ${ITEM_HEIGHT / 2}px) 0)`
          : undefined,
      }}
    >
      <m.div
        className="absolute inset-x-0 top-1/2"
        style={{ transform: drum, transformStyle: "preserve-3d" }}
      >
        {rows.map((index) => (
          <div
            className={cn(
              "absolute inset-x-0 flex items-center justify-center tabular-nums [backface-visibility:hidden]",
              rowClassName
            )}
            key={index}
            style={{
              top: -ITEM_HEIGHT / 2,
              height: ITEM_HEIGHT,
              transform: `rotateX(${-index * ITEM_ANGLE}deg) translateZ(${RADIUS}px)`,
            }}
          >
            {optionAt(index).label}
          </div>
        ))}
      </m.div>
    </div>
  )
}

export default WheelPicker
