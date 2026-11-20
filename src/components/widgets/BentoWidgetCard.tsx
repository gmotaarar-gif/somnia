import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { m } from "framer-motion"
import {
  ArrowUpRight,
  ChevronRight,
  GripHorizontal,
  Maximize2,
  Minimize2,
  Plus,
  X,
} from "lucide-react"
import { GlowCard } from "@/components/ui/glow-card"
import { DotMatrix } from "@/components/ui/dot-matrix"
import { DottedTrack, HopArcs } from "@/components/ui/dotted-track"
import { RadialGauge } from "@/components/ui/radial-gauge"
import { TickBar } from "@/components/ui/tick-bar"
import { Switch } from "@/components/ui/controls"
import {
  IconSwap,
  PopNumber,
  SubtleNumber,
  SuccessCheck,
  TextMorph,
  TextStatesSwap,
  TextSwapSoft,
  TiltCard,
} from "@/components/ui/t-motion"
import {
  SOMNA_TRANSITIONS,
  prefersReducedMotion,
  smoothSvgPath,
  useNow,
} from "@/lib/motion"
import { computeBedtimeCountdown, pluralRu } from "@/lib/sleepInsights"
import { getBedtimeDeviationMin, getTargetDurationMin } from "@/lib/sleepTime"
import {
  useSomna,
  useStressTimer,
  type BentoPeriod,
  type BentoWidgetItem,
  type MoodEntry,
  type SleepNight,
  type StressTimerState,
} from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

interface BentoWidgetCardProps {
  widget: BentoWidgetItem
  index?: number
}

const TECHNIQUE_LABELS: Record<StressTimerState["technique"], string> = {
  stress: "4-4-6",
  "478": "4-7-8",
  box: "4×4",
}

function BreathTechniqueText() {
  const { stressTimer } = useStressTimer()
  return <>{TECHNIQUE_LABELS[stressTimer.technique]}</>
}

export function BentoWidgetCard({ widget, index = 0 }: BentoWidgetCardProps) {
  const {
    sleepHistory,
    moodHistory,
    bentoPeriod,
    bedtimeGoal,
    wakeGoal,
    reminderEnabled,
    reminderTime,
    streakDays,
    eveningDetox,
    setEveningDetox,
    breathMinutes,
    addBreathMinutes,
    waterMl,
    addWater,
    editWidgetsMode,
    toggleWidgetSize,
    removeWidget,
    incrementCustomWidget,
    setActiveTab,
  } = useSomna()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: widget.id,
      disabled: !editWidgetsMode,
    })

  const targetDurMin = getTargetDurationMin(bedtimeGoal, wakeGoal)
  const latestSleep: SleepNight = sleepHistory[sleepHistory.length - 1] ?? {
    id: "fallback",
    date: "Сегодня",
    dayShort: "Вс",
    bedtime: bedtimeGoal,
    wakeTime: wakeGoal,
    durationMin: targetDurMin,
    quality: 82,
    awakenings: 0,
  }
  const isWide = widget.size === "2x1"

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 40 : 1,
  }

  const handleCardClick = () => {
    if (editWidgetsMode) return
    if (
      widget.kind === "sleep-quality" ||
      widget.kind === "sleep-phases" ||
      widget.kind === "weekly-capsules"
    ) {
      setActiveTab("sleep")
    } else if (widget.kind === "breath-volume") {
      setActiveTab("practices")
    } else if (
      widget.kind === "bio-stream" ||
      widget.kind === "morning-energy" ||
      widget.kind === "body-report" ||
      widget.kind === "mood-waves"
    ) {
      setActiveTab("analytics")
    }
  }

  const heightClass =
    widget.kind === "evening-detox" && isWide
      ? "min-h-[92px]"
      : widget.kind === "bio-stream" && isWide
        ? "min-h-[224px]"
        : (widget.kind === "sleep-phases" ||
              widget.kind === "mood-waves" ||
              widget.kind === "body-report") &&
            isWide
          ? "min-h-[200px]"
          : "min-h-[176px]"

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isWide ? "col-span-2" : "col-span-1",
        isDragging
          ? "scale-[1.03] opacity-90 drop-shadow-[0_20px_36px_rgba(0,0,0,0.75)]"
          : "opacity-100"
      )}
    >
      <m.div
        layout
        transition={SOMNA_TRANSITIONS.cardSpring}
        style={{
          animationDelay: editWidgetsMode ? `${(index % 5) * -55}ms` : undefined,
        }}
        className={cn(
          "relative h-full",
          editWidgetsMode && !isDragging && "animate-jiggle"
        )}
      >
        {editWidgetsMode ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeWidget(widget.id)
              }}
              aria-label="Скрыть виджет"
              className="absolute -top-2 -left-1.5 z-30 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-white/22 bg-[#0d0e16]/75 text-rose-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_14px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[background-color,color,transform] duration-[var(--duration-quick)] hover:bg-rose-500/80 hover:text-white active:scale-95 motion-reduce:transition-none"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleWidgetSize(widget.id)
              }}
              title={isWide ? "Сделать 1×1" : "Расширить 2×1"}
              className="absolute -top-2 right-7 z-30 flex h-6 cursor-pointer items-center gap-1 rounded-full border border-white/22 bg-[#0d0e16]/75 px-2 text-[10px] font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_14px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] hover:bg-white/[0.16] active:scale-95 motion-reduce:transition-none"
            >
              <IconSwap
                state={isWide ? "b" : "a"}
                iconA={<Maximize2 className="h-2.5 w-2.5 text-[#e8ff1f]" />}
                iconB={<Minimize2 className="h-2.5 w-2.5 text-[#e8ff1f]" />}
              />
              <TextMorph value={isWide ? "1×1" : "2×1"} />
            </button>

            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label="Перетащить виджет"
              className="absolute -top-2 -right-1 z-30 flex h-6 w-6 cursor-grab items-center justify-center rounded-full border border-white/22 bg-[#0d0e16]/75 text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_14px_rgba(0,0,0,0.45)] backdrop-blur-md active:cursor-grabbing"
            >
              <GripHorizontal className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}

        <TiltCard
          disabled={editWidgetsMode || isDragging}
          maxTilt={9}
          glare
          className="h-full rounded-[26px]"
        >
          <GlowCard
            theme={widget.theme}
            onClick={handleCardClick}
            className={cn(
              heightClass,
              !editWidgetsMode &&
                widget.kind !== "evening-detox" &&
                widget.kind !== "water-balance" &&
                widget.kind !== "custom" &&
                "cursor-pointer active:scale-[0.988]"
            )}
            contentClassName="flex flex-col justify-between p-3.5"
          >
            <InnerWidgetContent
              widget={widget}
              sleepHistory={sleepHistory}
              latestSleep={latestSleep}
              moodHistory={moodHistory}
              bentoPeriod={bentoPeriod}
              bedtimeGoal={bedtimeGoal}
              wakeGoal={wakeGoal}
              reminderEnabled={reminderEnabled}
              reminderTime={reminderTime}
              streakDays={streakDays}
              eveningDetox={eveningDetox}
              setEveningDetox={setEveningDetox}
              breathMinutes={breathMinutes}
              addBreathMinutes={addBreathMinutes}
              waterMl={waterMl}
              addWater={addWater}
              incrementCustomWidget={incrementCustomWidget}
              editWidgetsMode={editWidgetsMode}
              isWide={isWide}
            />
          </GlowCard>
        </TiltCard>
      </m.div>
    </div>
  )
}

