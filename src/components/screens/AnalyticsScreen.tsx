import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Plus, Sparkles, Wind } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { useIPhoneGlimm } from "@/components/iphone/IPhoneFrame"
import { DotMatrix } from "@/components/ui/dot-matrix"
import { SpectrumGraph } from "@/components/ui/spectrum-graph"
import { SoftGlassCard } from "@/components/ui/glow-card"
import { Card } from "@/components/ui/card"
import { BarList } from "@/components/ui/bar-list"
import { RadialGauge } from "@/components/ui/radial-gauge"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { SlidingTabs, TextSwapSoft } from "@/components/ui/t-motion"
import {
  SLActivityTimelineCard,
  SLScheduleComparisonCard,
  SLWeeklyBarChart,
  SLWeeklyDonutChart,
  SLWeeklyMetricCard,
  SLWeeklySeriesChart,
} from "@/components/ui/sl-data-display"
import { SOMNA_TRANSITIONS, smoothSvgPath } from "@/lib/motion"
import { computeSleepInsights, type InsightTone } from "@/lib/sleepInsights"
import {
  getBedtimeDeviationMin,
  getTargetDurationMin,
  useSomna,
  type BentoPeriod,
} from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

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

type SLAnalyticsTab = "series" | "compare" | "timeline"

const SL_TABS: { id: SLAnalyticsTab; label: string }[] = [
  { id: "series", label: "Динамика" },
  { id: "compare", label: "План / Факт" },
  { id: "timeline", label: "Лента и сон" },
]

