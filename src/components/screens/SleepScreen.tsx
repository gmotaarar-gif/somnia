import * as React from "react"
import { AnimatePresence, m, useReducedMotion } from "framer-motion"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Clock,
  Coffee,
  Lightbulb,
  Plus,
  Sparkles,
  Thermometer,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import SpotlightCard from "@/components/SpotlightCard"
import { Sparkline } from "@/components/ballmac/sparkline"
import { CardSplitAccordion, type CardSplitItem } from "@/components/watermelon/card-split-accordion"
import { AnimatedMoonStar } from "@/components/animate-ui/icons/somna-animated-icons"
import { Moon as KeylineMoon } from "@/components/icons/duotone/moon"
import { Sun as KeylineSun } from "@/components/icons/duotone/sun"
import { Wind as KeylineWind } from "@/components/icons/wind"
import { AlarmClockCheck } from "@/components/icons/alarm-clock-check"
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
import { DotMatrix } from "@/components/ui/dot-matrix"
import { BedtimeCircularSlider } from "@/components/ui/bedtime-circular-slider"
import { SLSleepHeatmapCard } from "@/components/ui/sl-data-display"
import {
  SLReminderWeekdays,
  SLRitualChecklist,
  SLSoundVolumeSlider,
  type SLChecklistItem,
} from "@/components/ui/sl-product-controls"
import {
  MatrixLoader,
  SlidingTabs,
  SubtleNumber,
  TextSwapSoft,
} from "@/components/ui/t-motion"
import { Button } from "@/components/ui/button"
import type { SoundMode } from "@/lib/audioEngine"
import {
  SOMNA_SPRINGS,
  SOMNA_TRANSITIONS,
  haptic,
  useNow,
} from "@/lib/motion"
import {
  CBTI_TIPS,
  computeBedtimeCountdown,
  formatDurRu,
  selectDailySleepTip,
} from "@/lib/sleepInsights"
import {
  getBedtimeDeviationMin,
  getTargetDurationMin,
  timeToMinutes,
} from "@/lib/sleepTime"
import { useSomna, useStressTimer } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

/** Maps HH:MM onto a continuous signed nocturnal axis starting at 20:00 */
function nightOffsetMin(hhmm: string): number {
  const m = timeToMinutes(hhmm)
  return m >= 1080 ? m - 1200 : m + 240
}

type SleepRange = "7" | "14"
type SleepChartTab = "hours" | "trend" | "corridor"

const RANGE_TABS: { id: SleepRange; label: string }[] = [
  { id: "7", label: "7Д" },
  { id: "14", label: "14Д" },
]

const CHART_TABS: { id: SleepChartTab; label: string }[] = [
  { id: "hours", label: "Часы" },
  { id: "trend", label: "Бодрость" },
  { id: "corridor", label: "Окно сна" },
]

const NIGHT_SOUNDS: { id: SoundMode; label: string }[] = [
  { id: "pink", label: "Розовый" },
  { id: "rain", label: "Дождь" },
  { id: "drone", label: "432 Гц" },
]

const EVENING_RITUAL_ITEMS: SLChecklistItem[] = [
  { id: "dim-lights", label: "Приглушить свет за 45 минут" },
  { id: "no-screens", label: "Отложить смартфон и экраны" },
  { id: "cool-room", label: "Проветрить спальню (18–20 °C)" },
  { id: "breath-478", label: "Сделать 2 мин дыхания 4-7-8" },
]

const SLEEP_TREND_CONFIG = {
  quality: { label: "Бодрость (%)", color: "#e8ff1f" },
  goalPct: { label: "План сна (%)", color: "#818cf8" },
} satisfies ChartConfig

