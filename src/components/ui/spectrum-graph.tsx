import * as React from "react"
import { prefersReducedMotion } from "@/lib/motion"
import type { SpectrumAxis } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

export interface SpectrumGraphProps {
  axes: SpectrumAxis[]
  interactive?: boolean
  showBaseline?: boolean
  showLegend?: boolean
  onChangeAxis?: (id: string, val: number) => void
  className?: string
}

/**
 * Upgraded Reference Image #3: 5 horizontal bipolar trait axes with a smooth
 * vertical cubic Bezier sky-blue glowing trajectory, readable 9.5px labels,
 * warm coral highlight node, plus baseline legend & delta pill.
 */
export function SpectrumGraph({
  axes,
  interactive = false,
  showBaseline = false,
  showLegend,
  onChangeAxis,
  className,
}: SpectrumGraphProps) {
  const [activeIdx, setActiveIdx] = React.useState(1)
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const reduceMotion = prefersReducedMotion()

  const W = 342
  const rowH = 45
  const H = axes.length * rowH + 16
  const trackLeft = 86
  const trackRight = W - 86
  const trackW = trackRight - trackLeft

  const points = axes.map((a, idx) => ({
    x: trackLeft + a.current * trackW,
    y: 26 + idx * rowH,
    bx: trackLeft + a.baseline * trackW,
    axis: a,
  }))

  const activeAxis = axes[activeIdx]
  const deltaPct = activeAxis
    ? Math.round((activeAxis.current - activeAxis.baseline) * 100)
    : 0
  const shouldShowLegend = showLegend ?? showBaseline

  // Smooth vertical S-curve Bezier trajectory between horizontal axis rows
  const curvePath = React.useMemo(() => {
    if (points.length === 0) return ""
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const midY = (p1.y + p2.y) / 2
      d += ` C ${p1.x.toFixed(1)} ${midY.toFixed(1)}, ${p2.x.toFixed(1)} ${midY.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
  }, [points])

  const handleTrackPointer = (idx: number, e: React.PointerEvent<SVGRectElement>) => {
    if (!interactive || !onChangeAxis) return
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = W / rect.width
    const localX = (e.clientX - rect.left) * scaleX
    const ratio = Math.max(0.06, Math.min(0.94, (localX - trackLeft) / trackW))
    setActiveIdx(idx)
    onChangeAxis(axes[idx].id, +ratio.toFixed(2))
  }

  return (
    <div className={cn("w-full select-none", className)}>
      {shouldShowLegend ? (
        <div className="mb-1.5 flex items-center justify-between px-1.5 text-[10.5px]">
          <div className="flex items-center gap-2.5 text-white/58">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full border border-white/55 bg-[#0b0b12]" />
              Старт
            </span>
            <span className="text-white/28">·</span>
            <span className="inline-flex items-center gap-1 text-white/85">
              <span className="h-2 w-2 rounded-full border border-white bg-sky-300" />
              Сейчас
            </span>
          </div>
          {activeAxis ? (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums",
                deltaPct >= 0
                  ? "border-emerald-400/28 bg-emerald-500/[0.14] text-emerald-200"
                  : "border-amber-400/28 bg-amber-500/[0.14] text-amber-200"
              )}
            >
              {activeAxis.rightLabel}: {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
            </span>
          ) : null}
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        style={{ touchAction: interactive ? "none" : "auto" }}
      >
        <defs>
          <filter id={`glow-blue-${uid}`} x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="8.5" result="blur" />
          </filter>
          <filter id={`glow-coral-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
          </filter>
        </defs>

        {/* Horizontal axis lines + crisp bipolar labels */}
        {points.map((p, idx) => {
          const isHighlighted = idx === activeIdx
          return (
            <g key={p.axis.id}>
              {/* Left label */}
              {isHighlighted ? (
                <rect
                  x={1}
                  y={p.y - 11}
                  width={78}
                  height={22}
                  rx={11}
                  fill="rgba(255,255,255,0.1)"
                />
              ) : null}
              <text
                x={40}
                y={p.y + 3.2}
                textAnchor="middle"
                className={cn(
                  "font-sans text-[9px] font-semibold tracking-wide transition-colors duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)]",
                  isHighlighted ? "fill-white/90" : "fill-white/58"
                )}
              >
                {p.axis.leftLabel}
              </text>

              {/* Right label */}
              {isHighlighted ? (
                <rect
                  x={W - 79}
                  y={p.y - 11}
                  width={78}
                  height={22}
                  rx={11}
                  fill="rgba(255,255,255,0.12)"
                />
              ) : null}
              <text
                x={W - 40}
                y={p.y + 3.2}
                textAnchor="middle"
                className={cn(
                  "font-sans text-[9px] font-semibold tracking-wide transition-colors duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)]",
                  isHighlighted ? "fill-[#e8ff1f]" : "fill-white/85"
                )}
              >
                {p.axis.rightLabel}
              </text>

              {/* Axis hairline */}
              <line
                x1={trackLeft}
                y1={p.y}
                x2={trackRight}
                y2={p.y}
                stroke={isHighlighted ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.16)"}
                strokeWidth="1"
              />

              {/* Subtle reference dots along axis (matches Ref #3) */}
              {[0.2, 0.5, 0.8].map((tick) => (
                <circle
                  key={tick}
                  cx={trackLeft + tick * trackW}
                  cy={p.y}
                  r={2}
                  fill="rgba(255,255,255,0.22)"
                />
              ))}

              {/* Baseline comparison dot (when showBaseline is enabled) */}
              {showBaseline ? (
                <circle
                  cx={p.bx}
                  cy={p.y}
                  r={3.6}
                  fill="#0b0b12"
                  stroke="rgba(255,255,255,0.48)"
                  strokeWidth="1.4"
                />
              ) : null}
            </g>
          )
        })}

        {/* Soft blurred sky-blue glowing Bezier trajectory */}
        <path
          d={curvePath}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
          filter={`url(#glow-blue-${uid})`}
        />
        <path
          d={curvePath}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />

        {/* Active nodes + coral highlight on active row */}
        {points.map((p, idx) => {
          const isCoral = idx === activeIdx
          return (
            <g
              key={`node-${p.axis.id}`}
              onClick={() => setActiveIdx(idx)}
              className="cursor-pointer"
            >
              {isCoral ? (
                <>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={11.5}
                    fill="#fb923c"
                    opacity={0.78}
                    filter={`url(#glow-coral-${uid})`}
                  />
                  <circle cx={p.x} cy={p.y} r={8.5} fill="#fdba74" opacity={0.94} />
                </>
              ) : null}
              <circle
                cx={p.x}
                cy={p.y}
                r={isCoral ? 4.2 : 5.6}
                fill="#09090f"
                stroke="#ffffff"
                strokeWidth="1.8"
                style={{
                  transition: reduceMotion
                    ? "none"
                    : "cx var(--duration-fast) var(--ease-smooth-out)",
                }}
              />

              {/* Interactive touch/drag hit area */}
              {interactive ? (
                <rect
                  x={trackLeft - 10}
                  y={p.y - 18}
                  width={trackW + 20}
                  height={36}
                  fill="transparent"
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    handleTrackPointer(idx, e)
                  }}
                  onPointerMove={(e) => {
                    if (e.buttons === 1) handleTrackPointer(idx, e)
                  }}
                />
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
