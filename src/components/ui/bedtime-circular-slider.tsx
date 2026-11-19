import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { DotMatrix } from "@/components/ui/dot-matrix"
import { cn } from "@/lib/utils"

export interface BedtimeCircularSliderProps {
  bedtime: string // "HH:MM"
  wakeTime: string // "HH:MM"
  onChange: (bedtime: string, wakeTime: string) => void
  size?: number
  className?: string
}

function timeToAngle(t: string): number {
  const [h, m] = t.split(":").map(Number)
  const mins = ((h || 0) * 60 + (m || 0)) % 1440
  return (mins / 1440) * 360
}

function angleToTime(angle: number): string {
  const norm = ((angle % 360) + 360) % 360
  const rawMins = Math.round((norm / 360) * 1440)
  const snapped = (Math.round(rawMins / 5) * 5) % 1440
  const hh = String(Math.floor(snapped / 60)).padStart(2, "0")
  const mm = String(snapped % 60).padStart(2, "0")
  return `${hh}:${mm}`
}

function isAngleInSleepWindow(angle: number, start: number, end: number) {
  const a = ((angle % 360) + 360) % 360
  const s = ((start % 360) + 360) % 360
  const e = ((end % 360) + 360) % 360
  if (s <= e) return a >= s && a <= e
  return a >= s || a <= e
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  let sweep = endAngle - startAngle
  if (sweep < 0) sweep += 360
  const largeArcFlag = sweep > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

export function BedtimeCircularSlider({
  bedtime,
  wakeTime,
  onChange,
  size = 232,
  className,
}: BedtimeCircularSliderProps) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = React.useState<"bed" | "wake" | null>(null)

  const bedAngle = timeToAngle(bedtime)
  const wakeAngle = timeToAngle(wakeTime)

  let diffAngle = wakeAngle - bedAngle
  if (diffAngle <= 0) diffAngle += 360
  const totalMins = Math.round((diffAngle / 360) * 1440)
  const durH = Math.floor(totalMins / 60)
  const durM = totalMins % 60
  const durDisplay = `${durH}:${String(durM).padStart(2, "0")}`

  const cx = size / 2
  const cy = size / 2
  const strokeW = 24
  const r = size / 2 - strokeW / 2 - 10

  const updateFromPointer = React.useCallback(
    (clientX: number, clientY: number, handle: "bed" | "wake") => {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const dx = clientX - (rect.left + rect.width / 2)
      const dy = clientY - (rect.top + rect.height / 2)
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90
      if (deg < 0) deg += 360
      const nextTime = angleToTime(deg)
      if (handle === "bed") onChange(nextTime, wakeTime)
      else onChange(bedtime, nextTime)
    },
    [bedtime, wakeTime, onChange]
  )

  React.useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => {
      updateFromPointer(e.clientX, e.clientY, dragging)
    }
    const onUp = () => setDragging(null)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [dragging, updateFromPointer])

  const bedPos = polarToCartesian(cx, cy, r, bedAngle)
  const wakePos = polarToCartesian(cx, cy, r, wakeAngle)

  return (
    <div className={cn("flex flex-col items-center select-none", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
          style={{ touchAction: "none" }}
        >
          <defs>
            <linearGradient id="somna-sleep-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="55%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#e8ff1f" />
            </linearGradient>
          </defs>

          {/* Precision outer concentric hairline ring (Veri reference) */}
          <circle
            cx={cx}
            cy={cy}
            r={r + strokeW / 2 + 5}
            fill="none"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1"
          />

          {/* Outer dial track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeW}
          />

          {/* 72 radial precision ticks with active sleep window highlight */}
          {Array.from({ length: 72 }).map((_, i) => {
            const a = (i / 72) * 360
            const major = i % 9 === 0
            const active = isAngleInSleepWindow(a, bedAngle, wakeAngle)
            const p1 = polarToCartesian(cx, cy, r - strokeW / 2 - 4, a)
            const p2 = polarToCartesian(cx, cy, r - strokeW / 2 - (major ? 11 : 7.5), a)
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={
                  active
                    ? major
                      ? "rgba(232,255,31,0.78)"
                      : "rgba(255,255,255,0.34)"
                    : major
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.11)"
                }
                strokeWidth={major ? 1.5 : 0.95}
                strokeLinecap="round"
              />
            )
          })}

          {/* Hour labels */}
          {[
            [0, "00"],
            [90, "06"],
            [180, "12"],
            [270, "18"],
          ].map(([deg, label]) => {
            const p = polarToCartesian(cx, cy, r - strokeW / 2 - 22, Number(deg))
            return (
              <text
                key={label}
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                className="fill-white/35 font-mono text-[9.5px] font-medium"
              >
                {label}
              </text>
            )
          })}

          {/* Active sleep arc */}
          <path
            d={describeArc(cx, cy, r, bedAngle, wakeAngle)}
            fill="none"
            stroke="url(#somna-sleep-arc)"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Bedtime handle */}
          <g
            transform={`translate(${bedPos.x}, ${bedPos.y})`}
            onPointerDown={(e) => {
              e.preventDefault()
              setDragging("bed")
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <circle r={strokeW / 2 + 1} fill="#121324" stroke="#818cf8" strokeWidth="2" />
          </g>

          {/* Wake handle */}
          <g
            transform={`translate(${wakePos.x}, ${wakePos.y})`}
            onPointerDown={(e) => {
              e.preventDefault()
              setDragging("wake")
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <circle r={strokeW / 2 + 1} fill="#141808" stroke="#e8ff1f" strokeWidth="2" />
          </g>
        </svg>

        {/* Handle icons positioned cleanly */}
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-indigo-300"
          style={{ left: bedPos.x, top: bedPos.y }}
        >
          <Moon className="h-3.5 w-3.5" />
        </div>
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[#e8ff1f]"
          style={{ left: wakePos.x, top: wakePos.y }}
        >
          <Sun className="h-3.5 w-3.5" />
        </div>

        {/* Center readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-medium tracking-wider text-white/45 uppercase">
            Цель сна
          </span>
          <DotMatrix value={durDisplay} size="md" instant={dragging !== null} className="mt-1.5" />
          <span className="mt-1 text-[11px] text-white/50">часов в постели</span>
        </div>
      </div>

      {/* Bottom bedtime / wake pills */}
      <div className="mt-3 grid w-full grid-cols-2 gap-2.5">
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Moon className="h-3.5 w-3.5 text-indigo-400" />
            <span>Отбой</span>
          </div>
          <span className="font-mono text-sm font-semibold text-white">{bedtime}</span>
        </div>
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Sun className="h-3.5 w-3.5 text-[#e8ff1f]" />
            <span>Подъём</span>
          </div>
          <span className="font-mono text-sm font-semibold text-white">{wakeTime}</span>
        </div>
      </div>
    </div>
  )
}