function NightSoundCard({
  sleepModeActive,
  setSleepModeActive,
  bedtimeGoal,
  wakeGoal,
  soundVolume,
  setSoundVolumePct,
}: {
  sleepModeActive: boolean
  setSleepModeActive: (v: boolean) => void
  bedtimeGoal: string
  wakeGoal: string
  soundVolume: number
  setSoundVolumePct: (pct: number) => void
}) {
  const { stressTimer, setStressTimer } = useStressTimer()
  const activeNightSound: SoundMode =
    stressTimer.sound === "off" ? "pink" : stressTimer.sound

  return (
    <Card className="relative z-10 space-y-3 border-white/[0.11] bg-[#080910]/78 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
              sleepModeActive
                ? "border-[#e8ff1f]/35 bg-[#e8ff1f]/[0.16] text-[#f2ff78]"
                : "border-white/12 bg-white/[0.08] text-indigo-100"
            )}
          >
            {sleepModeActive ? (
              <MatrixLoader
                variant="pulse"
                rounded
                label="Ночной режим активен"
                className="[--matrix-active:#e8ff1f] [--matrix-base:rgba(255,255,255,0.28)]"
              />
            ) : (
              <AnimatedMoonStar size={20} trigger={sleepModeActive} />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {sleepModeActive ? "Ночной шум включён" : "Звук для засыпания"}
            </div>
            <div className="text-[11px] text-white/60">
              {sleepModeActive
                ? `${NIGHT_SOUNDS.find((s) => s.id === activeNightSound)?.label ?? "Розовый"} · Подъём ${wakeGoal}`
                : `План сна: ${bedtimeGoal} – ${wakeGoal}`}
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant={sleepModeActive ? "soft" : "default"}
          onClick={() => {
            haptic(8)
            setSleepModeActive(!sleepModeActive)
          }}
          className="rounded-full"
        >
          {sleepModeActive ? "Стоп" : "Спать"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] text-white/50">Фон ночи</span>
        <SlidingTabs
          items={NIGHT_SOUNDS}
          value={activeNightSound}
          onValueChange={(id) =>
            setStressTimer((prev) => ({ ...prev, sound: id }))
          }
          ariaLabel="Выбор ночного фона"
          size="xs"
        />
      </div>

      <SLSoundVolumeSlider
        value={soundVolume}
        onChange={setSoundVolumePct}
        ariaLabel="Громкость ночного фона"
        tone="indigo"
      />
    </Card>
  )
}

