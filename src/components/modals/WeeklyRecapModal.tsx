import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Check, Plus, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/drawer"
import { StateOfMindOrb } from "@/components/ui/state-of-mind-orb"
import { Card } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { RadialGauge } from "@/components/ui/radial-gauge"
import { TickBar } from "@/components/ui/tick-bar"
import { ActivityRings, type ActivityRing } from "@/components/ui/activity-rings"
import { BarChart } from "@/components/ui/bar-chart"
import { DotPlot } from "@/components/ui/dot-plot"
import { BarList } from "@/components/ui/bar-list"
import { DotMatrix } from "@/components/ui/dot-matrix"
import {
  StaggerReveal,
  SubtleNumber,
  TextStatesSwap,
  TextSwapSoft,
} from "@/components/ui/t-motion"
import { Button } from "@/components/ui/button"
import { SOMNA_TRANSITIONS } from "@/lib/motion"
import {
  computeSleepInsights,
  computeWeeklyGoalOptions,
  formatDurRu,
} from "@/lib/sleepInsights"
import {
  getBedtimeDeviationMin,
  getTargetDurationMin,
  useSomna,
} from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const STORY_COUNT = 5
const STORY_DURATION_MS = 6800

const SLIDE_MESHES = [
  // 0: Emerald + Chartreuse Glow
  {
    base: "linear-gradient(155deg, #1b8c47 0%, #249144 48%, #0f4f32 100%)",
    blobA:
      "radial-gradient(75% 65% at 18% 22%, rgba(74, 222, 128, 0.56) 0%, transparent 74%)",
    blobB:
      "radial-gradient(70% 70% at 88% 72%, rgba(232, 255, 31, 0.44) 0%, transparent 72%)",
    blobC:
      "radial-gradient(62% 58% at 50% 44%, rgba(5, 18, 12, 0.52) 0%, transparent 76%)",
  },
  // 1: Burnt Orange -> Luminous Peach
  {
    base: "linear-gradient(155deg, #d84b1f 0%, #e05e2c 45%, #8a2611 100%)",
    blobA:
      "radial-gradient(76% 66% at 22% 38%, rgba(255, 198, 152, 0.62) 0%, transparent 72%)",
    blobB:
      "radial-gradient(70% 66% at 86% 24%, rgba(242, 74, 28, 0.64) 0%, transparent 72%)",
    blobC:
      "radial-gradient(72% 62% at 74% 84%, rgba(255, 154, 102, 0.48) 0%, transparent 74%)",
  },
  // 2: Nocturnal Indigo Glow
  {
    base: "linear-gradient(160deg, #171f6e 0%, #0e1240 55%, #07081a 100%)",
    blobA:
      "radial-gradient(78% 60% at 15% 18%, rgba(99, 102, 241, 0.54) 0%, transparent 72%)",
    blobB:
      "radial-gradient(72% 66% at 88% 82%, rgba(129, 140, 248, 0.42) 0%, transparent 72%)",
    blobC:
      "radial-gradient(62% 54% at 50% 52%, rgba(232, 255, 31, 0.14) 0%, transparent 76%)",
  },
  // 3: Oceanic Teal Glow
  {
    base: "linear-gradient(160deg, #0a4d47 0%, #072e35 55%, #04151b 100%)",
    blobA:
      "radial-gradient(74% 64% at 20% 24%, rgba(52, 211, 153, 0.48) 0%, transparent 74%)",
    blobB:
      "radial-gradient(66% 66% at 85% 78%, rgba(56, 189, 248, 0.34) 0%, transparent 72%)",
    blobC:
      "radial-gradient(60% 60% at 50% 48%, rgba(232, 255, 31, 0.16) 0%, transparent 74%)",
  },
  // 4: Crimson-Rose Velvet (Stress 04:00 sibling atmosphere)
  {
    base: "linear-gradient(160deg, #6e103d 0%, #3a0826 55%, #12040d 100%)",
    blobA:
      "radial-gradient(76% 60% at 24% 20%, rgba(251, 113, 133, 0.46) 0%, transparent 72%)",
    blobB:
      "radial-gradient(68% 66% at 82% 80%, rgba(192, 132, 252, 0.36) 0%, transparent 72%)",
    blobC:
      "radial-gradient(62% 52% at 50% 56%, rgba(244, 63, 94, 0.28) 0%, transparent 76%)",
  },
] as const