function InnerWidgetContent({
  widget,
  sleepHistory,
  latestSleep,
  moodHistory,
  bentoPeriod,
  bedtimeGoal,
  wakeGoal,
  reminderEnabled,
  reminderTime,
  streakDays,
  eveningDetox,
  setEveningDetox,
  breathMinutes,
  addBreathMinutes,
  waterMl,
  addWater,
  incrementCustomWidget,
  editWidgetsMode,
  isWide,
}: {
  widget: BentoWidgetItem
  sleepHistory: SleepNight[]
  latestSleep: SleepNight
  moodHistory: MoodEntry[]
  bentoPeriod: BentoPeriod
  bedtimeGoal: string
  wakeGoal: string
  reminderEnabled: boolean
  reminderTime: string
  streakDays: number
  eveningDetox: boolean
  setEveningDetox: (v: boolean) => void
  breathMinutes: number
  addBreathMinutes: (min: number) => void
  waterMl: number
  addWater: (ml: number) => void
  incrementCustomWidget: (id: string) => void
  editWidgetsMode: boolean
  isWide: boolean
}) {
  const [scrubIdx, setScrubIdx] = React.useState<number | null>(null)
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const reduceMotion = prefersReducedMotion()
  const now = useNow(30_000)

  const periodDays = bentoPeriod === "7D" ? 7 : bentoPeriod === "30D" ? 30 : 90
  const periodNights = React.useMemo(() => {
    const sliced = sleepHistory.slice(-periodDays)
    return sliced.length > 0 ? sliced : [latestSleep]
  }, [sleepHistory, periodDays, latestSleep])

  const periodMoods = React.useMemo(() => {
    if (bentoPeriod === "7D") return moodHistory.slice(-7)
    return moodHistory
  }, [moodHistory, bentoPeriod])

  const targetDurMin = getTargetDurationMin(bedtimeGoal, wakeGoal)

  switch (widget.kind) {
    /**
     * 1. RECOVERY STREAM («Индекс восстановления»): 3-band stream + real human hours/quality/deviation scrub info
     */
    case "bio-stream": {
      const series = periodNights.map((n) => {
        const durPts = Math.min(40, Math.round((n.durationMin / targetDurMin) * 40))
        const feelPts = Math.round(n.quality * 0.4)
        const dev = getBedtimeDeviationMin(n.bedtime, bedtimeGoal)
        const schedPts = Math.max(0, Math.round(20 - Math.abs(dev) / 4))
        return {
          label: n.dayShort,
          date: n.date,
          hours: (n.durationMin / 60).toFixed(1),
          quality: n.quality,
          devMin: dev,
          durPts,
          feelPts,
          schedPts,
          total: durPts + feelPts + schedPts,
        }
      })

      const activePoint =
        scrubIdx !== null && series[scrubIdx]
          ? series[scrubIdx]
          : series[series.length - 1]
      const firstTotal = series[0]?.total ?? activePoint.total
      const lastTotal = series[series.length - 1]?.total ?? firstTotal
      const diffPct = firstTotal
        ? ((lastTotal - firstTotal) / firstTotal) * 100
        : 0

      const W = isWide ? 316 : 144
      const H = isWide ? 102 : 68
      const mid = H / 2
      const maxTot = Math.max(...series.map((s) => s.total), 1)
      const minTot = Math.min(...series.map((s) => s.total))
      const floor = minTot - Math.max(8, (maxTot - minTot) * 0.9)
      const halfAmp = H * 0.42

      const X = (i: number) =>
        -4 + (i / Math.max(1, series.length - 1)) * (W + 8)

      const layers = series.map((p) => {
        const scale =
          (((p.total - floor) / Math.max(1, maxTot - floor)) * halfAmp) /
          Math.max(1, p.total)
        return {
          f: p.durPts * scale,
          fs: (p.durPts + p.feelPts) * scale,
          fsc: p.total * scale,
        }
      })

      const makeBand = (key: "f" | "fs" | "fsc") => {
        const topPts: [number, number][] = series.map((_, i) => [
          X(i),
          mid - layers[i][key],
        ])
        const botPts: [number, number][] = series
          .map((_, i) => [X(i), mid + layers[i][key]] as [number, number])
          .reverse()
        return `${smoothSvgPath(topPts)} ${smoothSvgPath(botPts, false)} Z`
      }

      // Only Start + Latest markers so labels never overlap across periods
      const markIndices =
        isWide && series.length > 2 ? [0, series.length - 1] : [series.length - 1]

      const avgHoursPeriod = (
        periodNights.reduce((s, n) => s + n.durationMin, 0) /
        Math.max(1, periodNights.length) /
        60
      ).toFixed(1)

      return (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold tracking-tight text-white">
                {widget.title}
              </div>
              {isWide ? (
                <div className="mt-1 flex items-center gap-2.5 text-[10px] text-white/65">
                  <span className="inline-flex items-center gap-1">
                    <i className="h-1.5 w-1.5 rounded-full bg-white" />
                    Часы
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="h-1.5 w-1.5 rounded-full bg-[#a9b2ff]" />
                    Бодрость
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="h-1.5 w-1.5 rounded-full bg-[#ffb37a]" />
                    Режим
                  </span>
                </div>
              ) : null}
            </div>

            <span className="shrink-0 rounded-full border border-[#e8ff1f]/24 bg-[#0d0e16]/60 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#e8ff1f] backdrop-blur-md">
              <TextSwapSoft
                value={`${diffPct >= 0 ? "↑ +" : "↓ −"}${Math.abs(diffPct).toFixed(1)}%`}
              />
            </span>
          </div>

          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <DotMatrix
                value={activePoint.total}
                size={isWide ? "md" : "sm"}
                countUp={scrubIdx === null}
                instant={scrubIdx !== null}
              />
              <span className="font-mono text-[10.5px] text-white/62">
                {scrubIdx !== null
                  ? activePoint.date
                  : `${avgHoursPeriod}ч · ${series.length} н.`}
              </span>
            </div>
            {isWide && scrubIdx !== null ? (
              <div className="rounded-full border border-white/15 bg-[#0d0e16]/76 px-2.5 py-0.5 font-mono text-[10px] text-white/92 backdrop-blur-md">
                {activePoint.hours}ч · {activePoint.quality}% бодр. ·{" "}
                {activePoint.devMin === 0
                  ? "в цель"
                  : `${activePoint.devMin > 0 ? "+" : ""}${activePoint.devMin}м`}
              </div>
            ) : null}
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="-mx-3.5 -mb-1 mt-1.5 w-[calc(100%+28px)] overflow-hidden select-none"
            style={{ height: H, touchAction: "pan-y" }}
            onPointerMove={(e) => {
              if (editWidgetsMode) return
              e.stopPropagation()
              const r = e.currentTarget.getBoundingClientRect()
              const rel = (e.clientX - r.left) / Math.max(1, r.width)
              const idx = Math.max(
                0,
                Math.min(series.length - 1, Math.round(rel * (series.length - 1)))
              )
              setScrubIdx(idx)
            }}
            onPointerLeave={() => setScrubIdx(null)}
          >
            <defs>
              <linearGradient id={`nwf-${uid}`} x1="0" x2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="22%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>
              <mask id={`nwm-${uid}`}>
                <rect width={W} height={H} fill={`url(#nwf-${uid})`} />
              </mask>
            </defs>

            <g mask={`url(#nwm-${uid})`}>
              <path d={makeBand("fsc")} fill="#FFB37A" opacity={0.95} />
              <path d={makeBand("fs")} fill="#A9B2FF" />
              <path d={makeBand("f")} fill="#FFFFFF" opacity={0.96} />
            </g>

            {markIndices.map((idx) => {
              const x = Math.min(W - 26, Math.max(26, X(idx)))
              const p = series[idx]
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    x2={x}
                    y1={10}
                    y2={H - 10}
                    stroke="rgba(0,0,0,0.42)"
                    strokeWidth="1.1"
                  />
                  <rect
                    x={x - 20}
                    y={4}
                    width={40}
                    height={15}
                    rx={7.5}
                    fill="rgba(12,14,22,0.8)"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="0.8"
                  />
                  <text
                    x={x}
                    y={14.5}
                    textAnchor="middle"
                    className="fill-white font-mono text-[8.5px] font-semibold"
                  >
                    {p.hours}ч
                  </text>
                </g>
              )
            })}

            {scrubIdx !== null && series[scrubIdx] ? (
              <g>
                <line
                  x1={X(scrubIdx)}
                  x2={X(scrubIdx)}
                  y1={4}
                  y2={H - 4}
                  stroke="#e8ff1f"
                  strokeWidth="1.6"
                />
                <circle
                  cx={X(scrubIdx)}
                  cy={mid - layers[scrubIdx].fsc}
                  r="4"
                  fill="#e8ff1f"
                  stroke="#050508"
                  strokeWidth="1.5"
                />
              </g>
            ) : null}
          </svg>
        </>
      )
    }

    /**
     * 2. SLEEP HOURS CAPSULES («Часы сна»): Real goal hits count + signed goal delta + GPU scaleY bars
     */
    case "weekly-capsules": {
      const nCount = Math.max(1, periodNights.length)
      const avgMin = Math.round(
        periodNights.reduce((s, n) => s + n.durationMin, 0) / nCount
      )
      const avgHrs = (avgMin / 60).toFixed(1)
      const diffGoalMin = avgMin - targetDurMin
      const hitsCount = periodNights.filter(
        (n) => n.durationMin >= targetDurMin * 0.94
      ).length
      const bars = isWide ? periodNights.slice(-14) : periodNights.slice(-7)
      const goalBottomPx = Math.min(58, Math.max(8, (targetDurMin / 540) * 62))

      return (
        <>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[13px] font-semibold tracking-tight text-white">
              {widget.title}
            </span>
            <span className="shrink-0 rounded-full border border-white/14 bg-white/[0.08] px-2 py-0.5 font-mono text-[9.5px] text-white/80">
              <TextSwapSoft value={`${hitsCount}/${nCount} норма`} align="end" />
            </span>
          </div>

          <div className="mt-0.5 flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-[26px] leading-none font-extralight tracking-tight text-white tabular-nums">
                <TextSwapSoft value={avgHrs} />
              </span>
              <span className="text-[11px] text-white/65">ч ср.</span>
            </div>
            <span
              className={cn(
                "font-mono text-[10px] font-medium",
                diffGoalMin >= 0 ? "text-[#e8ff1f]" : "text-white/60"
              )}
            >
              {diffGoalMin >= 0 ? `+${diffGoalMin}м` : `${diffGoalMin}м`} к цели
            </span>
          </div>

          <div className="mt-2 space-y-1 pt-0.5">
            <div
              className="relative grid items-end gap-1"
              style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-[#e8ff1f]/45"
                style={{ bottom: `${goalBottomPx.toFixed(1)}px` }}
              />
              {bars.map((n, i) => {
                const isToday = i === bars.length - 1
                const metGoal = n.durationMin >= targetDurMin * 0.94
                const scale = Math.max(0.24, Math.min(1, n.durationMin / 540))
                return (
                  <div key={n.id} className="flex justify-center">
                    <div className="relative flex h-[60px] w-full max-w-[16px] items-end overflow-hidden rounded-full bg-white/[0.1]">
                      <div
                        style={{
                          transform: `scaleY(${scale.toFixed(3)})`,
                          transformOrigin: "bottom",
                          transition: reduceMotion
                            ? "none"
                            : `transform var(--duration-slow) var(--ease-smooth-out) ${Math.min(i, 6) * 40}ms`,
                        }}
                        className={cn(
                          "h-full w-full rounded-full",
                          isToday
                            ? "bg-gradient-to-t from-[#b8d40d] to-[#f4ff8a] shadow-[0_0_10px_rgba(232,255,31,0.45)]"
                            : metGoal
                              ? "bg-emerald-300/85"
                              : "bg-white/45"
                        )}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="grid gap-1 text-center"
              style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
            >
              {bars.map((n, i) => {
                const isToday = i === bars.length - 1
                return (
                  <span
                    key={n.id}
                    className={cn(
                      "truncate font-mono text-[8.5px]",
                      isToday ? "font-bold text-white" : "text-white/50"
                    )}
                  >
                    {bars.length > 9 && i % 2 === 1 && !isToday ? "" : n.dayShort}
                  </span>
                )
              })}
            </div>
          </div>
        </>
      )
    }

    /**
     * 3. MORNING ENERGY («Утренняя бодрость»): Today vs Period Avg + Light-Pillar Bezier Curve
     */
    case "morning-energy": {
      const qualVals = periodNights.map((n) => n.quality)
      const avgQual = Math.round(
        qualVals.reduce((s, q) => s + q, 0) / Math.max(1, qualVals.length)
      )
      const deltaVsAvg = latestSleep.quality - avgQual
      const W = isWide ? 280 : 136
      const H = 50
      const lo = Math.max(0, Math.min(...qualVals) - 6)
      const hi = Math.min(100, Math.max(...qualVals) + 6)
      const pts: [number, number][] = qualVals.map((v, i) => [
        6 + (i / Math.max(1, qualVals.length - 1)) * (W - 14),
        H - 8 - ((v - lo) / Math.max(1, hi - lo)) * (H - 16),
      ])
      const tip = pts[pts.length - 1]
      const sparkPath = smoothSvgPath(pts)

      return (
        <>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[13px] font-semibold tracking-tight text-white">
              {widget.title}
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.1] backdrop-blur-md">
              <ChevronRight className="h-3.5 w-3.5 text-white/85" />
            </span>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="my-1 h-12 w-full overflow-visible">
            <defs>
              <linearGradient id={`stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
                <stop offset="55%" stopColor="#ffb37a" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>
              <linearGradient id={`pillar-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
                <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <radialGradient id={`halo-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>

            <path
              d={sparkPath}
              fill="none"
              stroke={`url(#stroke-${uid})`}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <rect
              x={tip[0] - 8}
              y={tip[1]}
              width={16}
              height={Math.max(10, H - tip[1])}
              rx={8}
              fill={`url(#pillar-${uid})`}
            />
            <circle cx={tip[0]} cy={tip[1]} r="9" fill={`url(#halo-${uid})`} />
            <circle cx={tip[0]} cy={tip[1]} r="3.6" fill="#ffffff" />
          </svg>

          <div className="flex items-end justify-between gap-1">
            <div>
              <div className="flex items-baseline gap-1">
                <DotMatrix value={latestSleep.quality} size="xs" />
                <span className="font-mono text-[10.5px] text-white/75">%</span>
              </div>
              <div className="mt-0.5 text-[9.5px] text-white/50">
                ср. {avgQual}% ({periodNights.length} н.)
              </div>
            </div>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold",
                deltaVsAvg >= 0
                  ? "border-[#e8ff1f]/28 bg-[#e8ff1f]/[0.12] text-[#e8ff1f]"
                  : "border-rose-300/25 bg-rose-500/[0.14] text-rose-200"
              )}
            >
              <TextSwapSoft
                value={deltaVsAvg >= 0 ? `↑ +${deltaVsAvg}%` : `↓ ${deltaVsAvg}%`}
                align="end"
              />
            </span>
          </div>
        </>
      )
    }

    /**
     * 4. SCHEDULE ADHERENCE («Точность режима»): Shadcn @dashboardcn RadialGauge + TickBar Breakdown
     */
    case "sleep-phases": {
      const nCount = Math.max(1, periodNights.length)
      const onTimePct = Math.round(
        (periodNights.filter(
          (n) => Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal)) <= 30
        ).length /
          nCount) *
          100
      )
      const durOkPct = Math.round(
        (periodNights.filter((n) => n.durationMin >= targetDurMin - 30).length /
          nCount) *
          100
      )
      const calmNightPct = Math.round(
        (periodNights.filter((n) => n.awakenings <= 1).length / nCount) * 100
      )
      const avgAbsDev = Math.round(
        periodNights.reduce(
          (s, n) => s + Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal)),
          0
        ) / nCount
      )
      const avgAdherence = Math.round((onTimePct + durOkPct + calmNightPct) / 3)

      const gaugeEl = (
        <RadialGauge
          value={avgAdherence}
          max={100}
          size={isWide ? 142 : 122}
          thickness={7}
          segments={isWide ? 34 : 26}
          gap={2.2}
          sweep={190}
          color="#e8ff1f"
          trackColor="rgba(255,255,255,0.16)"
          glow
          animate={!reduceMotion}
        >
          <div className="flex flex-col items-center justify-end pb-1">
            <span className="font-sans text-[26px] leading-none font-extralight text-white tabular-nums">
              <SubtleNumber value={avgAdherence} suffix="%" />
            </span>
            <span className="mt-0.5 text-[9px] text-white/48">
              ±{avgAbsDev}м отбой
            </span>
          </div>
        </RadialGauge>
      )

      if (!isWide) {
        return (
          <>
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[13px] font-semibold text-white">
                {widget.title}
              </span>
              <span className="shrink-0 rounded-full border border-white/12 bg-white/[0.08] px-2 py-0.5 font-mono text-[9.5px] text-white/75">
                {bedtimeGoal}
              </span>
            </div>
            <div className="my-auto flex justify-center pt-1">{gaugeEl}</div>
            <div className="text-center font-mono text-[9.5px] text-white/55">
              Норма сна: {durOkPct}%
            </div>
          </>
        )
      }

      return (
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13.5px] font-semibold tracking-tight text-white">
              {widget.title}
            </span>
            <span className="rounded-full border border-white/14 bg-white/[0.08] px-2.5 py-0.5 font-mono text-[10px] text-white/85 backdrop-blur-md">
              План {bedtimeGoal}–{wakeGoal}
            </span>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-3.5">
            {gaugeEl}

            <div className="min-w-0 flex-1 space-y-2 text-[10.5px]">
              {[
                { label: "Отбой ±30 мин", pct: onTimePct, col: "#e8ff1f" },
                { label: "Длительность", pct: durOkPct, col: "#818cf8" },
                { label: "До 1 пробужд.", pct: calmNightPct, col: "#34d399" },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-white/78">{row.label}</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      <TextSwapSoft value={`${row.pct}%`} align="end" />
                    </span>
                  </div>
                  <TickBar
                    value={row.pct}
                    max={100}
                    segments={18}
                    shape="pill"
                    color={row.col}
                    className="h-1.5 gap-0.5"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    /**
     * 5. EMOTIONS & FACTORS («Эмоции и факторы»): Dominant emotion + factor context + interactive mood curve
     */
    case "mood-waves": {
      const entries =
        periodMoods.length >= 2
          ? periodMoods
          : [
              ...periodMoods,
              ...(periodMoods.length
                ? periodMoods
                : [
                    {
                      id: "m0",
                      timestamp: "Сегодня",
                      valence: 0.2,
                      label: "Нейтрально",
                      emotions: ["Спокойствие"],
                      factors: [],
                    },
                  ]),
            ]
      const vals = entries.map((m) => Math.round((m.valence + 1) * 50))
      const avgMood = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
      const activeMood =
        scrubIdx !== null && entries[scrubIdx]
          ? entries[scrubIdx]
          : entries[entries.length - 1]

      const emotionCounts = new Map<string, number>()
      const factorCounts = new Map<string, number>()
      for (const m of entries) {
        for (const em of m.emotions) {
          if (em.trim()) emotionCounts.set(em, (emotionCounts.get(em) ?? 0) + 1)
        }
        for (const fac of m.factors) {
          if (fac.trim()) factorCounts.set(fac, (factorCounts.get(fac) ?? 0) + 1)
        }
      }
      const topEmotion = [...emotionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      const topFactor = [...factorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

      const W = isWide ? 304 : 140
      const H = isWide ? 90 : 68
      const padX = 12
      const X = (i: number) =>
        padX + (i / Math.max(1, vals.length - 1)) * (W - padX * 2)
      const Y = (v: number) => H - 16 - (v / 100) * (H - 28)

      const pts: [number, number][] = vals.map((v, i) => [X(i), Y(v)])
      const wavePath = smoothSvgPath(pts)

      const pillText =
        scrubIdx !== null && activeMood
          ? activeMood.emotions[0] ?? activeMood.label
          : topEmotion ?? activeMood?.label ?? "Спокойствие"

      return (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold tracking-tight text-white">
                {widget.title}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] text-white/70">
                Баланс{" "}
                <span className="font-mono font-semibold text-[#e8ff1f]">
                  <TextSwapSoft value={`${avgMood}%`} />
                </span>
                {topFactor ? ` · ${topFactor}` : ` · ${entries.length} зап.`}
              </div>
            </div>

            <span className="shrink-0 rounded-full border border-white/16 bg-white/[0.12] px-2.5 py-0.5 text-[10px] font-medium text-white/95 backdrop-blur-md">
              <TextStatesSwap
                value={scrubIdx !== null ? pillText : `Чаще: ${pillText}`}
              />
            </span>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mt-1 w-full overflow-visible select-none"
            style={{ height: H, touchAction: "pan-y" }}
            onPointerMove={(e) => {
              if (editWidgetsMode) return
              const r = e.currentTarget.getBoundingClientRect()
              const rel = (e.clientX - r.left) / Math.max(1, r.width)
              setScrubIdx(
                Math.max(0, Math.min(entries.length - 1, Math.round(rel * (entries.length - 1))))
              )
            }}
            onPointerLeave={() => setScrubIdx(null)}
          >
            <defs>
              <linearGradient id={`mw-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>

            <line
              x1={padX}
              x2={W - padX}
              y1={Y(50)}
              y2={Y(50)}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="2 4"
            />

            <path
              d={`${wavePath} L ${pts[pts.length - 1][0].toFixed(1)},${H - 12} L ${pts[0][0].toFixed(1)},${H - 12} Z`}
              fill={`url(#mw-${uid})`}
            />
            <path
              d={wavePath}
              fill="none"
              stroke="rgba(255,255,255,0.24)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={wavePath}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.3"
              strokeLinecap="round"
            />

            {pts.map(([px, py], i) => (
              <circle
                key={i}
                cx={px}
                cy={py}
                r={scrubIdx === i ? 5 : 3}
                fill={scrubIdx === i ? "#e8ff1f" : "#ffffff"}
              />
            ))}

            {isWide ? (
              <text
                x={scrubIdx !== null ? X(scrubIdx) : W - padX}
                y={H - 1}
                textAnchor={scrubIdx !== null && scrubIdx < entries.length / 2 ? "start" : "end"}
                className="fill-white/60 font-mono text-[8.5px]"
              >
                {activeMood?.timestamp ?? `${entries.length} чек-инов`}
              </text>
            ) : null}
          </svg>
        </>
      )
    }

    /**
     * 6. JOURNAL STREAK («Серия журнала»): Signature DottedTrack + pluralized streak counter
     */
    case "daily-streak": {
      const milestone =
        streakDays < 14 ? 14 : streakDays < 30 ? 30 : Math.ceil(streakDays / 30) * 30

      return (
        <>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[13px] font-semibold tracking-tight text-white/92">
              {widget.title}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-white/55">
              цель {milestone}д
            </span>
          </div>

          <div className="mt-auto space-y-2.5 pt-2">
            <div>
              <div className="flex items-baseline gap-2">
                <DotMatrix value={streakDays} size="sm" countUp />
                <span className="text-xs font-medium text-white/60">
                  {pluralRu(streakDays, ["день", "дня", "дней"])} подряд
                </span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-white/48">
                {sleepHistory.length} н. сна · {moodHistory.length}{" "}
                {pluralRu(moodHistory.length, ["чек-ин", "чек-ина", "чек-инов"])}
              </div>
            </div>

            <DottedTrack
              value={streakDays / milestone}
              dots={isWide ? 28 : 16}
              color="#e8ff1f"
            />
          </div>
        </>
      )
    }

    /**
     * 7. LATEST NIGHT («Последняя ночь»): Glowing RadialGauge + real hours, schedule & awakenings
     */
    case "sleep-quality": {
      const nh = Math.floor(latestSleep.durationMin / 60)
      const nm = String(latestSleep.durationMin % 60).padStart(2, "0")
      const gaugeColor =
        latestSleep.quality >= 80
          ? "#e8ff1f"
          : latestSleep.quality >= 65
            ? "#818cf8"
            : "#fb7185"

      return (
        <>
          <div className="flex items-center justify-between">
            <span className="truncate text-[13px] font-semibold tracking-tight text-white">
              {widget.title}
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.1] backdrop-blur-md">
              <ChevronRight className="h-3.5 w-3.5 text-white/85" />
            </span>
          </div>

          <div className="my-0.5 flex items-center justify-center">
            <RadialGauge
              value={latestSleep.quality}
              max={100}
              size={isWide ? 104 : 92}
              thickness={6}
              segments={28}
              gap={2.5}
              sweep={250}
              color={gaugeColor}
              trackColor="rgba(255,255,255,0.16)"
              glow
              animate={!reduceMotion}
            >
              <div className="flex flex-col items-center justify-center pt-1">
                <DotMatrix value={latestSleep.quality} size="sm" />
                <span className="mt-0.5 font-mono text-[8.5px] text-white/55">
                  % бодр.
                </span>
              </div>
            </RadialGauge>
          </div>

          <div className="text-center">
            <div className="font-mono text-[11px] font-semibold text-white">
              {nh}ч {nm}м
              <span className="mx-1 text-white/35">·</span>
              <span className="text-white/70">
                {latestSleep.bedtime}–{latestSleep.wakeTime}
              </span>
            </div>
            {isWide ? (
              <div className="mt-0.5 font-mono text-[9.5px] text-white/50">
                Пробуждений: {latestSleep.awakenings}
              </div>
            ) : null}
          </div>
        </>
      )
    }

    /**
     * 8. EVENING WIND-DOWN («Вечерний режим»): Live bedtime countdown + DottedTrack progress + Switch
     */
    case "evening-detox": {
      const countdown = computeBedtimeCountdown(bedtimeGoal, wakeGoal, now)
      return (
        <div className="my-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[13.5px] font-semibold tracking-tight text-white">
                  {widget.title}
                </span>
                {isWide ? (
                  <span className="shrink-0 rounded-full border border-white/14 bg-white/[0.08] px-2 py-0.5 font-mono text-[9.5px] text-indigo-100">
                    {countdown.isPastBedtime
                      ? `Пора (${bedtimeGoal})`
                      : `До отбоя ${countdown.formattedLeft}`}
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] text-indigo-100/72">
                {eveningDetox
                  ? reminderEnabled
                    ? `Напоминание ${reminderTime} · цель ${bedtimeGoal}`
                    : `Включён · отбой в ${bedtimeGoal}`
                  : "Нажмите, чтобы активировать"}
              </div>
            </div>
            <Switch
              checked={eveningDetox}
              disabled={editWidgetsMode}
              onCheckedChange={setEveningDetox}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {isWide ? (
            <DottedTrack
              value={countdown.awakeProgress}
              dots={26}
              color={countdown.isPastBedtime ? "#fb7185" : "#a5b4fc"}
            />
          ) : null}
        </div>
      )
    }

    /**
     * 9. BREATHING PRACTICE («Практика дыхания»): Real 15m goal RadialGauge + HopArcs + Quick +2м Pill
     */
    case "breath-volume": {
      const dailyGoal = 15
      const pct = Math.min(100, Math.round((breathMinutes / dailyGoal) * 100))
      const activeHops = Math.min(4, Math.max(1, Math.round((breathMinutes / dailyGoal) * 4)))

      return (
        <>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[13px] font-semibold tracking-tight text-white">
              {widget.title}
            </span>
            <button
              type="button"
              disabled={editWidgetsMode}
              onClick={(e) => {
                e.stopPropagation()
                addBreathMinutes(2)
              }}
              className="flex h-6 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-rose-300/28 bg-rose-500/[0.16] px-2 font-mono text-[10px] font-semibold text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] hover:bg-rose-500/[0.26] active:scale-95 motion-reduce:transition-none"
            >
              <Plus className="h-2.5 w-2.5" />
              <span>2м</span>
            </button>
          </div>

          {isWide ? (
            <div className="my-1 flex items-center gap-4">
              <RadialGauge
                value={pct}
                max={100}
                size={112}
                thickness={6}
                segments={24}
                gap={2.5}
                sweep={190}
                color="#fb7185"
                trackColor="rgba(255,255,255,0.15)"
                glow
                animate={!reduceMotion}
              >
                <div className="flex items-baseline gap-1 pb-0.5">
                  <DotMatrix value={breathMinutes} size="sm" />
                  <span className="font-mono text-[10px] text-white/60">/{dailyGoal}м</span>
                </div>
              </RadialGauge>
              <div className="min-w-0 flex-1 space-y-1">
                <HopArcs count={5} active={activeHops} accentColor="#fb7185" />
                <div className="text-[10px] text-white/55">
                  Ритм <BreathTechniqueText /> · {pct}% цели
                </div>
              </div>
            </div>
          ) : (
            <div className="my-1 flex justify-center">
              <RadialGauge
                value={pct}
                max={100}
                size={120}
                thickness={7}
                segments={24}
                gap={2.6}
                sweep={180}
                color="#fb7185"
                trackColor="rgba(255,255,255,0.15)"
                glow
                animate={!reduceMotion}
              >
                <div className="flex items-baseline gap-1 pb-0.5">
                  <DotMatrix value={breathMinutes} size="sm" />
                  <span className="font-mono text-[10.5px] text-white/60">
                    / {dailyGoal}м
                  </span>
                </div>
              </RadialGauge>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/55">Схема <BreathTechniqueText /></span>
            <span className="font-mono font-semibold text-rose-200">{pct}%</span>
          </div>
        </>
      )
    }

    /**
     * 10. WATER BALANCE («Водный баланс»): Luminous Arch + Glass count + +250ml Pill
     */
    case "water-balance": {
      const t = Math.max(0.02, Math.min(1, waterMl / 2000))
      const u = 1 - t
      const thumbX = u * u * 8 + 2 * u * t * 70 + t * t * 132
      const thumbY = u * u * 40 + 2 * u * t * 2 + t * t * 40
      const pctGoal = Math.min(100, Math.round((waterMl / 2000) * 100))
      const glasses = Math.round(waterMl / 250)

      return (
        <>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[13px] font-semibold tracking-tight text-white">
              {widget.title}
            </span>
            <button
              type="button"
              disabled={editWidgetsMode}
              onClick={(e) => {
                e.stopPropagation()
                addWater(250)
              }}
              className="flex h-6 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-white/22 bg-white/[0.14] px-2 font-mono text-[10px] font-semibold text-[#f1ff76] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] hover:bg-white/[0.22] active:scale-95 motion-reduce:transition-none"
            >
              <Plus className="h-2.5 w-2.5" />
              <span>250</span>
            </button>
          </div>

          <svg viewBox="0 0 140 50" className="my-1 h-11 w-full overflow-visible">
            <defs>
              <linearGradient id={`warch-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#bef264" />
              </linearGradient>
              <linearGradient id={`wpillar-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
                <stop offset="55%" stopColor="#ffffff" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <radialGradient id={`whalo-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>

            <path
              d="M 8 40 Q 70 2 132 40"
              fill="none"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M 8 40 Q 70 2 132 40"
              pathLength={1}
              strokeDasharray={`${t} 1`}
              fill="none"
              stroke={`url(#warch-${uid})`}
              strokeWidth="4.8"
              strokeLinecap="round"
              style={{
                transition: reduceMotion
                  ? "none"
                  : "stroke-dasharray var(--duration-medium) var(--ease-smooth-out)",
              }}
            />
            <rect
              x={thumbX - 8}
              y={thumbY}
              width={16}
              height={Math.max(12, 50 - thumbY)}
              rx={8}
              fill={`url(#wpillar-${uid})`}
              style={{
                transition: reduceMotion
                  ? "none"
                  : "x var(--duration-medium) var(--ease-smooth-out), y var(--duration-medium) var(--ease-smooth-out), height var(--duration-medium) var(--ease-smooth-out)",
              }}
            />
            <circle
              cx={thumbX}
              cy={thumbY}
              r="9.5"
              fill={`url(#whalo-${uid})`}
              style={{
                transition: reduceMotion
                  ? "none"
                  : "cx var(--duration-medium) var(--ease-smooth-out), cy var(--duration-medium) var(--ease-smooth-out)",
              }}
            />
            <circle
              cx={thumbX}
              cy={thumbY}
              r="4.8"
              fill="#ffffff"
              style={{
                transition: reduceMotion
                  ? "none"
                  : "cx var(--duration-medium) var(--ease-smooth-out), cy var(--duration-medium) var(--ease-smooth-out)",
              }}
            />
          </svg>

          <div className="flex items-end justify-between gap-1">
            <div>
              <div className="flex items-baseline gap-1">
                <DotMatrix value={waterMl} size="xs" />
                <span className="text-[10px] text-white/65">мл</span>
              </div>
              <div className="mt-0.5 text-[9.5px] text-white/50">
                {glasses} / 8 стаканов
              </div>
            </div>
            <div className="flex items-center gap-1">
              <SuccessCheck show={waterMl >= 2000} size={13} color="#e8ff1f" />
              <PopNumber
                value={pctGoal}
                suffix="%"
                className="font-mono text-[10.5px] font-semibold text-white/85"
                suffixClassName="text-[9.5px] text-white/55"
              />
            </div>
          </div>
        </>
      )
    }

    /**
     * 11. RHYTHM SUMMARY («Сводка ритма»): Honest TickBar Register + Avg Sleep / Deviation / Calm Nights
     */
    case "body-report": {
      const nCount = Math.max(1, periodNights.length)
      const avgMin = Math.round(
        periodNights.reduce((s, n) => s + n.durationMin, 0) / nCount
      )
      const avgDev = Math.round(
        periodNights.reduce(
          (s, n) => s + Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal)),
          0
        ) / nCount
      )
      const calmPct = Math.round(
        (periodNights.filter((n) => n.awakenings <= 1).length / nCount) * 100
      )
      const fulfillmentPct = Math.min(100, Math.round((avgMin / targetDurMin) * 100))
      const targetHrs = (targetDurMin / 60).toFixed(1)

      return (
        <>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[13.5px] font-semibold tracking-tight text-white">
              {widget.title}
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.1] backdrop-blur-md">
              <ArrowUpRight className="h-3.5 w-3.5 text-white/85" />
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <DotMatrix value={fulfillmentPct} size="md" />
              <span className="font-mono text-sm font-semibold text-white/85">%</span>
            </div>
            <span className="font-mono text-[10px] text-white/55">
              <TextSwapSoft
                value={`план ${targetHrs}ч · ${periodNights.length} н.`}
                align="end"
              />
            </span>
          </div>

          <div className="mt-2.5 space-y-1">
            <TickBar
              value={fulfillmentPct}
              max={100}
              segments={isWide ? 44 : 24}
              shape="tick"
              color="#a3e635"
              trackColor="rgba(255,255,255,0.12)"
              animate={!reduceMotion}
              className="h-5 gap-[2.5px]"
            />
            <div className="flex items-center justify-between text-[9px] font-medium text-white/45">
              <span>Недосып</span>
              <span>Цель {targetHrs}ч</span>
              <span>100%</span>
            </div>
          </div>

          <div className={cn("mt-2 grid gap-2 pt-1", isWide ? "grid-cols-3" : "grid-cols-2")}>
            <div>
              <div className="text-[9.5px] text-white/45">Средний сон</div>
              <div className="font-mono text-xs font-semibold text-white">
                {Math.floor(avgMin / 60)}ч {String(avgMin % 60).padStart(2, "0")}м
              </div>
            </div>
            {isWide ? (
              <div>
                <div className="text-[9.5px] text-white/45">Отбой ±</div>
                <div className="font-mono text-xs font-semibold text-white">
                  {avgDev} мин
                </div>
              </div>
            ) : null}
            <div>
              <div className="text-[9.5px] text-white/45">Спокойные</div>
              <div className="font-mono text-xs font-semibold text-[#e8ff1f]">
                {calmPct}%
              </div>
            </div>
          </div>
        </>
      )
    }

    /**
     * 12. CUSTOM TRACKER («Мой трекер»): Honest TickBar Register + Step Pill + SuccessCheck
     */
    case "custom":
    default: {
      const cur = widget.customValue ?? 0
      const target = Math.max(1, widget.customTarget ?? 10)
      const step = widget.customStep ?? 1
      const pct = Math.min(100, Math.round((cur / target) * 100))

      return (
        <>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[13px] font-semibold text-white">
              {widget.title}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <SuccessCheck show={cur >= target} size={13} color="#e8ff1f" />
              <button
                type="button"
                disabled={editWidgetsMode}
                onClick={(e) => {
                  e.stopPropagation()
                  incrementCustomWidget(widget.id)
                }}
                className="flex h-6 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-[#e8ff1f]/28 bg-[#e8ff1f]/[0.16] px-2 font-mono text-[10px] font-semibold text-[#f2ff78] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] hover:bg-[#e8ff1f]/[0.26] active:scale-95 motion-reduce:transition-none"
              >
                <Plus className="h-2.5 w-2.5" />
                <span>{step}</span>
              </button>
            </div>
          </div>

          <div className="mt-auto space-y-2.5 pt-2">
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1.5">
                <DotMatrix value={cur} size="sm" />
                <span className="font-mono text-[10.5px] text-white/62">
                  / {target} {widget.customUnit}
                </span>
              </div>
              <PopNumber
                value={pct}
                suffix="%"
                className="font-mono text-[10.5px] font-semibold text-[#e8ff1f]"
                suffixClassName="text-[9.5px] text-white/55"
              />
            </div>

            <TickBar
              value={cur}
              max={target}
              segments={isWide ? 24 : 14}
              shape="pill"
              color="#a3e635"
              trackColor="rgba(255,255,255,0.14)"
              animate={!reduceMotion}
              className="h-2 gap-1"
            />
          </div>
        </>
      )
    }
  }
}
