import * as React from "react"
import { cn } from "@/lib/cn"
import { STAGE_META, hypnogram, stageTotals, type Stage } from "@/lib/features"
import { durationRu } from "@/lib/time"
import type { SleepNight } from "@/store/store"

const STAGES: Stage[] = ["deep", "light", "rem", "awake"]
const LABELS: Record<Stage, string> = { deep: "Глубокий", light: "Лёгкий", rem: "REM", awake: "Бодрств." }

/** Round cumulative minutes so the displayed phases still add up to the night. */
export function stageMinutes(night: SleepNight): Record<Stage, number> {
  const totals = stageTotals(hypnogram(night))
  let elapsed = 0
  let rounded = 0
  for (const stage of STAGES) {
    elapsed += totals[stage]
    const next = Math.round(elapsed)
    totals[stage] = next - rounded
    rounded = next
  }
  return totals
}

export function Hypnogram({ night, className, compact = false }: { night: SleepNight; className?: string; compact?: boolean }) {
  const id = React.useId()
  const segs = React.useMemo(() => hypnogram(night), [night])
  const total = segs.reduce((a, s) => a + s.min, 0)
  const left = compact ? 4 : 62
  const right = 312
  let x = left
  const path = segs.map((s, i) => {
    const y = 12 + STAGE_META[s.stage].level * 27
    const start = x
    x += (s.min / total) * (right - left)
    return `${i === 0 ? `M${start},${y}` : ` V${y}`} H${x}`
  }).join("")

  return (
    <svg viewBox={`0 0 320 ${compact ? 106 : 126}`} className={cn("w-full", className)} role="img" aria-label={`Оценка фаз сна с ${night.bedtime} до ${night.wakeTime}. Не измерение датчиком.`}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd17a" />
          <stop offset="30%" stopColor="#6ce3e6" />
          <stop offset="65%" stopColor="#84a3ff" />
          <stop offset="100%" stopColor="#b5a0ff" />
        </linearGradient>
      </defs>
      {!compact && (["awake", "rem", "light", "deep"] as Stage[]).map((st) => (
        <g key={st}>
          <text x="0" y={15 + STAGE_META[st].level * 27} fontSize="9" fill="currentColor" fillOpacity="0.58">{LABELS[st]}</text>
          <line x1={left} x2={right} y1={12 + STAGE_META[st].level * 27} y2={12 + STAGE_META[st].level * 27} stroke="currentColor" strokeOpacity="0.07" strokeDasharray="2 5" />
        </g>
      ))}
      <path d={path} fill="none" stroke={`url(#${id})`} strokeWidth={compact ? 3 : 3.5} strokeLinecap="round" strokeLinejoin="round" />
      {!compact && (
        <g fill="currentColor" fillOpacity="0.65" fontSize="10">
          <text x={left} y="119">{night.bedtime}</text>
          <text x={right} y="119" textAnchor="end">{night.wakeTime}</text>
        </g>
      )}
    </svg>
  )
}

export function StageLegend({ night }: { night: SleepNight }) {
  const totals = React.useMemo(() => stageMinutes(night), [night])
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full" aria-hidden>
        {STAGES.map((st) => <span key={st} style={{ flex: totals[st], background: STAGE_META[st].color }} />)}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {STAGES.map((st) => (
          <div key={st}>
            <div className="flex items-center gap-1 text-[10px] text-white/65">
              <span className="size-1.5 rounded-full" style={{ background: STAGE_META[st].color }} />{LABELS[st]}
            </div>
            <div className="mt-1 text-[11px] font-medium tabular-nums">{durationRu(Math.round(totals[st]))}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