const AREA_CHART_CONFIG = {
  quality: {
    label: "Бодрость (%)",
    color: "#e8ff1f",
  },
  moodPct: {
    label: "Настроение (%)",
    color: "#fb7185",
  },
} satisfies ChartConfig

export function WeeklyRecapModal() {
  const {
    weeklyRecapOpen,
    setWeeklyRecapOpen,
    weeklyGoal,
    setWeeklyGoal,
    sleepHistory,
    moodHistory,
    bedtimeGoal,
    wakeGoal,
    setMoodDrawerOpen,
    restoreWidget,
  } = useSomna()

  const reduceMotion = useReducedMotion()
  const [slide, setSlide] = React.useState(0)
  const [progress, setProgress] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const [selectedNightIdx, setSelectedNightIdx] = React.useState<number | null>(null)
  const [activeRingIdx, setActiveRingIdx] = React.useState<number | null>(null)
  const downInfoRef = React.useRef<{ x: number; t: number } | null>(null)

  React.useEffect(() => {
    if (weeklyRecapOpen) {
      setSlide(0)
      setProgress(0)
      setPaused(false)
      setSelectedNightIdx(null)
      setActiveRingIdx(null)
    }
  }, [weeklyRecapOpen])

  // Auto-advance timer (pauses cleanly while holding or inspecting charts)
  React.useEffect(() => {
    if (!weeklyRecapOpen || paused) return
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = now - last
      last = now
      setProgress((prev) => {
        const next = prev + dt / STORY_DURATION_MS
        if (next >= 1) {
          if (slide < STORY_COUNT - 1) {
            setSlide((s) => s + 1)
            return 0
          } else {
            setWeeklyRecapOpen(false)
            return 1
          }
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [weeklyRecapOpen, paused, slide, setWeeklyRecapOpen])

  const goTo = (idx: number) => {
    setSlide(Math.max(0, Math.min(STORY_COUNT - 1, idx)))
    setProgress(0)
  }

  // Real data calculations from tracked store
  const last7 = React.useMemo(() => sleepHistory.slice(-7), [sleepHistory])
  const count = Math.max(1, last7.length)

  const targetMin = getTargetDurationMin(bedtimeGoal, wakeGoal)
  const targetHrs = +(targetMin / 60).toFixed(1)
  const avgDurMin = Math.round(last7.reduce((s, n) => s + n.durationMin, 0) / count)
  const avgHrs = (avgDurMin / 60).toFixed(1)
  const avgQuality = Math.round(last7.reduce((s, n) => s + n.quality, 0) / count)
  const avgAbsDev = Math.round(
    last7.reduce(
      (s, n) => s + Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal)),
      0
    ) / count
  )

  const goalHits = React.useMemo(
    () => last7.filter((n) => n.durationMin >= targetMin * 0.94).length,
    [last7, targetMin]
  )
  const goalHitPct = Math.round((goalHits / count) * 100)
  const durationGoalPct = Math.min(100, Math.round((avgDurMin / Math.max(1, targetMin)) * 100))
  const bedtimePrecisionPct = Math.max(0, Math.min(100, Math.round(100 - avgAbsDev * 1.4)))
  const calmNightsPct = Math.round(
    (last7.filter((n) => n.awakenings <= 1).length / count) * 100
  )
  const rhythmCompositePct = Math.round(
    (durationGoalPct + bedtimePrecisionPct + calmNightsPct) / 3
  )

  const bestNightIndex = React.useMemo(() => {
    if (!last7.length) return 0
    let idx = 0
    for (let i = 1; i < last7.length; i++) {
      if (last7[i].quality > last7[idx].quality) idx = i
    }
    return idx
  }, [last7])

  const inspectedIdx = selectedNightIdx ?? bestNightIndex
  const inspectedNight = last7[inspectedIdx] ?? last7[0]

  const avgValence = moodHistory.length
    ? moodHistory.reduce((s, m) => s + m.valence, 0) / moodHistory.length
    : 0.42

  // Real frequency count of logged emotions & factor impact list for @dashboardcn/bar-list
  const rankedEmotions = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of moodHistory) {
      for (const em of entry.emotions) {
        const trimmed = em.trim()
        if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, times]) => ({ name, times }))
  }, [moodHistory])

  const factorBarItems = React.useMemo(() => {
    const stats = new Map<string, { count: number; totalPct: number }>()
    for (const entry of moodHistory) {
      const pct = Math.round((entry.valence + 1) * 50)
      for (const f of entry.factors) {
        const trimmed = f.trim()
        if (!trimmed) continue
        const prev = stats.get(trimmed) ?? { count: 0, totalPct: 0 }
        stats.set(trimmed, { count: prev.count + 1, totalPct: prev.totalPct + pct })
      }
    }
    return [...stats.entries()]
      .map(([name, info]) => ({
        name: `${name} (${info.count}×)`,
        value: Math.round(info.totalPct / info.count),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)
  }, [moodHistory])

  // BarChart data rows for Slide 2
  const barChartRows = React.useMemo(
    () =>
      last7.map((n, index) => ({
        index,
        day: n.dayShort,
        date: n.date,
        hours: +(n.durationMin / 60).toFixed(2),
        bedtime: n.bedtime,
        wakeTime: n.wakeTime,
        quality: n.quality,
      })),
    [last7]
  )

  // ActivityRings data for Slide 3
  const ringsData: ActivityRing[] = React.useMemo(
    () => [
      { label: "Длительность", value: durationGoalPct, max: 100, color: "#e8ff1f" },
      { label: "Точность отбоя", value: bedtimePrecisionPct, max: 100, color: "#34d399" },
      { label: "Спокойные ночи", value: calmNightsPct, max: 100, color: "#38bdf8" },
    ],
    [durationGoalPct, bedtimePrecisionPct, calmNightsPct]
  )

  const activeRingSummary =
    activeRingIdx !== null && ringsData[activeRingIdx]
      ? ringsData[activeRingIdx]
      : { label: "Индекс ритма", value: rhythmCompositePct, max: 100, color: "#e8ff1f" }

  // Dual series data mapped strictly by dateKey / timestamp (zero shifted mood alignment)
  const areaChartData = React.useMemo(() => {
    return last7.map((n) => {
      const matchingMoods = moodHistory.filter((m) => {
        if (n.dateKey && m.dateKey) return m.dateKey === n.dateKey
        return m.timestamp.toLowerCase().includes(n.dayShort.toLowerCase())
      })
      const moodPct = matchingMoods.length
        ? Math.round(
            matchingMoods.reduce((acc, m) => acc + (m.valence + 1) * 50, 0) /
              matchingMoods.length
          )
        : null
      return {
        day: n.dayShort,
        quality: n.quality,
        moodPct,
      }
    })
  }, [last7, moodHistory])

  const dateRangeShort = React.useMemo(() => {
    if (last7.length === 0) return "Нет записей"
    const first = last7[0].date
    const last = last7[last7.length - 1].date
    return first === last ? first : `${first} – ${last}`
  }, [last7])

  const insightsReport = React.useMemo(
    () =>
      computeSleepInsights({
        sleepHistory: last7,
        moodHistory,
        bedtimeGoal,
        wakeGoal,
      }),
    [last7, moodHistory, bedtimeGoal, wakeGoal]
  )

  const goalOptions = React.useMemo(
    () =>
      computeWeeklyGoalOptions({
        bedSdMin: insightsReport.bedSdMin,
        sleepDebtMin: insightsReport.sleepDebtMin,
        recentMoodCheckins: moodHistory.length,
      }),
    [insightsReport.bedSdMin, insightsReport.sleepDebtMin, moodHistory.length]
  )

  const mesh = SLIDE_MESHES[slide] ?? SLIDE_MESHES[0]

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setPaused(true)
    downInfoRef.current = { x: e.clientX, t: performance.now() }
  }

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setPaused(false)
    const info = downInfoRef.current
    downInfoRef.current = null
    if (!info) return
    const heldMs = performance.now() - info.t
    if (heldMs > 260) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width)
    if (relX < 0.3) {
      goTo(slide - 1)
    } else if (slide < STORY_COUNT - 1) {
      goTo(slide + 1)
    } else {
      setWeeklyRecapOpen(false)
    }
  }

  const slideMotionTransition = reduceMotion
    ? { duration: 0 }
    : SOMNA_TRANSITIONS.modalOpen

  return (
    <Dialog open={weeklyRecapOpen} onOpenChange={setWeeklyRecapOpen}>
      <DialogContent
        hideClose
        onPointerDown={handleStagePointerDown}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={() => {
          setPaused(false)
          downInfoRef.current = null
        }}
        className="flex flex-col overflow-hidden bg-black p-0 text-white select-none"
      >
        <DialogTitle className="sr-only">Итоги недели Somna</DialogTitle>

        {/* Full-bleed Atmospheric Mesh Backdrop (GPU opacity cross-fade, zero blur filter) */}
        <motion.div
          key={`bg-${slide}`}
          initial={{ opacity: 0.78 }}
          animate={{ opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
          }
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: mesh.base }}
        >
          <div className="absolute inset-0" style={{ background: mesh.blobA }} />
          <div className="absolute inset-0" style={{ background: mesh.blobB }} />
          <div className="absolute inset-0" style={{ background: mesh.blobC }} />
          <div className="oled-grain absolute inset-0 opacity-[0.04] mix-blend-overlay" />
          <div
            className="absolute inset-x-0 top-0 h-28"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 100%)",
            }}
          />
        </motion.div>

        {/* Top Stories Progress Segments + Practices-Style Header */}
        <div className="relative z-20 px-4 pt-[54px]">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: STORY_COUNT }).map((_, i) => {
              const scaleRatio = i < slide ? 1 : i === slide ? progress : 0
              return (
                <button
                  key={i}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    goTo(i)
                  }}
                  aria-label={`Слайд ${i + 1}`}
                  className="h-[2.5px] flex-1 cursor-pointer overflow-hidden rounded-full bg-white/30"
                >
                  <div
                    className="h-full w-full origin-left rounded-full bg-white will-change-transform"
                    style={{ transform: `scaleX(${scaleRatio.toFixed(4)})` }}
                  />
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11.5px] font-medium tracking-tight text-white/90 backdrop-blur-md">
              Somna · {dateRangeShort}
            </span>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setWeeklyRecapOpen(false)
              }}
              aria-label="Закрыть итоги"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.22] active:scale-95 motion-reduce:transition-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Interactive Story Slide Stage */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-5 pb-14">
          <AnimatePresence mode="wait">
            {/* SLIDE 0: Emerald Radial Dial Cover + TickBar Register */}
            {slide === 0 && (
              <motion.div
                key="story-0"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={slideMotionTransition}
                className="flex flex-1 flex-col items-center justify-center text-center"
              >
                <div className="relative mb-5 flex items-center justify-center">
                  <RadialGauge
                    value={avgQuality}
                    max={100}
                    size={224}
                    thickness={8}
                    segments={42}
                    gap={2.2}
                    sweep={232}
                    color="#e8ff1f"
                    trackColor="rgba(255,255,255,0.2)"
                    glow
                    animate={!reduceMotion}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-1">
                    <StateOfMindOrb valence={avgValence} size={134} />
                  </div>
                </div>

                <StaggerReveal index={0}>
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-white/80 uppercase">
                    {dateRangeShort}
                  </span>
                </StaggerReveal>
                <StaggerReveal index={1}>
                  <h2 className="mt-1 text-[38px] leading-[1.04] font-bold tracking-[-0.04em] text-white drop-shadow-xs">
                    Ваша неделя
                  </h2>
                </StaggerReveal>

                <StaggerReveal index={2}>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/28 px-4 py-1.5 font-mono text-[11px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md">
                    <span>{last7.length} ночей</span>
                    <span className="text-white/40">·</span>
                    <span>{moodHistory.length} чек-инов</span>
                    <span className="text-white/40">·</span>
                    <span className="text-[#e8ff1f]">ср. {avgHrs} ч</span>
                  </div>
                </StaggerReveal>

                <StaggerReveal index={3} className="mt-4 w-full max-w-[260px]">
                  <div className="rounded-2xl border border-white/14 bg-black/28 px-3.5 py-2.5 backdrop-blur-md">
                    <div className="mb-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-white/70">Ночей в норме сна</span>
                      <span className="font-mono font-semibold text-[#e8ff1f]">
                        {goalHits} / {last7.length}
                      </span>
                    </div>
                    <TickBar
                      value={goalHitPct}
                      max={100}
                      segments={Math.max(7, last7.length * 2)}
                      shape="pill"
                      color="#e8ff1f"
                      trackColor="rgba(255,255,255,0.16)"
                      animate={!reduceMotion}
                      className="h-2.5 gap-1"
                    />
                  </div>
                </StaggerReveal>
              </motion.div>
            )}

            {/* SLIDE 1: Coral Emotions Typography Ladder + @dashboardcn/bar-list Factors */}
            {slide === 1 && (
              <motion.div
                key="story-1"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={slideMotionTransition}
                className="flex flex-1 flex-col justify-center space-y-4"
              >
                <div>
                  <StaggerReveal index={0}>
                    <span className="mb-2.5 block text-[11px] font-semibold tracking-[0.12em] text-white/85 uppercase">
                      ЧАЩЕ ВСЕГО ВЫ ЧУВСТВОВАЛИ
                    </span>
                  </StaggerReveal>

                  {rankedEmotions.length > 0 ? (
                    <div className="space-y-1">
                      {rankedEmotions.map((item, idx) => {
                        const sizes = [
                          "text-[32px] font-bold opacity-100",
                          "text-[26px] font-bold opacity-88",
                          "text-[22px] font-semibold opacity-76",
                          "text-[18px] font-semibold opacity-64",
                          "text-[15px] font-medium opacity-52",
                        ]
                        return (
                          <StaggerReveal key={item.name} index={idx + 1}>
                            <div className="flex items-baseline gap-2">
                              <span
                                className={cn(
                                  "min-w-0 truncate leading-[1.08] tracking-[-0.03em] text-white",
                                  sizes[idx] ?? sizes[4]
                                )}
                              >
                                {item.name}
                              </span>
                              <span className="shrink-0 font-mono text-[12px] font-semibold text-white/80">
                                ×{item.times}
                              </span>
                            </div>
                          </StaggerReveal>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-lg font-semibold text-white">
                        Пока нет отметок настроения
                      </p>
                      <Button
                        size="sm"
                        variant="white"
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          setWeeklyRecapOpen(false)
                          setMoodDrawerOpen(true)
                        }}
                        className="rounded-full"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Сделать первый чек-ин</span>
                      </Button>
                    </div>
                  )}
                </div>

                {factorBarItems.length > 0 ? (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Card className="border-white/15 bg-[#120704]/62 p-3.5 text-white">
                      <div className="mb-2 flex items-center justify-between text-[11px]">
                        <span className="font-semibold tracking-wider text-white/75 uppercase">
                          Факторы недели
                        </span>
                        <span className="font-mono text-white/55">ср. баланс</span>
                      </div>
                      <BarList
                        data={factorBarItems}
                        color="#ffb085"
                        valueFormatter={(v) => `${Math.round(v)}%`}
                      />
                    </Card>
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* SLIDE 2: Indigo Practices-Style Smoked Glass + shadcn BarChart + TickBar */}
            {slide === 2 && (
              <motion.div
                key="story-2"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={slideMotionTransition}
                className="flex flex-1 flex-col justify-center space-y-3"
              >
                <div>
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-indigo-200/80 uppercase">
                    СОН ЗА НЕДЕЛЮ
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <DotMatrix value={avgHrs} size="md" />
                      <span className="text-sm font-medium text-white/75">ч в ср.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {insightsReport.sleepDebtMin > 60 ? (
                        <span className="rounded-full border border-rose-300/22 bg-rose-500/[0.14] px-2 py-0.5 font-mono text-[10px] text-rose-200">
                          Долг {formatDurRu(insightsReport.sleepDebtMin)}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/15 bg-white/[0.1] px-2.5 py-0.5 font-mono text-[11px] text-[#e8ff1f]">
                        Цель {targetHrs}ч
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setPaused(true)
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation()
                    setPaused(false)
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Card className="space-y-3 border-white/14 bg-[#070814]/74 p-3.5 text-white">
                    <BarChart
                      data={barChartRows}
                      xKey="day"
                      yKey="hours"
                      color="#e8ff1f"
                      mutedColor="#94a3b8"
                      variant="gradient"
                      barRadius={8}
                      animate={!reduceMotion}
                      className="aspect-auto h-44 w-full"
                      highlight={(row, index) =>
                        selectedNightIdx !== null
                          ? index === selectedNightIdx
                          : Number(row.hours) >= targetHrs * 0.94
                      }
                      referenceLines={[
                        {
                          y: targetHrs,
                          label: `${targetHrs}ч`,
                          color: "rgba(232,255,31,0.7)",
                        },
                      ]}
                      yFormatter={(v) => `${v.toFixed(1)} ч`}
                      tooltipLabel={(row) =>
                        `${String(row.date)} · ${String(row.bedtime)}–${String(row.wakeTime)}`
                      }
                      onBarClick={(_, index) => setSelectedNightIdx(index)}
                    />

                    <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-white/55">Выполнение плана сна</span>
                        <span className="font-mono font-semibold text-[#e8ff1f]">
                          {durationGoalPct}% от {targetHrs}ч
                        </span>
                      </div>
                      <TickBar
                        value={durationGoalPct}
                        max={100}
                        segments={28}
                        shape="tick"
                        color="#e8ff1f"
                        animate={!reduceMotion}
                        className="h-4 gap-[3px]"
                      />
                    </div>
                  </Card>
                </div>

                {inspectedNight ? (
                  <div className="flex items-center justify-between rounded-full border border-white/14 bg-black/32 px-4 py-2 text-xs backdrop-blur-md">
                    <span className="text-white/65">
                      {selectedNightIdx !== null ? "Выбрано: " : "Лучшая ночь: "}
                      <strong className="font-semibold text-white">
                        {inspectedNight.date}
                      </strong>
                    </span>
                    <span className="font-mono text-[#e8ff1f] tabular-nums">
                      {(inspectedNight.durationMin / 60).toFixed(1)}ч ·{" "}
                      {inspectedNight.quality}% бодр.
                    </span>
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* SLIDE 3: Oceanic Teal ActivityRings + Curved Precision Tick Register */}
            {slide === 3 && (
              <motion.div
                key="story-3"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={slideMotionTransition}
                className="flex flex-1 flex-col justify-center space-y-3"
              >
                <div>
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-emerald-200/80 uppercase">
                    РИТМ И СТАБИЛЬНОСТЬ
                  </span>
                  <h2 className="mt-1 text-[28px] leading-tight font-bold tracking-[-0.03em] text-white">
                    Отбой ±{avgAbsDev} мин
                  </h2>
                  <p className="text-xs text-white/65">
                    Нажмите на кольцо или строку для фокуса по метрике
                  </p>
                </div>

                <div
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setPaused(true)
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation()
                    setPaused(false)
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Card className="flex flex-col items-center space-y-4 border-white/14 bg-[#051214]/72 p-4 text-white">
                    <ActivityRings
                      rings={ringsData}
                      size={158}
                      thickness={11}
                      gap={5}
                      trackOpacity={0.2}
                      activeIndex={activeRingIdx}
                      onActiveIndexChange={setActiveRingIdx}
                    >
                      <div className="px-4 text-center">
                        <div className="font-mono text-[26px] leading-none font-light text-white tabular-nums">
                          <SubtleNumber value={activeRingSummary.value} suffix="%" />
                        </div>
                        <div className="mt-1 text-[10px] font-medium text-white/65">
                          <TextStatesSwap value={activeRingSummary.label} />
                        </div>
                      </div>
                    </ActivityRings>

                    <div className="w-full space-y-2">
                      {ringsData.map((ring, idx) => {
                        const isFocused = activeRingIdx === idx
                        return (
                          <button
                            key={ring.label}
                            type="button"
                            onClick={() => setActiveRingIdx(isFocused ? null : idx)}
                            className={cn(
                              "w-full cursor-pointer rounded-2xl border px-3 py-2 text-left transition-[background-color,border-color] duration-[var(--duration-quick)] motion-reduce:transition-none",
                              isFocused
                                ? "border-white/25 bg-white/[0.1]"
                                : "border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.08]"
                            )}
                          >
                            <div className="mb-1 flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-2 font-medium text-white/90">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: ring.color }}
                                />
                                {ring.label}
                              </span>
                              <span className="font-mono text-xs font-semibold text-white tabular-nums">
                                {ring.value}%
                              </span>
                            </div>
                            <TickBar
                              value={ring.value}
                              max={100}
                              segments={24}
                              shape="pill"
                              color={ring.color}
                              className="h-1.5 gap-1"
                            />
                          </button>
                        )
                      })}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* SLIDE 4: Velvet Crimson shadcn AreaChart + DotPlot Register */}
            {slide === 4 && (
              <motion.div
                key="story-4"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={slideMotionTransition}
                className="flex flex-1 flex-col justify-center space-y-3"
              >
                <div>
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-rose-200/80 uppercase">
                    БОДРОСТЬ И НАСТРОЕНИЕ
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <h2 className="text-[28px] leading-tight font-bold tracking-[-0.03em] text-white">
                      <TextSwapSoft value={`${avgQuality}% в среднем`} />
                    </h2>
                    <span className="rounded-full border border-white/15 bg-white/[0.1] px-2.5 py-0.5 font-mono text-[10.5px] text-rose-200">
                      {last7.length} дн.
                    </span>
                  </div>
                </div>

                <div
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setPaused(true)
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation()
                    setPaused(false)
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Card className="space-y-3 border-white/14 bg-[#120610]/74 p-3.5 text-white">
                    <ChartContainer
                      config={AREA_CHART_CONFIG}
                      className="aspect-auto h-40 w-full"
                    >
                      <AreaChart
                        data={areaChartData}
                        margin={{ top: 8, right: 6, left: 6, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="recap-q-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e8ff1f" stopOpacity={0.38} />
                            <stop offset="95%" stopColor="#e8ff1f" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="recap-m-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fb7185" stopOpacity={0.34} />
                            <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="4 4" />
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis hide domain={[0, 100]} />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Area
                          type="monotone"
                          dataKey="quality"
                          stroke="#e8ff1f"
                          strokeWidth={2.2}
                          fill="url(#recap-q-fill)"
                          isAnimationActive={!reduceMotion}
                        />
                        <Area
                          type="monotone"
                          dataKey="moodPct"
                          stroke="#fb7185"
                          strokeWidth={2}
                          connectNulls
                          fill="url(#recap-m-fill)"
                          isAnimationActive={!reduceMotion}
                        />
                      </AreaChart>
                    </ChartContainer>

                    <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                      <div className="flex items-center justify-between text-[10px] text-white/60">
                        <span>Профиль бодрости по дням</span>
                        <span className="font-mono text-white/80">нажмите на столбец</span>
                      </div>
                      <DotPlot
                        data={last7.map((n) => n.quality)}
                        labels={last7.map((n) => n.dayShort)}
                        max={100}
                        rows={5}
                        color="#fb7185"
                        emphasis={0.75}
                        valueFormatter={(v) => `${v}%`}
                        className="h-12 pt-1 [--dot-gap:0.22rem] [--dot-size:0.46rem]"
                      />
                    </div>
                  </Card>
                </div>

                {/* Weekly Focus Goal Selector */}
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="space-y-1.5 rounded-2xl border border-white/12 bg-[#120610]/70 p-2.5"
                >
                  <div className="flex items-center justify-between px-1 text-[10px]">
                    <span className="font-semibold tracking-wider text-white/70 uppercase">
                      Фокус на новую неделю
                    </span>
                    {weeklyGoal ? (
                      <span className="font-mono text-[#e8ff1f]">выбрано</span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    {goalOptions.map((opt) => {
                      const active = weeklyGoal?.id === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setWeeklyGoal(active ? null : { id: opt.id, text: opt.text })
                          }
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[11px] transition-[background-color,border-color] duration-[var(--duration-quick)] motion-reduce:transition-none",
                            active
                              ? "border-[#e8ff1f]/40 bg-[#e8ff1f]/[0.14] text-white"
                              : "border-white/[0.08] bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                          )}
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-medium">{opt.text}</span>
                            <span className="ml-1.5 text-[10px] text-white/50">
                              · {opt.why}
                            </span>
                          </div>
                          {active ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[#e8ff1f]" />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  className="pt-0.5"
                >
                  <Button
                    variant="glass"
                    onClick={(e) => {
                      e.stopPropagation()
                      restoreWidget("w-bio-stream")
                      restoreWidget("w-phases")
                      setWeeklyRecapOpen(false)
                    }}
                    className="w-full justify-center rounded-full border-white/20 bg-white/[0.12] py-2.5 text-xs text-[#e8ff1f] hover:bg-white/[0.2]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Закрепить графики на главной</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Stories Hint */}
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 text-center">
          <span className="text-[11px] font-medium text-white/75">
            <TextStatesSwap
              value={
                paused
                  ? "На паузе · отпустите, чтобы продолжить"
                  : "Нажмите, чтобы продолжить · удерживайте для паузы"
              }
            />
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WeeklyRecapModal
