import type { CSSProperties } from "react"
import { spanMinutes, timeToMinutes } from "@/lib/time"

const START = 18 * 60
const DOTS = 48
const DAY = 1440
/** Minutes after 18:00, where the line begins. */
const along = (time: string) => (timeToMinutes(time) - START + DAY) % DAY

/** A night drawn on a dotted day that starts at 18:00: ticks from bedtime to
 * waking, with two lime marks for the hours the sleeper planned to keep. */
export function NightLine({ bedtime, wakeTime, goal, className }: {
  bedtime: string
  wakeTime: string
  goal?: { bed: string; wake: string }
  className?: string
}) {
  const from = along(bedtime)
  const asleep = bedtime === wakeTime ? 0 : spanMinutes(bedtime, wakeTime)
  // Half-hour slots asleep, as runs of [first, length]: a night that is still
  // going at 18:00 carries on from the start of the line.
  const first = Math.ceil(from / 30)
  const slots = Math.min(DOTS, Math.max(0, Math.ceil((from + asleep) / 30) - first))
  const runs = [[first % DOTS, Math.min(slots, DOTS - (first % DOTS))], [0, slots - (DOTS - (first % DOTS))]].filter(([, length]) => length > 0)
  return (
    <div className={className} aria-hidden>
      <div className="night-line">
        <span className="night-line-rest" />
        {runs.map(([start, length]) => (
          <span key={start} className="night-line-lit" style={{ "--a": start, "--k": length } as CSSProperties} />
        ))}
        {goal && [goal.bed, goal.wake].map((time, i) => (
          <span key={i} className="absolute -top-2.5 h-2 w-[2px] -translate-x-1/2 rounded-full bg-lime" style={{ left: `${(along(time) / DAY) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-4 text-[11px] tabular-nums text-white/55">
        <span>18:00</span>
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
      </div>
    </div>
  )
}