const RADAR_CONFIG = {
  score: {
    label: "Индекс (%)",
    color: "#e8ff1f",
  },
} satisfies ChartConfig

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
    spectrum,
    updateSpectrumAxis,
    setWeeklyRecapOpen,
    weeklyGoal,
    setActiveTab,
    setMoodDrawerOpen,
  } = useSomna()

  const INSIGHT_ACCENTS: Record<InsightTone, string> = {
    emerald: "#34d399",
    ember: "#fb923c",
    violet: "#a78bfa",
    rose: "#fb7185",
    lime: "#e8ff1f",
    cobalt: "#38bdf8",
  }

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
  const [slTab, setSlTab] = React.useState<SLAnalyticsTab>("series")

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

  // Honest Mood Factors ranking loop (closes MoodCheckInDrawer promise!)
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

  // Honest 6-card Apple Wallet stack driven 100% by user-logged data (zero placeholders)
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
    <div className="space-y-3.5 px-4 pt-2.5 pb-34">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[23px] font-bold tracking-tight text-white">
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
          <p className="mt-0.5 text-[10.5px] text-white/48">
            <TextSwapSoft
              value={`Показаны ${subset.length} ночей · ${moodWindow.length} чек-инов`}
            />
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            playPhoneSweep({
              change: () => setWeeklyRecapOpen(true),
            })
          }
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[#e8ff1f]/25 bg-[#e8ff1f]/[0.13] px-3 py-1.5 text-[11px] font-semibold text-[#f1ff76] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-[#e8ff1f]/[0.2] active:scale-95 motion-reduce:transition-none"
        >
          <Sparkles className="h-3 w-3" />
          <span>Итоги</span>
        </button>
      </header>

      {/* Apple Wallet Stack (Real Self-Tracked Data Only, GPU transform y without layout thrashing) */}
      <div className="relative w-full" style={{ height: stackHeight }}>
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

          return (
            <motion.div
              key={card.id}
              initial={false}
              animate={{
                y: pos.top,
                height: isExp ? 228 : 96,
              }}
              transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.cardSpring}
              onClick={() =>
                setExpandedId((prev) => (prev === card.id ? "" : card.id))
              }
              style={{
                top: 0,
                background: card.bg,
                zIndex: index + 1,
                boxShadow:
                  "0 -8px 24px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.34)",
              }}
              className="absolute inset-x-0 flex cursor-pointer flex-col justify-between overflow-hidden rounded-[28px] p-4 text-white select-none"
            >
              <div
                aria-hidden
                className="oled-grain pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
              />
              <div
                aria-hidden
                className="specular-rim pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
              />

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[16px] font-semibold tracking-tight drop-shadow-xs">
                  {card.title}
                </span>

                <div className="flex items-center gap-2">
                  {!isExp ? (
                    <span className="rounded-full border border-white/16 bg-white/[0.12] px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-white/95 backdrop-blur-xs">
                      <TextSwapSoft value={card.chip} align="end" />
                    </span>
                  ) : null}
                  {/* 21-accordion symmetric scaleY(-1) chevron */}
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
              </div>

              {isExp ? (
                <motion.div
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.modalOpen}
                  className="relative z-10 mt-1 flex flex-1 flex-col justify-between"
                >
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <span className="font-mono text-[9.5px] tracking-widest text-white/70 uppercase">
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
                        setMoodDrawerOpen(true)
                      }}
                      title="Записать состояние"
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
                </motion.div>
              ) : null}
            </motion.div>
          )
        })}
      </div>

      {/* Honest 5-Axis Sleep & Balance Profile (Official shadcn RadarChart + RadialGauge) */}
      <Card className="border-white/[0.11] bg-[#08090f]/76 p-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Профиль сна и ритма
            </h2>
            <p className="text-[11px] text-white/50">
              Сводка 5 отслеживаемых осей за {subset.length} ночей
            </p>
          </div>
          <RadialGauge
            value={sleepBalanceIndex}
            max={100}
            size={62}
            thickness={5}
            segments={18}
            gap={3}
            sweep={360}
            color="#e8ff1f"
            glow
          >
            <span className="font-mono text-[11px] font-semibold text-white tabular-nums">
              {sleepBalanceIndex}%
            </span>
          </RadialGauge>
        </div>

        <ChartContainer
          config={RADAR_CONFIG}
          className="mx-auto aspect-square max-h-[215px] w-full"
        >
          <RadarChart data={radarData} outerRadius="70%">
            <PolarGrid gridType="circle" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "rgba(255,255,255,0.68)", fontSize: 10 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Radar
              dataKey="score"
              stroke="#e8ff1f"
              strokeWidth={2}
              fill="#e8ff1f"
              fillOpacity={0.22}
              isAnimationActive={!reduceMotion}
            />
          </RadarChart>
        </ChartContainer>
      </Card>

      {/* Honest Data-Driven Sleep & Mood Insights */}
      {insightsReport.insights.length > 0 ? (
        <Card className="space-y-2.5 border-white/[0.11] bg-[#08090f]/76 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">Инсайты ритма</h2>
              <p className="text-[11px] text-white/50">
                Связь сна, отбоя и факторов настроения
              </p>
            </div>
            {weeklyGoal ? (
              <span className="max-w-[140px] truncate rounded-full border border-[#e8ff1f]/25 bg-[#e8ff1f]/[0.1] px-2.5 py-0.5 text-[10px] font-medium text-[#e8ff1f]">
                Цель: {weeklyGoal.text}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {insightsReport.insights.map((ins) => {
              const dotColor = INSIGHT_ACCENTS[ins.tone]
              return (
                <div
                  key={ins.id}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: dotColor,
                        boxShadow: `0 0 8px ${dotColor}80`,
                      }}
                    />
                    <span>{ins.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/68">
                    {ins.body}
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}

      {/* Honest Mood Factors Impact Ranking (@dashboardcn BarList) */}
      {factorStats.length > 0 ? (
        <Card className="border-white/[0.11] bg-[#08090f]/76 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Факторы состояния
              </h2>
              <p className="text-[11px] text-white/50">
                Частота отметок и средний баланс по {moodWindow.length} чек-инам
              </p>
            </div>
            <span className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-0.5 font-mono text-[10px] text-white/75">
              топ-{factorStats.length}
            </span>
          </div>
          <BarList
            data={factorStats.map((fac) => ({
              name: `${fac.name} · ${fac.count}×`,
              value: fac.avgPct,
            }))}
            color="#e8ff1f"
            valueFormatter={(v) => `${Math.round(v)}%`}
          />
        </Card>
      ) : null}

      {/* Interactive SL UI Library Analytics Showcase with SlidingTabs */}
      <div className="space-y-2.5">
        <SlidingTabs
          items={SL_TABS}
          value={slTab}
          onValueChange={setSlTab}
          ariaLabel="Режим графиков SL UI"
          fullWidth
          size="sm"
        />

        {slTab === "series" && (
          <div className="space-y-3">
            <SLWeeklySeriesChart />
            <SLWeeklyMetricCard />
          </div>
        )}
        {slTab === "compare" && (
          <div className="space-y-3">
            <SLScheduleComparisonCard />
            <SLWeeklyDonutChart />
          </div>
        )}
        {slTab === "timeline" && (
          <div className="space-y-3">
            <SLActivityTimelineCard />
            <SLWeeklyBarChart />
          </div>
        )}
      </div>

      {/* Interactive Self-Assessment Axis Vector with Baseline Legend */}
      <SoftGlassCard>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Ручная самооценка состояния
            </h2>
            <p className="text-[11px] text-white/50">
              Передвигайте точки на осях — сравнение с вашим стартовым профилем
            </p>
          </div>
        </div>
        <SpectrumGraph
          axes={spectrum}
          interactive
          showBaseline
          showLegend
          onChangeAxis={(id, val) => updateSpectrumAxis(id, val, false)}
        />
      </SoftGlassCard>
    </div>
  )
}

export default AnalyticsScreen