export function SleepScreen() {
  const {
    sleepHistory,
    bedtimeGoal,
    wakeGoal,
    setSleepSchedule,
    reminderDays,
    setReminderDays,
    ritualDoneIds,
    setRitualDoneIds,
    soundVolume,
    setSoundVolumePct,
    sleepModeActive,
    setSleepModeActive,
    setSleepLogOpen,
  } = useSomna()

  const reduceMotion = useReducedMotion()
  const now = useNow(30_000)
  const [range, setRange] = React.useState<SleepRange>("7")
  const [chartTab, setChartTab] = React.useState<SleepChartTab>("hours")
  const [activeRingIdx, setActiveRingIdx] = React.useState<number | null>(null)

  const windowNights = React.useMemo(() => {
    const count = range === "14" ? 14 : 7
    return sleepHistory.slice(-count)
  }, [range, sleepHistory])

  const [selectedNightId, setSelectedNightId] = React.useState<string>(
    windowNights[windowNights.length - 1]?.id ?? ""
  )

  React.useEffect(() => {
    const newest = sleepHistory[sleepHistory.length - 1]
    if (newest) setSelectedNightId(newest.id)
  }, [sleepHistory.length, sleepHistory])

  const inspected =
    windowNights.find((n) => n.id === selectedNightId) ??
    windowNights[windowNights.length - 1]

  const targetDurMin = getTargetDurationMin(bedtimeGoal, wakeGoal)
  const recommendedTip = selectDailySleepTip(inspected, bedtimeGoal, targetDurMin)
  const cbtiAccordionItems: CardSplitItem[] = React.useMemo(() => {
    const iconForTip = (id: string) => {
      switch (id) {
        case "wake":
          return <AlarmClockCheck size={14} />
        case "20min":
          return <KeylineMoon size={14} />
        case "bed":
          return <KeylineWind size={14} />
        case "light":
          return <KeylineSun size={14} />
        case "coffee":
          return <Coffee className="h-3.5 w-3.5" />
        default:
          return <Thermometer className="h-3.5 w-3.5" />
      }
    }
    return CBTI_TIPS.map((tip) => ({
      id: tip.id,
      title: tip.title,
      tag: tip.tag,
      badge: tip.id === recommendedTip.id ? "На сегодня" : undefined,
      icon: iconForTip(tip.id),
      content: tip.body,
    }))
  }, [recommendedTip.id])

  if (!inspected) {
    return null
  }

  const hrs = Math.floor(inspected.durationMin / 60)
  const mins = String(inspected.durationMin % 60).padStart(2, "0")

  const targetHrs = +(targetDurMin / 60).toFixed(1)
  const count = Math.max(1, windowNights.length)
  const avgMins = Math.round(
    windowNights.reduce((acc, n) => acc + n.durationMin, 0) / count
  )
  const avgQuality = Math.round(
    windowNights.reduce((acc, n) => acc + n.quality, 0) / count
  )
  const avgAbsDev = Math.round(
    windowNights.reduce(
      (acc, n) => acc + Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal)),
      0
    ) / count
  )
  const calmNightsPct = Math.round(
    (windowNights.filter((n) => n.awakenings <= 1).length / count) * 100
  )
  const durGoalPct = Math.min(
    100,
    Math.round((avgMins / Math.max(1, targetDurMin)) * 100)
  )
  const schedulePrecisionPct = Math.max(
    0,
    Math.min(100, Math.round(100 - avgAbsDev * 1.4))
  )
  const sleepDebtMin = Math.round(
    windowNights.reduce(
      (acc, n) => acc + Math.max(0, targetDurMin - n.durationMin),
      0
    )
  )

  const countdown = computeBedtimeCountdown(bedtimeGoal, wakeGoal, now)

  const bedDev = getBedtimeDeviationMin(inspected.bedtime, bedtimeGoal)
  const inspectedPrecisionPct = Math.max(
    6,
    Math.min(100, Math.round(100 - Math.abs(bedDev) * 1.4))
  )

  const dialColor =
    inspected.quality >= 80
      ? "#e8ff1f"
      : inspected.quality >= 65
        ? "#818cf8"
        : "#fb7185"

  const heroAuraColor =
    inspected.quality >= 80
      ? "rgba(52, 211, 153, 0.25)"
      : inspected.quality >= 65
        ? "rgba(129, 140, 248, 0.26)"
        : "rgba(251, 113, 133, 0.25)"

  const barRows = windowNights.map((n) => ({
    id: n.id,
    label: range === "14" ? n.date.replace(/^[А-Яа-я]+,\s*/, "") : n.dayShort,
    date: n.date,
    hours: +(n.durationMin / 60).toFixed(2),
    bedtime: n.bedtime,
    wakeTime: n.wakeTime,
    quality: n.quality,
  }))

  const trendRows = windowNights.map((n) => ({
    label: range === "14" ? n.date.replace(/^[А-Яа-я]+,\s*/, "") : n.dayShort,
    quality: n.quality,
    goalPct: Math.min(
      120,
      Math.round((n.durationMin / Math.max(1, targetDurMin)) * 100)
    ),
  }))

  const ringsData: ActivityRing[] = [
    { label: "Длительность", value: durGoalPct, max: 100, color: "#e8ff1f" },
    { label: "Точность отбоя", value: schedulePrecisionPct, max: 100, color: "#34d399" },
    { label: "Спокойные ночи", value: calmNightsPct, max: 100, color: "#38bdf8" },
  ]
  const focusedRing =
    activeRingIdx !== null && ringsData[activeRingIdx]
      ? ringsData[activeRingIdx]
      : { label: "Сред. бодрость", value: avgQuality, max: 100, color: "#e8ff1f" }

  // Corridor timeline math (last 7 nights for crisp readability)
  const corridorNights = windowNights.slice(-7)
  const AXIS_SPAN = 840
  const padL = 26
  const padR = 10
  const W = 312
  const trackW = W - padL - padR
  const toX = (offset: number) =>
    padL + Math.max(0, Math.min(1, offset / AXIS_SPAN)) * trackW
  const goalStart = toX(nightOffsetMin(bedtimeGoal))
  const goalEnd = toX(Math.min(AXIS_SPAN, nightOffsetMin(bedtimeGoal) + targetDurMin))

  return (
    <div className="relative space-y-3.5 px-4 pt-2.5 pb-34 select-none">
      {/* Atmospheric Radial Canopy Glow */}
      <div
        aria-hidden
        className="somna-aura-drift pointer-events-none absolute inset-x-0 top-0 h-[370px] transition-opacity duration-[var(--duration-medium)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none"
        style={{
          backgroundImage: `radial-gradient(88% 58% at 50% 18%, ${heroAuraColor}, rgba(5, 5, 8, 0) 76%)`,
        }}
      />

      {/* Symmetrical Header */}
      <header className="relative z-10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-medium text-white/52 tabular-nums">
            В среднем {Math.floor(avgMins / 60)}ч {String(avgMins % 60).padStart(2, "0")}м за{" "}
            {windowNights.length} н.
          </p>
          <h1 className="text-[21px] font-semibold tracking-tight text-white">
            Статистика сна
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <SlidingTabs
            items={RANGE_TABS}
            value={range}
            onValueChange={setRange}
            ariaLabel="Период статистики сна"
            size="xs"
          />
          <Button
            size="sm"
            variant="glass"
            onClick={() => {
              haptic(6)
              setSleepLogOpen(true)
            }}
            className="h-8 rounded-full px-3"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Записать</span>
          </Button>
        </div>
      </header>

      {/* Hero Dial & Live Countdown Card (@react-bits SpotlightCard, Concentric 28px = 14px + 14px pad) */}
      <SpotlightCard
        spotlightColor={dialColor}
        intensity={0.14}
        borderGlow={0.52}
        spotlightSize={260}
        className="relative z-10 space-y-3.5 rounded-[28px] p-3.5"
      >
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-medium text-white/75">
            <TextSwapSoft value={inspected.date} />
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300/20 bg-indigo-500/[0.12] px-2 py-0.5 font-mono text-[10px] text-indigo-200">
              <Clock className="h-2.5 w-2.5" />
              <span>
                {countdown.isPastBedtime
                  ? "пора спать"
                  : `−${countdown.formattedLeft}`}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/85">
              <Sparkles className="h-2.5 w-2.5 text-[#e8ff1f]" />
              <span>{targetHrs}ч</span>
            </span>
          </div>
        </div>

        {/* One-tap Night Selector Strip with spring layoutId pill */}
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5">
          {windowNights.map((n) => {
            const isSel = n.id === inspected.id
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  haptic(5)
                  setSelectedNightId(n.id)
                }}
                className={cn(
                  "relative shrink-0 cursor-pointer rounded-full px-2.5 py-1 font-mono text-[10.5px] transition-[color,transform] duration-[var(--duration-quick)] active:scale-[0.97] motion-reduce:transition-none",
                  isSel ? "font-semibold text-[#f3ff88]" : "text-white/60 hover:text-white/90"
                )}
              >
                {isSel ? (
                  <m.span
                    layoutId="sleep-night-pill"
                    transition={reduceMotion ? { duration: 0 } : SOMNA_SPRINGS.snappy}
                    className="absolute inset-0 rounded-full border border-[#e8ff1f]/42 bg-[#e8ff1f]/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  />
                ) : (
                  <span className="absolute inset-0 rounded-full border border-white/[0.08] bg-white/[0.04]" />
                )}
                <span className="relative z-10">
                  {range === "14"
                    ? n.date.replace(/^[А-Яа-я]+,\s*/, "").replace(/\sноя/, "")
                    : n.dayShort}
                </span>
              </button>
            )
          })}
        </div>

        {/* Centered @dashboardcn RadialGauge Hero */}
        <div className="flex flex-col items-center pt-1">
          <RadialGauge
            value={inspected.quality}
            max={100}
            size={218}
            thickness={10}
            segments={42}
            gap={2.2}
            sweep={224}
            color={dialColor}
            trackColor="rgba(255,255,255,0.12)"
            glow
            animate={!reduceMotion}
          >
            <div className="flex flex-col items-center justify-center pt-3">
              <DotMatrix value={`${hrs}:${mins}`} size="md" glow />
              <span className="mt-1.5 font-mono text-[12px] font-medium text-white/78 tabular-nums">
                <SubtleNumber value={inspected.quality} suffix="% бодрость" />
              </span>
            </div>
          </RadialGauge>
        </div>

        {/* Concentric Smoked-Glass Metric Tiles (14px + 14px padding = 28px card radius) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[14px] border border-white/[0.09] bg-white/[0.045] px-2 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="text-[10px] text-white/48">Отбой</div>
            <div className="mt-0.5 font-mono text-[13px] font-semibold text-white tabular-nums">
              <TextSwapSoft value={inspected.bedtime} />
            </div>
          </div>
          <div className="rounded-[14px] border border-white/[0.09] bg-white/[0.045] px-2 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="text-[10px] text-white/48">Подъём</div>
            <div className="mt-0.5 font-mono text-[13px] font-semibold text-white tabular-nums">
              <TextSwapSoft value={inspected.wakeTime} />
            </div>
          </div>
          <div className="rounded-[14px] border border-white/[0.09] bg-white/[0.045] px-2 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="text-[10px] text-white/48">Пробуждения</div>
            <div className="mt-0.5 font-mono text-[13px] font-semibold text-white tabular-nums">
              <TextSwapSoft value={`${inspected.awakenings} раз`} />
            </div>
          </div>
        </div>

        {/* @dashboardcn TickBar Precision Register */}
        <div className="space-y-1.5 rounded-[14px] border border-white/[0.08] bg-black/32 px-3 py-2.5">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-white/58">Точность отбоя к {bedtimeGoal}</span>
            <span className="font-mono font-semibold" style={{ color: dialColor }}>
              {bedDev === 0
                ? "Ровно в цель"
                : bedDev > 0
                  ? `+${bedDev} мин`
                  : `${bedDev} мин`}
            </span>
          </div>
          <TickBar
            value={inspectedPrecisionPct}
            max={100}
            segments={36}
            shape="tick"
            color={dialColor}
            className="h-4 gap-[3px]"
          />
          <div className="flex justify-between font-mono text-[8.5px] text-white/40">
            <span>−60м</span>
            <span>План {bedtimeGoal}</span>
            <span>+60м</span>
          </div>
        </div>

        {inspected.note ? (
          <p className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] text-white/75">
            {inspected.note}
          </p>
        ) : null}
      </SpotlightCard>

      {/* Interactive Charts Card with Cross-Blur Mode Transitions */}
      <Card className="relative z-10 space-y-3 border-white/[0.11] bg-[#080910]/78 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Динамика ночей</h2>
            <p className="text-[10.5px] text-white/50">
              Нажмите на столбец или строку для выбора ночи
            </p>
          </div>
          <SlidingTabs
            items={CHART_TABS}
            value={chartTab}
            onValueChange={setChartTab}
            ariaLabel="Вид графика сна"
            size="xs"
          />
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={chartTab}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, filter: "blur(2px)" }}
            transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.modalOpen}
          >
              {chartTab === "hours" && (
                <BarChart
                  data={barRows}
                  xKey="label"
                  yKey="hours"
                  color="#e8ff1f"
                  mutedColor="#818cf8"
                  variant="gradient"
                  barRadius={range === "14" ? 5 : 8}
                  animate={!reduceMotion}
                  className="aspect-auto h-48 w-full"
                  highlight={(row) => String(row.id) === inspected.id}
                  referenceLines={[
                    {
                      y: targetHrs,
                      label: `Цель ${targetHrs}ч`,
                      color: "rgba(232,255,31,0.68)",
                    },
                  ]}
                  yFormatter={(v) => `${v.toFixed(1)} ч`}
                  tooltipLabel={(row) =>
                    `${String(row.date)} · ${String(row.bedtime)}–${String(row.wakeTime)}`
                  }
                  onBarClick={(row) => {
                    if (typeof row.id === "string") {
                      haptic(5)
                      setSelectedNightId(row.id)
                    }
                  }}
                />
              )}

              {chartTab === "trend" && (
                <ChartContainer
                  config={SLEEP_TREND_CONFIG}
                  className="aspect-auto h-48 w-full"
                >
                  <AreaChart
                    data={trendRows}
                    margin={{ top: 10, right: 8, left: 6, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="slp-q-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e8ff1f" stopOpacity={0.36} />
                        <stop offset="95%" stopColor="#e8ff1f" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="slp-g-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="4 4" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis hide domain={[40, 115]} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Area
                      type="monotone"
                      dataKey="quality"
                      stroke="#e8ff1f"
                      strokeWidth={2.2}
                      fill="url(#slp-q-grad)"
                      isAnimationActive={!reduceMotion}
                    />
                    <Area
                      type="monotone"
                      dataKey="goalPct"
                      stroke="#818cf8"
                      strokeWidth={1.8}
                      fill="url(#slp-g-grad)"
                      isAnimationActive={!reduceMotion}
                    />
                  </AreaChart>
                </ChartContainer>
              )}

              {chartTab === "corridor" && (
                <svg viewBox={`0 0 ${W} 166`} className="mt-1 w-full overflow-visible">
                  <defs>
                    <linearGradient id="slp-bar-sel" x1="0" x2="1">
                      <stop offset="0%" stopColor="#d9f926" />
                      <stop offset="100%" stopColor="#f3ff88" />
                    </linearGradient>
                    <linearGradient id="slp-bar-idle" x1="0" x2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.72" />
                      <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.88" />
                    </linearGradient>
                  </defs>

                  <rect
                    x={goalStart}
                    y={14}
                    width={Math.max(12, goalEnd - goalStart)}
                    height={128}
                    rx={8}
                    fill="rgba(232, 255, 31, 0.055)"
                    stroke="rgba(232, 255, 31, 0.24)"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={goalStart}
                    y={9}
                    textAnchor="start"
                    className="fill-[#e8ff1f]/75 font-mono text-[8px] font-medium"
                  >
                    {bedtimeGoal}
                  </text>
                  {goalEnd - goalStart >= 90 ? (
                    <text
                      x={(goalStart + goalEnd) / 2}
                      y={9}
                      textAnchor="middle"
                      className="fill-[#e8ff1f]/65 font-mono text-[8px]"
                    >
                      коридор
                    </text>
                  ) : null}
                  <text
                    x={goalEnd}
                    y={9}
                    textAnchor="end"
                    className="fill-[#e8ff1f]/75 font-mono text-[8px] font-medium"
                  >
                    {wakeGoal}
                  </text>

                  {[
                    { label: "22:00", off: 120 },
                    { label: "00:00", off: 240 },
                    { label: "04:00", off: 480 },
                    { label: "08:00", off: 720 },
                  ].map((tick) => {
                    const tx = toX(tick.off)
                    return (
                      <g key={tick.label}>
                        <line
                          x1={tx}
                          y1={14}
                          x2={tx}
                          y2={142}
                          stroke="rgba(255,255,255,0.08)"
                        />
                        <text
                          x={tx}
                          y={156}
                          textAnchor="middle"
                          className="fill-white/45 font-mono text-[8.5px]"
                        >
                          {tick.label}
                        </text>
                      </g>
                    )
                  })}

                  {corridorNights.map((n, idx) => {
                    const y = 22 + idx * 17
                    const startOff = nightOffsetMin(n.bedtime)
                    const x1 = toX(startOff)
                    const x2 = toX(Math.min(AXIS_SPAN, startOff + n.durationMin))
                    const isSel = n.id === inspected.id
                    return (
                      <g
                        key={n.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${n.date}: ${n.bedtime} – ${n.wakeTime}`}
                        onClick={() => {
                          haptic(5)
                          setSelectedNightId(n.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setSelectedNightId(n.id)
                          }
                        }}
                        className="group cursor-pointer outline-none"
                      >
                        <text
                          x={0}
                          y={y + 8.5}
                          className={cn(
                            "font-mono text-[9.5px] transition-colors duration-[var(--duration-quick)] motion-reduce:transition-none",
                            isSel
                              ? "fill-[#e8ff1f] font-bold"
                              : "fill-white/50 group-hover:fill-white/80"
                          )}
                        >
                          {n.dayShort}
                        </text>
                        <rect
                          x={padL}
                          y={y}
                          width={trackW}
                          height={11}
                          rx={5.5}
                          fill="rgba(255,255,255,0.04)"
                        />
                        <rect
                          x={x1}
                          y={y}
                          width={Math.max(12, x2 - x1)}
                          height={11}
                          rx={5.5}
                          fill={isSel ? "url(#slp-bar-sel)" : "url(#slp-bar-idle)"}
                          className="transition-opacity duration-[var(--duration-quick)] group-hover:opacity-95 motion-reduce:transition-none"
                        />
                      </g>
                    )
                  })}
                </svg>
              )}
            </m.div>
          </AnimatePresence>
      </Card>

      {/* Rhythm Consistency Register (ActivityRings + DotPlot) */}
      <Card className="relative z-10 border-white/[0.11] bg-[#080910]/78 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">Индекс ритма сна</h2>
            <p className="text-[10.5px] text-white/50">
              Кольца целей и тренд бодрости
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Sparkline
              values={windowNights.map((n) => n.quality)}
              label={`Бодрость за ${windowNights.length} ночей`}
              height={24}
              className="w-16 text-[#e8ff1f]"
            />
            <span className="font-mono text-xs font-semibold text-[#e8ff1f]">
              ±{avgAbsDev}м
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ActivityRings
            rings={ringsData}
            size={114}
            thickness={9}
            gap={4}
            trackOpacity={0.2}
            activeIndex={activeRingIdx}
            onActiveIndexChange={(idx) => {
              haptic(5)
              setActiveRingIdx(idx)
            }}
          >
            <div className="px-2 text-center">
              <div className="font-mono text-lg leading-none font-semibold text-white tabular-nums">
                {focusedRing.value}%
              </div>
              <div className="mt-0.5 text-[8.5px] text-white/55">
                {focusedRing.label}
              </div>
            </div>
          </ActivityRings>

          <div className="min-w-0 flex-1 space-y-2.5">
            <DotPlot
              data={windowNights.map((n) => n.quality)}
              labels={windowNights.map((n) => n.dayShort)}
              max={100}
              rows={6}
              color="#34d399"
              emphasis={0.8}
              activeIndex={windowNights.findIndex((n) => n.id === inspected.id)}
              onColumnClick={(idx) => {
                const target = windowNights[idx]
                if (target) {
                  haptic(5)
                  setSelectedNightId(target.id)
                }
              }}
              valueFormatter={(v) => `${v}%`}
              className="h-14 justify-between pt-1 [--dot-gap:0.2rem] [--dot-size:0.46rem]"
            />

            <div className="flex flex-wrap gap-1.5">
              {ringsData.map((r, i) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => {
                    haptic(5)
                    setActiveRingIdx(activeRingIdx === i ? null : i)
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9.5px] text-white/75 transition-[background-color,transform] duration-[var(--duration-quick)] hover:bg-white/[0.09] active:scale-[0.97] motion-reduce:transition-none"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  <span>{r.label}</span>
                  <span className="font-mono text-white">{r.value}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Authentic SL UI Library `product-checklist`: Interactive Evening CBT-I Ritual */}
      <div className="relative z-10">
        <div className="mb-2 flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-semibold text-white">Вечерний ритуал</h2>
            <p className="text-[10.5px] text-white/50">
              Чеклист подготовки ко сну, сохраняется локально
            </p>
          </div>
          {sleepDebtMin > 30 ? (
            <span className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-0.5 font-mono text-[10px] text-white/72">
              долг {formatDurRu(sleepDebtMin)}
            </span>
          ) : null}
        </div>
        <SLRitualChecklist
          items={EVENING_RITUAL_ITEMS}
          checkedIds={ritualDoneIds}
          onChange={setRitualDoneIds}
          emptyLabel="Начните подготовку ко сну"
          doneLabel="Все 4 шага выполнены"
          tone="lime"
        />
      </div>

      {/* Evening Wind-Down Sound Mode Card + Authentic SL UI Library `product-volume` */}
      <NightSoundCard
        sleepModeActive={sleepModeActive}
        setSleepModeActive={setSleepModeActive}
        bedtimeGoal={bedtimeGoal}
        wakeGoal={wakeGoal}
        soundVolume={soundVolume}
        setSoundVolumePct={setSoundVolumePct}
      />

      {/* SL UI Library Interactive Sleep & Rhythm Heatmap */}
      <div className="relative z-10">
        <SLSleepHeatmapCard />
      </div>

      {/* Evidence-based CBT-I Sleep Protocols (@watermelon CardSplitAccordion) */}
      <section className="relative z-10 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full border border-[#e8ff1f]/28 bg-[#e8ff1f]/[0.12] text-[#e8ff1f]">
              <Lightbulb className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">Протоколы сна CBT-I</h2>
              <p className="text-[10.5px] text-white/50">
                Нажмите на карточку, чтобы раскрыть рекомендацию
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-white/45">
            {CBTI_TIPS.length} правил
          </span>
        </div>

        <CardSplitAccordion
          items={cbtiAccordionItems}
          defaultOpenId={recommendedTip.id}
        />
      </section>

      {/* Interactive Circular Schedule & Authentic SL UI Library `product-weekdays` */}
      <Card className="relative z-10 space-y-3 border-white/[0.11] bg-[#080910]/78 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-400/25 bg-indigo-500/15 text-indigo-200">
            <AlarmClockCheck size={16} />
          </span>
          <div>
            <div className="text-sm font-semibold text-white">
              Целевое расписание сна
            </div>
            <div className="text-[11px] text-white/50">
              Перетащите бегунки отбоя и подъёма и выберите дни напоминаний
            </div>
          </div>
        </div>
        <BedtimeCircularSlider
          bedtime={bedtimeGoal}
          wakeTime={wakeGoal}
          onChange={setSleepSchedule}
          size={204}
        />
        <div className="border-t border-white/10 pt-3">
          <SLReminderWeekdays
            days={reminderDays}
            onChange={setReminderDays}
            ariaLabel="Дни расписания напоминаний"
            tone="mint"
          />
        </div>
      </Card>
    </div>
  )
}

export default SleepScreen
