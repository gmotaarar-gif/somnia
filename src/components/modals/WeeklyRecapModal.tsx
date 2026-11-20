import * as React from "react"
import { AnimatePresence, m, useReducedMotion } from "framer-motion"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import ShinyText from "@/components/ShinyText"
import { AnimatedSparkles } from "@/components/animate-ui/icons/somna-animated-icons"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/drawer"
import { StateOfMindOrb } from "@/components/ui/state-of-mind-orb"
import { MilkySubCard } from "@/components/ui/glow-card"
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
import { DottedTrack } from "@/components/ui/dotted-track"
import {
  StaggerReveal,
  SubtleNumber,
  SuccessCheck,
  TextStatesSwap,
  TextSwapSoft,
} from "@/components/ui/t-motion"
import { Button } from "@/components/ui/button"
import { STEP_SLIDE_VARIANTS, haptic } from "@/lib/motion"
import {
  computeSleepInsights,
  computeWeeklyGoalOptions,
  formatDurRu,
  pluralRu,
} from "@/lib/sleepInsights"
import { getBedtimeDeviationMin, getTargetDurationMin } from "@/lib/sleepTime"
import { useSomna } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const STORY_COUNT = 5
const STORY_DURATION_MS = 8200

const SLIDE_MESHES = [
  // 0: Superpower Warm Gold -> Emerald Glow (Ref dc4d8d99.jpg)
  {
    base: "linear-gradient(168deg, #c7a982 0%, #63a14c 36%, #166134 74%, #082314 100%)",
    blobA:
      "radial-gradient(75% 58% at 50% 18%, rgba(255, 240, 200, 0.42) 0%, transparent 72%)",
    blobB:
      "radial-gradient(72% 66% at 86% 74%, rgba(232, 255, 31, 0.32) 0%, transparent 72%)",
    blobC:
      "radial-gradient(64% 58% at 50% 56%, rgba(4, 18, 11, 0.48) 0%, transparent 76%)",
  },
  // 1: Rose-Coral Luminous Mesh
  {
    base: "linear-gradient(155deg, #c83e2c 0%, #c9465a 46%, #450b24 100%)",
    blobA:
      "radial-gradient(76% 62% at 20% 24%, rgba(255, 198, 166, 0.56) 0%, transparent 72%)",
    blobB:
      "radial-gradient(68% 66% at 86% 30%, rgba(251, 113, 133, 0.52) 0%, transparent 72%)",
    blobC:
      "radial-gradient(70% 62% at 50% 82%, rgba(16, 4, 12, 0.62) 0%, transparent 74%)",
  },
  // 2: Nocturnal Cobalt-Indigo
  {
    base: "linear-gradient(162deg, #1b2478 0%, #0e1345 52%, #060718 100%)",
    blobA:
      "radial-gradient(78% 60% at 18% 18%, rgba(129, 140, 248, 0.52) 0%, transparent 72%)",
    blobB:
      "radial-gradient(70% 66% at 86% 80%, rgba(99, 102, 241, 0.4) 0%, transparent 72%)",
    blobC:
      "radial-gradient(62% 52% at 50% 52%, rgba(232, 255, 31, 0.14) 0%, transparent 76%)",
  },
  // 3: Veri Mint-Teal Obsidian (Ref 2e9ae1c8.jpg)
  {
    base: "linear-gradient(164deg, #2b6f63 0%, #0e3538 48%, #041016 100%)",
    blobA:
      "radial-gradient(76% 58% at 22% 18%, rgba(110, 231, 183, 0.46) 0%, transparent 74%)",
    blobB:
      "radial-gradient(68% 64% at 84% 78%, rgba(56, 189, 248, 0.32) 0%, transparent 72%)",
    blobC:
      "radial-gradient(60% 60% at 50% 48%, rgba(232, 255, 31, 0.15) 0%, transparent 74%)",
  },
  // 4: Velvet Crimson Stress-Sibling Finale
  {
    base: "linear-gradient(162deg, #68113c 0%, #340822 52%, #0d040b 100%)",
    blobA:
      "radial-gradient(76% 58% at 24% 18%, rgba(251, 113, 133, 0.46) 0%, transparent 72%)",
    blobB:
      "radial-gradient(68% 66% at 82% 82%, rgba(192, 132, 252, 0.34) 0%, transparent 72%)",
    blobC:
      "radial-gradient(62% 52% at 50% 56%, rgba(244, 63, 94, 0.24) 0%, transparent 76%)",
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
  const [slideDir, setSlideDir] = React.useState<1 | -1>(1)
  const [progress, setProgress] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const [selectedNightIdx, setSelectedNightIdx] = React.useState<number | null>(null)
  const [activeRingIdx, setActiveRingIdx] = React.useState<number | null>(null)
  const downInfoRef = React.useRef<{ x: number; t: number } | null>(null)
  const progressRef = React.useRef(0)

  React.useEffect(() => {
    if (weeklyRecapOpen) {
      progressRef.current = 0
      setSlide(0)
      setSlideDir(1)
      setProgress(0)
      setPaused(false)
      setSelectedNightIdx(null)
      setActiveRingIdx(null)
    }
  }, [weeklyRecapOpen])

  const goTo = React.useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(STORY_COUNT - 1, idx))
    progressRef.current = 0
    setSlideDir((prevDir) => {
      void prevDir
      return clamped >= slide ? 1 : -1
    })
    setSlide(clamped)
    setProgress(0)
  }, [slide])

  // Clean RAF auto-advance timer (zero cross-component setState inside state updater)
  React.useEffect(() => {
    if (!weeklyRecapOpen || paused) return
    let raf = 0
    let last = performance.now()
    let active = true

    const tick = (now: number) => {
      if (!active) return
      const dt = Math.min(100, Math.max(0, now - last))
      last = now
      const next = progressRef.current + dt / STORY_DURATION_MS
      if (next >= 1) {
        if (slide < STORY_COUNT - 1) {
          progressRef.current = 0
          setSlideDir(1)
          setSlide((s) => Math.min(STORY_COUNT - 1, s + 1))
          setProgress(0)
          return
        }
        progressRef.current = 1
        setProgress(1)
        setWeeklyRecapOpen(false)
        return
      }
      progressRef.current = next
      setProgress(next)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      active = false
      cancelAnimationFrame(raf)
    }
  }, [weeklyRecapOpen, paused, slide, setWeeklyRecapOpen])

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
  const durationGoalPct = Math.min(
    100,
    Math.round((avgDurMin / Math.max(1, targetMin)) * 100)
  )
  const bedtimePrecisionPct = Math.max(
    0,
    Math.min(100, Math.round(100 - avgAbsDev * 1.4))
  )
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

  // 29-col x 6-row micro-dot equalizer interpolated from last 7 nights
  const equalizerCols = React.useMemo(() => {
    const cols = 29
    const center = (cols - 1) / 2
    const src = last7.length > 0 ? last7 : [{ quality: avgQuality }]
    return Array.from({ length: cols }, (_, c) => {
      const distNorm = Math.abs(c - center) / center
      const srcFloat = (c / Math.max(1, cols - 1)) * Math.max(0, src.length - 1)
      const i0 = Math.floor(srcFloat)
      const i1 = Math.min(src.length - 1, i0 + 1)
      const frac = srcFloat - i0
      const q = src[i0].quality * (1 - frac) + src[i1].quality * frac
      const envelope = 1 - distNorm * 0.58
      const activeRows = Math.max(
        1,
        Math.min(6, Math.round((q / 100) * 5.8 * envelope))
      )
      return { c, activeRows, isCenterBand: distNorm < 0.34 }
    })
  }, [last7, avgQuality])

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

  const leadInsight = insightsReport.insights[0]
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
      if (slide > 0) {
        haptic(5)
        goTo(slide - 1)
      }
    } else if (slide < STORY_COUNT - 1) {
      haptic(5)
      goTo(slide + 1)
    } else {
      setWeeklyRecapOpen(false)
    }
  }

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

        {/* Full-bleed Atmospheric Mesh Backdrop (GPU opacity cross-fade) */}
        <AnimatePresence mode="sync">
          <m.div
            key={`bg-${slide}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
            }
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: mesh.base }}
          >
            <div className="absolute inset-0" style={{ background: mesh.blobA }} />
            <div className="absolute inset-0" style={{ background: mesh.blobB }} />
            <div className="absolute inset-0" style={{ background: mesh.blobC }} />
            <div className="oled-grain absolute inset-0 opacity-[0.045] mix-blend-overlay" />
            <div
              className="absolute inset-x-0 top-0 h-28"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.32) 0%, transparent 100%)",
              }}
            />
          </m.div>
        </AnimatePresence>

        {/* Top Stories Progress Segments + Header Controls */}
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
                    haptic(5)
                    goTo(i)
                  }}
                  aria-label={`Слайд ${i + 1}`}
                  className="h-[3px] flex-1 cursor-pointer overflow-hidden rounded-full bg-white/28"
                >
                  <div
                    className="h-full w-full origin-left rounded-full bg-white"
                    style={{ transform: `scaleX(${scaleRatio.toFixed(4)})` }}
                  />
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-black/28 px-3 py-1 text-[11px] font-medium tracking-tight text-white/92 backdrop-blur-md">
              <AnimatedSparkles
                size={12}
                trigger={slide + 1}
                className="text-[#e8ff1f]"
              />
              <span>{dateRangeShort}</span>
            </span>

            <div
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                disabled={slide === 0}
                onClick={() => {
                  haptic(5)
                  goTo(slide - 1)
                }}
                aria-label="Предыдущий слайд"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/18 bg-white/[0.1] text-white backdrop-blur-md transition-[background-color,opacity,transform] duration-[var(--duration-quick)] hover:bg-white/[0.2] active:scale-95 disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={slide === STORY_COUNT - 1}
                onClick={() => {
                  haptic(5)
                  goTo(slide + 1)
                }}
                aria-label="Следующий слайд"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/18 bg-white/[0.1] text-white backdrop-blur-md transition-[background-color,opacity,transform] duration-[var(--duration-quick)] hover:bg-white/[0.2] active:scale-95 disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeeklyRecapOpen(false)}
                aria-label="Закрыть итоги"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/22 bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] hover:bg-white/[0.24] active:scale-95 motion-reduce:transition-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Story Slide Stage */}
        <div className="relative z-10 flex flex-1 flex-col justify-center overflow-hidden px-5 pb-12">
          <AnimatePresence
            mode="wait"
            custom={{ dir: slideDir, reduced: !!reduceMotion }}
          >
            {/* SLIDE 0: Superpower Gold-Emerald Editorial Cover + Micro-Dot Equalizer + Milky Sub-Cards */}
            {slide === 0 && (
              <m.div
                key="story-0"
                custom={{ dir: slideDir, reduced: !!reduceMotion }}
                variants={STEP_SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-1 flex-col items-center justify-center text-center"
              >
                <div className="relative mb-3 flex items-center justify-center">
                  <span
                    aria-hidden
                    className="somna-pulse-ring pointer-events-none absolute h-48 w-48 rounded-full border border-white/18"
                  />
                  <RadialGauge
                    value={rhythmCompositePct}
                    max={100}
                    size={206}
                    thickness={8}
                    segments={40}
                    gap={2.2}
                    sweep={232}
                    color="#e8ff1f"
                    trackColor="rgba(255,255,255,0.2)"
                    glow
                    animate={!reduceMotion}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-1">
                    <StateOfMindOrb valence={avgValence} size={122} />
                  </div>
                </div>

                <StaggerReveal index={0}>
                  <ShinyText
                    text="Индекс недели"
                    color="rgba(255,255,255,0.82)"
                    shineColor="#e8ff1f"
                    speed={2.8}
                    delay={1.1}
                    direction="right"
                    disabled={!!reduceMotion}
                    className="text-xs font-medium"
                  />
                </StaggerReveal>

                <StaggerReveal index={1} className="mt-1 flex items-baseline justify-center gap-1.5">
                  <DotMatrix value={rhythmCompositePct} size="lg" countUp glow />
                  <span className="font-mono text-sm font-medium text-white/75">/100</span>
                </StaggerReveal>

                {/* 29-col x 6-row micro-dot equalizer (Superpower ref) */}
                <StaggerReveal index={2} className="mt-3 w-full max-w-[244px]">
                  <svg viewBox="0 0 203 28" className="h-6.5 w-full" aria-hidden="true">
                    {equalizerCols.map(({ c, activeRows, isCenterBand }) =>
                      Array.from({ length: 6 }, (_, r) => {
                        const rowFromBottom = 5 - r
                        const isActive = rowFromBottom < activeRows
                        if (!isActive && rowFromBottom >= 2) return null
                        return (
                          <circle
                            key={`${c}-${r}`}
                            cx={c * 7 + 3.5}
                            cy={r * 4.5 + 2.5}
                            r={1.35}
                            fill={
                              isActive && isCenterBand && rowFromBottom >= 4
                                ? "#e8ff1f"
                                : "#ffffff"
                            }
                            opacity={
                              isActive
                                ? isCenterBand && rowFromBottom >= 3
                                  ? 0.96
                                  : 0.72
                                : 0.22
                            }
                          />
                        )
                      })
                    )}
                  </svg>
                </StaggerReveal>

                {/* Dual Milky-Glass Stat Sub-Cards */}
                <StaggerReveal index={3} className="mt-3.5 grid w-full grid-cols-2 gap-2.5 text-left">
                  <MilkySubCard className="p-3">
                    <div className="text-[10.5px] font-medium text-white/80">
                      Средний сон
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <DotMatrix value={avgHrs} size="sm" />
                      <span className="text-[11px] text-white/80">ч</span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-white/72">
                      {last7.length} {pluralRu(last7.length, ["ночь", "ночи", "ночей"])} · {avgQuality}% бодр.
                    </div>
                  </MilkySubCard>

                  <MilkySubCard className="p-3">
                    <div className="text-[10.5px] font-medium text-white/80">
                      Ночей в норме
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <DotMatrix value={`${goalHits}/${last7.length}`} size="sm" />
                    </div>
                    <div className="mt-1.5">
                      <DottedTrack value={goalHitPct / 100} dots={12} color="#e8ff1f" />
                    </div>
                  </MilkySubCard>
                </StaggerReveal>
              </m.div>
            )}

            {/* SLIDE 1: Coral-Rose Emotional Landscape + Concentric Pulse Halo + BarList Factors */}
            {slide === 1 && (
              <m.div
                key="story-1"
                custom={{ dir: slideDir, reduced: !!reduceMotion }}
                variants={STEP_SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative flex flex-1 flex-col justify-center space-y-4"
              >
                {/* Decorative Concentric Pulse Target motif (Superpower Connect ref) */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-2 right-0 flex h-24 w-24 items-center justify-center opacity-85"
                >
                  <span className="somna-pulse-ring absolute h-24 w-24 rounded-full border border-white/25" />
                  <span className="absolute h-16 w-16 rounded-full border border-white/30 bg-white/[0.08]" />
                  <span className="absolute h-9 w-9 rounded-full bg-white/80" />
                  <span className="h-3.5 w-3.5 rounded-full bg-[#e8ff1f] shadow-[0_0_12px_#e8ff1f]" />
                </div>

                <div>
                  <StaggerReveal index={0}>
                    <span className="mb-2 block text-xs font-medium text-white/82">
                      Чаще всего за неделю
                    </span>
                  </StaggerReveal>

                  {rankedEmotions.length > 0 ? (
                    <div className="space-y-1 pr-20">
                      {rankedEmotions.map((item, idx) => {
                        const sizes = [
                          "text-[31px] font-bold opacity-100",
                          "text-[25px] font-bold opacity-88",
                          "text-[21px] font-semibold opacity-76",
                          "text-[17px] font-semibold opacity-64",
                          "text-[14.5px] font-medium opacity-52",
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
                              <span className="shrink-0 font-mono text-[12px] font-semibold text-[#e8ff1f]/90">
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
                    <Card className="border-white/16 bg-[#14070a]/66 p-3.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                      <div className="mb-2 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-white/80">
                          Факторы недели
                        </span>
                        <span className="font-mono text-white/55">ср. баланс</span>
                      </div>
                      <BarList
                        data={factorBarItems}
                        color="#fda4af"
                        valueFormatter={(v) => `${Math.round(v)}%`}
                      />
                    </Card>
                  </div>
                ) : null}
              </m.div>
            )}

            {/* SLIDE 2: Nocturnal Indigo BarChart + Sleep Debt + TickBar */}
            {slide === 2 && (
              <m.div
                key="story-2"
                custom={{ dir: slideDir, reduced: !!reduceMotion }}
                variants={STEP_SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-1 flex-col justify-center space-y-3"
              >
                <StaggerReveal index={0}>
                  <span className="text-xs font-medium text-indigo-200/85">
                    Сон за неделю
                  </span>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <DotMatrix value={avgHrs} size="md" glow />
                      <span className="text-sm font-medium text-white/75">ч в ср.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {insightsReport.sleepDebtMin > 60 ? (
                        <span className="rounded-full border border-rose-300/24 bg-rose-500/[0.16] px-2 py-0.5 font-mono text-[10px] text-rose-200">
                          Долг {formatDurRu(insightsReport.sleepDebtMin)}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/15 bg-white/[0.1] px-2.5 py-0.5 font-mono text-[10.5px] text-[#e8ff1f]">
                        Цель {targetHrs}ч
                      </span>
                    </div>
                  </div>
                </StaggerReveal>

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
                  <Card className="space-y-3 border-white/15 bg-[#070816]/76 p-3.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
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
                      onBarClick={(_, index) => {
                        haptic(5)
                        setSelectedNightIdx(index)
                      }}
                    />

                    <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-white/58">Выполнение плана сна</span>
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
                  <div className="flex items-center justify-between rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs backdrop-blur-md">
                    <span className="text-white/68">
                      {selectedNightIdx !== null ? "Выбрано: " : "Лучшая ночь: "}
                      <strong className="font-semibold text-white">
                        <TextSwapSoft value={inspectedNight.date} />
                      </strong>
                    </span>
                    <span className="font-mono text-[#e8ff1f] tabular-nums">
                      {(inspectedNight.durationMin / 60).toFixed(1)}ч ·{" "}
                      {inspectedNight.quality}% бодр.
                    </span>
                  </div>
                ) : null}
              </m.div>
            )}

            {/* SLIDE 3: Veri Mint-Teal ActivityRings + Real Lead Insight */}
            {slide === 3 && (
              <m.div
                key="story-3"
                custom={{ dir: slideDir, reduced: !!reduceMotion }}
                variants={STEP_SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-1 flex-col justify-center space-y-3"
              >
                <StaggerReveal index={0}>
                  <span className="text-xs font-medium text-emerald-200/85">
                    Ритм и стабильность
                  </span>
                  <h2 className="mt-1 text-[27px] leading-tight font-bold tracking-[-0.03em] text-white">
                    Отбой ±{avgAbsDev} мин
                  </h2>
                </StaggerReveal>

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
                  className="space-y-2.5"
                >
                  <Card className="flex flex-col items-center space-y-3.5 border-white/15 bg-[#051415]/74 p-3.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                    <ActivityRings
                      rings={ringsData}
                      size={146}
                      thickness={10}
                      gap={5}
                      trackOpacity={0.2}
                      activeIndex={activeRingIdx}
                      onActiveIndexChange={(idx) => {
                        haptic(5)
                        setActiveRingIdx(idx)
                      }}
                    >
                      <div className="px-4 text-center">
                        <div className="font-mono text-[24px] leading-none font-light text-white tabular-nums">
                          <SubtleNumber value={activeRingSummary.value} suffix="%" />
                        </div>
                        <div className="mt-1 text-[9.5px] font-medium text-white/68">
                          <TextStatesSwap value={activeRingSummary.label} />
                        </div>
                      </div>
                    </ActivityRings>

                    <div className="w-full space-y-1.5">
                      {ringsData.map((ring, idx) => {
                        const isFocused = activeRingIdx === idx
                        return (
                          <button
                            key={ring.label}
                            type="button"
                            onClick={() => {
                              haptic(5)
                              setActiveRingIdx(isFocused ? null : idx)
                            }}
                            className={cn(
                              "w-full cursor-pointer rounded-xl border px-3 py-1.5 text-left transition-[background-color,border-color,transform] duration-[var(--duration-quick)] active:scale-[0.985] motion-reduce:transition-none",
                              isFocused
                                ? "border-white/25 bg-white/[0.11]"
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

                  {leadInsight ? (
                    <div className="rounded-2xl border border-emerald-200/20 bg-black/38 px-3.5 py-2.5 text-[11px] leading-snug text-white/82 backdrop-blur-md">
                      <span className="font-semibold text-[#e8ff1f]">
                        {leadInsight.title}:{" "}
                      </span>
                      <span>{leadInsight.body}</span>
                    </div>
                  ) : null}
                </div>
              </m.div>
            )}

            {/* SLIDE 4: Velvet Crimson Trajectory + Concentric Weekly Focus Picker */}
            {slide === 4 && (
              <m.div
                key="story-4"
                custom={{ dir: slideDir, reduced: !!reduceMotion }}
                variants={STEP_SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-1 flex-col justify-center space-y-2.5"
              >
                <StaggerReveal index={0}>
                  <span className="text-xs font-medium text-rose-200/85">
                    Бодрость и фокус недели
                  </span>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <h2 className="text-[25px] leading-tight font-bold tracking-[-0.03em] text-white">
                      <TextSwapSoft value={`${avgQuality}% в среднем`} />
                    </h2>
                    <span className="rounded-full border border-white/15 bg-white/[0.1] px-2.5 py-0.5 font-mono text-[10px] text-rose-200">
                      {last7.length} дн.
                    </span>
                  </div>
                </StaggerReveal>

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
                  className="space-y-2.5"
                >
                  <Card className="space-y-2 border-white/15 bg-[#130611]/74 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                    <ChartContainer
                      config={AREA_CHART_CONFIG}
                      className="aspect-auto h-30 w-full"
                    >
                      <AreaChart
                        data={areaChartData}
                        margin={{ top: 6, right: 6, left: 6, bottom: 0 }}
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
                          tickMargin={6}
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

                    <div className="border-t border-white/10 pt-2">
                      <DotPlot
                        data={last7.map((n) => n.quality)}
                        labels={last7.map((n) => n.dayShort)}
                        max={100}
                        rows={4}
                        color="#fb7185"
                        emphasis={0.75}
                        valueFormatter={(v) => `${v}%`}
                        className="h-9 [--dot-gap:0.2rem] [--dot-size:0.42rem]"
                      />
                    </div>
                  </Card>

                  {/* Concentric Weekly Focus Selector (outer 22px = 10px padding + 12px inner) */}
                  <div className="space-y-1.5 rounded-[22px] border border-white/14 bg-[#120610]/74 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <div className="flex items-center justify-between px-1 text-[10.5px]">
                      <span className="font-medium text-white/78">
                        Фокус на новую неделю
                      </span>
                      {weeklyGoal ? (
                        <span className="font-mono text-[#e8ff1f]">активно</span>
                      ) : (
                        <span className="text-white/45">выберите 1 цель</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {goalOptions.map((opt) => {
                        const active = weeklyGoal?.id === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              haptic(8)
                              setWeeklyGoal(
                                active ? null : { id: opt.id, text: opt.text }
                              )
                            }}
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-[background-color,border-color,transform] duration-[var(--duration-quick)] active:scale-[0.985] motion-reduce:transition-none",
                              active
                                ? "border-[#e8ff1f]/45 bg-[#e8ff1f]/[0.15] text-white"
                                : "border-white/[0.08] bg-white/[0.045] text-white/85 hover:bg-white/[0.09]"
                            )}
                          >
                            <div className="min-w-0">
                              <div className="text-[11.5px] leading-tight font-semibold text-white">
                                {opt.text}
                              </div>
                              <div className="mt-0.5 text-[10px] leading-tight text-white/58">
                                {opt.why}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                                active
                                  ? "border-[#e8ff1f]/40 bg-[#e8ff1f]/20 text-[#e8ff1f]"
                                  : "border-white/12 bg-white/[0.05] text-transparent"
                              )}
                            >
                              {active ? (
                                <SuccessCheck show size={14} color="#e8ff1f" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Button
                    variant="glass"
                    onClick={() => {
                      haptic(8)
                      restoreWidget("w-bio-stream")
                      restoreWidget("w-phases")
                      setWeeklyRecapOpen(false)
                    }}
                    className="w-full justify-center rounded-full border-white/22 bg-white/[0.13] py-2.5 text-xs text-[#e8ff1f] hover:bg-white/[0.22]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Закрепить графики на главной</span>
                  </Button>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Stories Hint */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 text-center">
          <span className="text-[10.5px] font-medium text-white/70">
            <TextStatesSwap
              value={
                paused
                  ? "На паузе · отпустите, чтобы продолжить"
                  : `${slide + 1} / ${STORY_COUNT} · удерживайте для паузы`
              }
            />
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WeeklyRecapModal
