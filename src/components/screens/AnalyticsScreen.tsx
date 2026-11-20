import * as React from "react"
import { m, useReducedMotion } from "framer-motion"
import {
  Activity, ArrowDownRight, ArrowUpRight, Check, Clock3, List,
  Moon, Plus, SlidersHorizontal, Timer, Wind, X,
} from "lucide-react"
import { useIPhoneGlimm } from "@/components/iphone/IPhoneFrame"
import { Sparkline } from "@/components/ballmac/sparkline"
import { AnimatedSparkles } from "@/components/animate-ui/icons/somna-animated-icons"
import { DotMatrix } from "@/components/ui/dot-matrix"
import { DottedTrack } from "@/components/ui/dotted-track"
import { GlowCard } from "@/components/ui/glow-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SlidingTabs, TextSwapSoft } from "@/components/ui/t-motion"
import {
  SLActivityTimelineCard,
  SLScheduleComparisonCard,
  SLWeeklyBarChart,
  SLWeeklyDonutChart,
  SLWeeklyMetricCard,
  SLWeeklySeriesChart,
} from "@/components/ui/sl-data-display"
import {
  SOMNA_TRANSITIONS,
  haptic,
  smoothSvgPath,
} from "@/lib/motion"
import {
  computeSleepInsights,
  pluralRu,
  type InsightTone,
} from "@/lib/sleepInsights"
import { getBedtimeDeviationMin, getTargetDurationMin } from "@/lib/sleepTime"
import {
  useSomna,
  type BentoPeriod,
} from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"
import "./analytics.css"

interface WalletCardItem {
  id: string
  title: string
  metric: number
  unit: string
  chip: string
  insight: string
  bg: string
  spark: number[]
}

const PERIODS: { id: BentoPeriod; label: string }[] = [
  { id: "7D", label: "7Д" },
  { id: "30D", label: "30Д" },
  { id: "90D", label: "90Д" },
]

const CHART_TABS = [
  { id: "series", label: "Динамика", Icon: Activity },
  { id: "compare", label: "План / Факт", Icon: SlidersHorizontal },
  { id: "timeline", label: "Лента и сон", Icon: List },
]

const INSIGHT_ICONS = {
  emerald: Activity,
  ember: Timer,
  violet: Clock3,
  rose: ArrowDownRight,
  lime: ArrowUpRight,
  cobalt: Moon,
} satisfies Record<InsightTone, typeof Activity>

interface RhythmAxis {
  axis: string
  score: number
}

function RhythmRadar({ axes }: { axes: RhythmAxis[] }) {
  const center = 70
  const radius = 60
  const pointAt = (index: number, fraction: number) => {
    const angle = (index * 2 * Math.PI) / axes.length - Math.PI / 2
    return {
      x: center + Math.cos(angle) * radius * fraction,
      y: center + Math.sin(angle) * radius * fraction,
    }
  }
  const points = axes.map(({ score }, index) => pointAt(index, score / 100))

  return (
    <svg className="analytics-radar" viewBox="0 0 140 140" aria-hidden="true">
      <g className="analytics-radar-grid">
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            points={axes.map((_, index) => {
              const { x, y } = pointAt(index, level)
              return `${x},${y}`
            }).join(" ")}
          />
        ))}
        {axes.map(({ axis }, index) => {
          const { x, y } = pointAt(index, 1)
          return <line key={axis} x1={center} y1={center} x2={x} y2={y} />
        })}
      </g>
      <polygon className="analytics-radar-shape" points={points.map(({ x, y }) => `${x},${y}`).join(" ")} />
      {points.map(({ x, y }, index) => (
        <circle key={axes[index].axis} className="analytics-radar-point" cx={x} cy={y} r={2.6} />
      ))}
    </svg>
  )
}

