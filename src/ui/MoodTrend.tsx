import * as React from "react"
import { sampleValencePalette } from "@/lib/valence"
import { smoothPath } from "@/ui/charts"

interface Day {
  key: string
  label: string
  value: number | null
}

/** A fixed -1…1 scale keeps quiet weeks comparable with more variable ones. */
export function MoodTrend({ days }: { days: Day[] }) {
  const id = React.useId()
  const points = days.map((d, i) => ({
    ...d,
    x: 78 + (i / Math.max(1, days.length - 1)) * 230,
    y: 18 + (1 - Math.max(-1, Math.min(1, d.value ?? 0))) * 66,
  }))
  // Missing check-ins are gaps, not invented daily averages.
  const runs: [number, number][][] = []
  let run: [number, number][] = []
  for (const p of points) {
    if (p.value == null) {
      if (run.length) runs.push(run)
      run = []
    } else run.push([p.x, p.y])
  }
  if (run.length) runs.push(run)
  const count = days.filter((d) => d.value != null).length

  return (
    <div>
      <svg viewBox="0 0 320 184" className="w-full" role="img" aria-label={`Настроение по дням: ${count} из ${days.length} дней с записями. Шкала от неприятного до приятного.`}>
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="78" x2="308">
            {points.map((p, i) => (
              <stop key={p.key} offset={`${(i / Math.max(1, points.length - 1)) * 100}%`} stopColor={`rgb(${sampleValencePalette(p.value ?? 0).mid.join(" ")})`} />
            ))}
          </linearGradient>
        </defs>
        {[["Приятно", 18], ["Нейтрально", 84], ["Неприятно", 150]].map(([label, y]) => (
          <g key={label}>
            <text x="0" y={Number(y) + 3} fill="rgb(255 255 255 / 0.55)" fontSize="10">{label}</text>
            <line x1="78" x2="308" y1={y} y2={y} stroke="rgb(255 255 255 / 0.055)" strokeDasharray="2 5" />
          </g>
        ))}
        {runs.map((pts, i) => pts.length === 1 ? (
          <circle key={i} cx={pts[0][0]} cy={pts[0][1]} r="3" fill={`url(#${id})`} />
        ) : (
          <path key={i} d={smoothPath(pts, 0.14)} fill="none" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {points.filter((_, i) => i % 2 === (points.length - 1) % 2).map((p) => (
          <text key={p.key} x={p.x} y="177" textAnchor="middle" fill="rgb(255 255 255 / 0.5)" fontSize="10">{p.label}</text>
        ))}
      </svg>
      {count === 0 && <p className="mt-2 text-[13px] text-ink-2">График появится после первого чек-ина.</p>}
    </div>
  )
}