export function AnalyticsScreen() {
  const {
    sleepHistory,
    moodHistory,
    breathMinutes,
    waterMl,
    bedtimeGoal,
    wakeGoal,
    bentoPeriod,
    setBentoPeriod,
    setWeeklyRecapOpen,
    weeklyGoal,
    setWeeklyGoal,
    setActiveTab,
    setMoodDrawerOpen,
    setSleepLogOpen,
  } = useSomna()

  const { playPhoneSweep } = useIPhoneGlimm()
  const reduceMotion = useReducedMotion()

  const subset = React.useMemo(() => {
    if (bentoPeriod === "7D") return sleepHistory.slice(-7)
    if (bentoPeriod === "30D") return sleepHistory.slice(-30)
    return sleepHistory
  }, [bentoPeriod, sleepHistory])

  const latestSleep = subset[subset.length - 1]
  const latestMood = moodHistory[moodHistory.length - 1]
  const [expandedId, setExpandedId] = React.useState<string>("duration")

  const targetMin = getTargetDurationMin(bedtimeGoal, wakeGoal)
  const avgDurMin = Math.round(
    subset.reduce((s, n) => s + n.durationMin, 0) / Math.max(1, subset.length)
  )
  const avgQuality = Math.round(
    subset.reduce((s, n) => s + n.quality, 0) / Math.max(1, subset.length)
  )
  const avgDev = Math.round(
    subset.reduce(
      (s, n) => s + Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal)),
      0
    ) / Math.max(1, subset.length)
  )

  const moodWindow = bentoPeriod === "7D" ? moodHistory.slice(-7) : moodHistory
  const avgMoodPct = moodWindow.length
    ? Math.round(
        moodWindow.reduce((s, m) => s + (m.valence + 1) * 50, 0) / moodWindow.length
      )
    : 50
  const calmNightsPct = Math.round(
    (subset.filter((n) => n.awakenings <= 1).length / Math.max(1, subset.length)) * 100
  )

  const factorStats = React.useMemo(() => {
    const map = new Map<string, { count: number; totalPct: number }>()
    for (const m of moodWindow) {
      const pct = Math.round((m.valence + 1) * 50)
      for (const f of m.factors) {
        const key = f.trim()
        if (!key) continue
        const prev = map.get(key) ?? { count: 0, totalPct: 0 }
        map.set(key, { count: prev.count + 1, totalPct: prev.totalPct + pct })
      }
    }
    return [...map.entries()]
      .map(([name, info]) => ({
        name,
        count: info.count,
        avgPct: Math.round(info.totalPct / info.count),
      }))
      .sort((a, b) => b.count - a.count || b.avgPct - a.avgPct)
      .slice(0, 5)
  }, [moodWindow])

  const habitScorePct = Math.round(
    Math.min(100, (waterMl / 2000) * 50 + Math.min(1, breathMinutes / 10) * 50)
  )

  const durationAxisPct = Math.min(
    100,
    Math.round((avgDurMin / Math.max(1, targetMin)) * 100)
  )
  const scheduleAxisPct = Math.max(0, Math.min(100, Math.round(100 - avgDev * 1.4)))
  const radarData = [
    { axis: "Длительность", score: durationAxisPct },
    { axis: "Режим", score: scheduleAxisPct },
    { axis: "Бодрость", score: avgQuality },
    { axis: "Спокойствие", score: calmNightsPct },
    { axis: "Баланс", score: avgMoodPct },
  ]
  const sleepBalanceIndex = Math.round(
    radarData.reduce((s, d) => s + d.score, 0) / radarData.length
  )

  const insightsReport = React.useMemo(
    () =>
      computeSleepInsights({
        sleepHistory: subset,
        moodHistory: moodWindow,
        bedtimeGoal,
        wakeGoal,
      }),
    [subset, moodWindow, bedtimeGoal, wakeGoal]
  )

  const cards: WalletCardItem[] = [
    {
      id: "schedule",
      title: "Точность отбоя",
      metric: avgDev,
      unit: "мин от цели",
      chip: `Цель ${bedtimeGoal}`,
      insight: `За ${subset.length} ночей вы ложились в среднем с отклонением ±${avgDev} мин от плана ${bedtimeGoal}.`,
      bg: "radial-gradient(90% 65% at 50% 0%, rgba(212,155,112,0.52), transparent 72%), linear-gradient(180deg, #9e6d4b 0%, #5e3b2b 52%, #1d120e 100%)",
      spark: subset.map((n) =>
        Math.max(0, 60 - Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal)))
      ),
    },
    {
      id: "mood",
      title: "Фон настроения",
      metric: avgMoodPct,
      unit: "% баланс",
      chip: latestMood?.label ?? "Нет записей",
      insight: `Последний чек-ин (${latestMood?.timestamp ?? "—"}): ${(
        latestMood?.emotions ?? ["Не выбрано"]
      ).join(", ")}.`,
      bg: "radial-gradient(90% 65% at 50% 0%, rgba(255,122,168,0.45), transparent 72%), linear-gradient(180deg, #ef3f7c 0%, #b91650 52%, #3d051e 100%)",
      spark: moodWindow.map((m) => Math.round((m.valence + 1) * 50)),
    },
    {
      id: "calm",
      title: "Спокойствие ночей",
      metric: calmNightsPct,
      unit: "% до 1 пробужд.",
      chip: `Посл.: ${latestSleep?.awakenings ?? 0} раз`,
      insight: `В ${subset.filter((n) => n.awakenings <= 1).length} из ${subset.length} ночей вы просыпались не более одного раза.`,
      bg: "radial-gradient(90% 65% at 50% 0%, rgba(110,201,163,0.38), transparent 72%), linear-gradient(180deg, #4b806b 0%, #24473a 54%, #0c1b15 100%)",
      spark: subset.map((n) => Math.max(20, 100 - n.awakenings * 28)),
    },
    {
      id: "morning",
      title: "Бодрость утром",
      metric: avgQuality,
      unit: "% среднее",
      chip: `Сегодня ${latestSleep?.quality ?? 0}%`,
      insight: `Средняя оценка бодрости за ${subset.length} ночей составляет ${avgQuality}% при плане ${(targetMin / 60).toFixed(1)} ч.`,
      bg: "radial-gradient(90% 65% at 50% 0%, rgba(190,242,100,0.42), transparent 72%), linear-gradient(180deg, #7bc209 0%, #487d00 54%, #1a3100 100%)",
      spark: subset.map((n) => n.quality),
    },
    {
      id: "habits",
      title: "Режим и практики",
      metric: habitScorePct,
      unit: "% дня",
      chip: `${Math.round(breathMinutes)}м · ${waterMl}мл`,
      insight: `Сегодня отмечено ${breathMinutes} мин дыхания и ${waterMl} мл воды; ниже — график выполнения цели сна по записям.`,
      bg: "radial-gradient(90% 65% at 50% 0%, rgba(251,191,146,0.42), transparent 72%), linear-gradient(180deg, #df9373 0%, #9b7040 52%, #2c3f14 100%)",
      spark: subset.map((n) =>
        Math.min(100, Math.round((n.durationMin / Math.max(1, targetMin)) * 100))
      ),
    },
    {
      id: "duration",
      title: "Длительность сна",
      metric: +(avgDurMin / 60).toFixed(1),
      unit: "часов в ср.",
      chip: `${Math.floor(avgDurMin / 60)}ч ${String(avgDurMin % 60).padStart(2, "0")}м`,
      insight: `Среднее время в постели за ${subset.length} ночей: ${Math.floor(avgDurMin / 60)}ч ${String(avgDurMin % 60).padStart(2, "0")}м (${Math.round((avgDurMin / Math.max(1, targetMin)) * 100)}% от цели).`,
      bg: "radial-gradient(90% 65% at 50% 0%, rgba(147,197,253,0.44), transparent 72%), linear-gradient(180deg, #3575eb 0%, #0d2a85 52%, #050b24 100%)",
      spark: subset.map((n) => +(n.durationMin / 60).toFixed(1)),
    },
  ]

  let runningTop = 0
  const positions = cards.map((c) => {
    const top = runningTop
    const isExp = expandedId === c.id
    runningTop += isExp ? 222 : 50
    return { id: c.id, top, isExp }
  })
  const stackHeight = runningTop + 18

  return (
    <div className="analytics-screen relative space-y-4 px-4 pt-2.5 pb-34">
      {/* Ambient Oceanic-Emerald Top Glow */}
      <div
        aria-hidden
        className="somna-aura-drift pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{
          backgroundImage:
            "radial-gradient(88% 58% at 50% 10%, rgba(45, 212, 191, 0.2), rgba(99, 102, 241, 0.1) 48%, rgba(5, 5, 8, 0) 76%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold tracking-tight text-white">
              Аналитика
            </h1>
            <SlidingTabs
              items={PERIODS}
              value={bentoPeriod}
              onValueChange={setBentoPeriod}
              ariaLabel="Период аналитики"
              size="xs"
            />
          </div>
          <p className="mt-0.5 text-[10.5px] text-white/50">
            <TextSwapSoft
              value={`${subset.length} ${pluralRu(subset.length, ["ночь", "ночи", "ночей"])} · ${moodWindow.length} ${pluralRu(moodWindow.length, ["чек-ин", "чек-ина", "чек-инов"])}`}
            />
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic(8)
            playPhoneSweep({
              change: () => setWeeklyRecapOpen(true),
            })
          }}
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[#e8ff1f]/28 bg-[#e8ff1f]/[0.14] px-3 py-1.5 text-[11px] font-semibold text-[#f1ff76] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-[#e8ff1f]/[0.22] active:scale-95 motion-reduce:transition-none"
        >
          <AnimatedSparkles size={13} />
          <span>Итоги</span>
        </button>
      </header>

      {/* Reference-Grade Twin Hero Summary Strip (Veri Mint + Crimson Mood Glow) */}
      <div className="relative z-10 grid grid-cols-2 gap-2.5">
        <GlowCard
          theme="emerald-lime"
          coreOpacity={0.9}
          className="min-h-[126px] rounded-[24px]"
          contentClassName="flex flex-col justify-between p-3.5"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-white/82">
            <span>Индекс ритма</span>
            <span className="font-mono text-[9.5px] text-[#e8ff1f]">5 осей</span>
          </div>
          <div className="my-1.5 flex items-end justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <DotMatrix value={sleepBalanceIndex} size="md" countUp glow />
              <span className="font-mono text-xs text-white/75">%</span>
            </div>
            <Sparkline
              values={subset.map((n) => n.quality)}
              label="Динамика бодрости"
              height={22}
              className="w-14 shrink-0 text-[#e8ff1f]/90"
            />
          </div>
          <DottedTrack value={sleepBalanceIndex / 100} dots={14} color="#e8ff1f" />
        </GlowCard>

        <GlowCard
          theme="crimson-rose"
          coreOpacity={0.9}
          className="min-h-[126px] rounded-[24px]"
          contentClassName="flex flex-col justify-between p-3.5"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-white/82">
            <span>{insightsReport.linkPct > 3 ? "Сон → эмоции" : "Эмоц. баланс"}</span>
            <span className="font-mono text-[9.5px] text-rose-200">
              {moodWindow.length} зап.
            </span>
          </div>
          <div className="my-1.5 flex items-end justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <DotMatrix
                value={insightsReport.linkPct > 3 ? `+${insightsReport.linkPct}` : avgMoodPct}
                size="md"
                countUp={insightsReport.linkPct <= 3}
                glow
              />
              <span className="font-mono text-xs text-white/75">%</span>
            </div>
            <Sparkline
              values={moodWindow.map((m) => Math.round((m.valence + 1) * 50))}
              label="Динамика эмоций"
              height={22}
              className="w-14 shrink-0 text-rose-200/90"
            />
          </div>
          <div className="truncate text-[10px] text-white/62">
            {insightsReport.linkPct > 3
              ? "выше после 7+ ч сна"
              : `Отбой ±${avgDev} мин`}
          </div>
        </GlowCard>
      </div>

      {/* Apple Wallet Stack (Pure GPU translateY + layout FLIP, keyboard-accessible) */}
      <div className="relative z-10 w-full" style={{ height: stackHeight }}>
        {cards.map((card, index) => {
          const pos = positions[index]
          const isExp = pos.isExp

          const sparkArr = card.spark.length >= 2 ? card.spark : [50, 50]
          const sLo = Math.min(...sparkArr) - 1
          const sHi = Math.max(...sparkArr) + 1
          const sparkPts: [number, number][] = sparkArr.map((v, i) => [
            6 + (i / Math.max(1, sparkArr.length - 1)) * 108,
            24 - ((v - sLo) / Math.max(1, sHi - sLo)) * 18,
          ])

          const toggleCard = () => {
            haptic(5)
            setExpandedId((prev) => (prev === card.id ? "" : card.id))
          }

          return (
            <m.div
              key={card.id}
              layout
              initial={false}
              animate={{ y: pos.top }}
              transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.cardSpring}
              style={{
                top: 0,
                background: card.bg,
                zIndex: index + 1,
                boxShadow:
                  "0 -8px 24px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.34)",
              }}
              className={cn(
                "absolute inset-x-0 flex flex-col justify-between overflow-hidden rounded-[28px] p-4 text-white select-none",
                isExp ? "h-[228px]" : "h-[96px]"
              )}
            >
              <div
                aria-hidden
                className="oled-grain pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
              />
              <div
                aria-hidden
                className="specular-rim pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
              />

              <button
                type="button"
                aria-expanded={isExp}
                onClick={toggleCard}
                className={cn(
                  "relative z-10 flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-0 text-left text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ff1f]/55 focus-visible:rounded-lg",
                  !isExp && "h-full items-start"
                )}
              >
                <span className="text-[16px] font-semibold tracking-tight drop-shadow-xs">
                  {card.title}
                </span>

                <div className="flex items-center gap-2">
                  {!isExp ? (
                    <span className="rounded-full border border-white/16 bg-white/[0.12] px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-white/95 backdrop-blur-xs">
                      <TextSwapSoft value={card.chip} align="end" />
                    </span>
                  ) : null}
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex origin-center text-white/80 transition-transform duration-[var(--acc-chevron)] ease-[var(--acc-ease)] motion-reduce:transition-none",
                      isExp && "-scale-y-100"
                    )}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 6.5L8 10.5L12 6.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </span>
                </div>
              </button>

              {isExp ? (
                <m.div
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.modalOpen}
                  className="relative z-10 mt-1 flex flex-1 flex-col justify-between"
                >
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <span className="font-mono text-[10.5px] text-white/70">
                        {card.unit}
                      </span>
                      <div className="mt-1">
                        <DotMatrix value={card.metric} size="md" countUp />
                      </div>
                    </div>

                    <svg viewBox="0 0 120 30" className="h-9 w-28 overflow-visible">
                      <defs>
                        <linearGradient id={`wsp-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <line
                        x1="6"
                        x2="114"
                        y1="26"
                        y2="26"
                        stroke="rgba(255,255,255,0.16)"
                        strokeDasharray="2 3"
                      />
                      <path
                        d={`${smoothSvgPath(sparkPts)} L ${sparkPts[sparkPts.length - 1][0].toFixed(1)},28 L ${sparkPts[0][0].toFixed(1)},28 Z`}
                        fill={`url(#wsp-${card.id})`}
                      />
                      <path
                        d={smoothSvgPath(sparkPts)}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={sparkPts[sparkPts.length - 1][0]}
                        cy={sparkPts[sparkPts.length - 1][1]}
                        r="5.5"
                        fill="rgba(232,255,31,0.22)"
                      />
                      <circle
                        cx={sparkPts[sparkPts.length - 1][0]}
                        cy={sparkPts[sparkPts.length - 1][1]}
                        r="3"
                        fill="#e8ff1f"
                      />
                    </svg>
                  </div>

                  <p className="text-center text-[11px] leading-snug text-white/85">
                    {card.insight}
                  </p>

                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (card.id === "mood" || card.id === "habits") {
                          setMoodDrawerOpen(true)
                        } else {
                          setSleepLogOpen(true)
                        }
                      }}
                      title={
                        card.id === "mood" || card.id === "habits"
                          ? "Записать состояние"
                          : "Записать сон"
                      }
                      aria-label={
                        card.id === "mood" || card.id === "habits"
                          ? "Записать состояние"
                          : "Записать сон"
                      }
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/22 bg-white/[0.12] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.2] active:scale-95 motion-reduce:transition-none"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex h-8 items-center justify-center rounded-full border border-white/25 bg-white/[0.15] px-4 font-mono text-[10.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] backdrop-blur-md">
                      <TextSwapSoft value={card.chip} />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTab("practices")
                      }}
                      title="Таймер дыхания"
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/22 bg-white/[0.12] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.2] active:scale-95 motion-reduce:transition-none"
                    >
                      <Wind className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </m.div>
              ) : null}
            </m.div>
          )
        })}
      </div>

      <section className="analytics-card analytics-profile" aria-labelledby="rhythm-profile-title">
        <div className="analytics-card-heading">
          <div>
            <h2 id="rhythm-profile-title">Профиль сна и ритма</h2>
            <p>За {subset.length} {pluralRu(subset.length, ["ночь", "ночи", "ночей"])}</p>
          </div>
          {subset.length > 0 && (
            <div className="analytics-profile-index">
              <strong>{sleepBalanceIndex}<span>%</span></strong>
              <span>Индекс ритма</span>
            </div>
          )}
        </div>

        {subset.length > 0 ? (
          <div className="analytics-profile-body">
            <RhythmRadar axes={radarData} />
            <dl className="analytics-profile-scores">
              {radarData.map(({ axis, score }) => (
                <div key={axis}>
                  <dt>{axis}</dt>
                  <dd>{score}%</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className="analytics-empty">Добавьте запись о сне, чтобы увидеть профиль ритма.</p>
        )}
      </section>

      {(insightsReport.insights.length > 0 || weeklyGoal) && (
        <section className="analytics-card analytics-insights" aria-labelledby="rhythm-insights-title">
          <div className="analytics-card-heading">
            <div>
              <h2 id="rhythm-insights-title">Инсайты ритма</h2>
              <p>Сон и самочувствие по записям журнала</p>
            </div>
          </div>

          {weeklyGoal && (
            <div className="analytics-weekly-goal">
              <span className="analytics-insight-icon"><Check size={15} aria-hidden="true" /></span>
              <div>
                <span>Фокус недели</span>
                <strong>{weeklyGoal.text}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic(5)
                  setWeeklyGoal(null)
                }}
                aria-label="Снять фокус недели"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {insightsReport.insights.length > 0 && (
            <ul className="analytics-insight-list">
              {insightsReport.insights.map((insight) => {
                const Icon = INSIGHT_ICONS[insight.tone]
                return (
                  <li key={insight.id} className="analytics-insight" data-tone={insight.tone}>
                    <span className="analytics-insight-icon"><Icon size={17} aria-hidden="true" /></span>
                    <div>
                      <h3>{insight.title}</h3>
                      <p>{insight.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {factorStats.length > 0 && (
        <section className="analytics-card analytics-factors" aria-labelledby="rhythm-factors-title">
          <div className="analytics-card-heading">
            <div>
              <h2 id="rhythm-factors-title">Факторы состояния</h2>
              <p>
                По {moodWindow.length} {pluralRu(moodWindow.length, ["чек-ину", "чек-инам", "чек-инам"])}
              </p>
            </div>
          </div>
          <table className="analytics-factor-table" aria-labelledby="rhythm-factors-title">
            <thead>
              <tr>
                <th scope="col">Фактор</th>
                <th scope="col">Отметки</th>
                <th scope="col">Ср. баланс</th>
              </tr>
            </thead>
            <tbody>
              {factorStats.map(({ name, count, avgPct }) => (
                <tr key={name}>
                  <th scope="row">
                    <span>{name}</span>
                    <span className="analytics-factor-track" aria-hidden="true">
                      <span style={{ width: `${avgPct}%` }} />
                    </span>
                  </th>
                  <td>{count}×</td>
                  <td>{avgPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Tabs defaultValue="series" className="analytics-charts">
        <TabsList aria-label="Графики аналитики" className="analytics-chart-tabs">
          {CHART_TABS.map(({ id, label, Icon }) => (
            <TabsTrigger key={id} value={id} className="analytics-chart-tab">
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="series" className="analytics-chart-panel">
          {subset.length > 0 ? (
            <>
              <SLWeeklySeriesChart />
              <SLWeeklyMetricCard />
            </>
          ) : (
            <p className="analytics-card analytics-empty">Динамика появится после первой записи о сне.</p>
          )}
        </TabsContent>
        <TabsContent value="compare" className="analytics-chart-panel">
          {subset.length > 0 ? (
            <>
              <SLScheduleComparisonCard />
              <SLWeeklyDonutChart />
            </>
          ) : (
            <p className="analytics-card analytics-empty">Добавьте запись о сне, чтобы сравнить её с планом.</p>
          )}
        </TabsContent>
        <TabsContent value="timeline" className="analytics-chart-panel">
          {subset.length > 0 || moodHistory.length > 0 ? (
            <SLActivityTimelineCard />
          ) : (
            <p className="analytics-card analytics-empty">Здесь появятся записи о сне и настроении.</p>
          )}
          {subset.length > 0 && <SLWeeklyBarChart />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AnalyticsScreen
