import * as React from "react"
import {
  Check,
  Heart,
  LayoutGrid,
  Moon,
  Plus,
  Sparkles,
  User,
} from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { GlowCard, MilkySubCard } from "@/components/ui/glow-card"
import { DotMatrix } from "@/components/ui/dot-matrix"
import { OrbLoader } from "@/components/ui/orb-loader"
import { StateOfMindOrb } from "@/components/ui/state-of-mind-orb"
import {
  IconSwap,
  SlidingTabs,
  TextStatesSwap,
  TextSwapSoft,
  TiltCard,
  type SlidingTabItem,
} from "@/components/ui/t-motion"
import { WordRoll } from "@/components/ui/word-roll"
import { useNow } from "@/lib/motion"
import {
  computeBedtimeCountdown,
  getTimeGreeting,
  pluralRu,
} from "@/lib/sleepInsights"
import { EditableBentoGrid } from "@/components/widgets/EditableBentoGrid"
import { getBedtimeDeviationMin, getTargetDurationMin } from "@/lib/sleepTime"
import {
  useSomna,
  type BentoPeriod,
} from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const PERIOD_ITEMS: SlidingTabItem<BentoPeriod>[] = [
  { id: "7D", label: "7Д" },
  { id: "30D", label: "30Д" },
  { id: "90D", label: "90Д" },
]

const SLIDE_TITLES = ["Индекс ритма", "Ночной цикл", "Состояние сейчас"] as const

export function HomeScreen() {
  const {
    userName,
    sleepHistory,
    moodHistory,
    bedtimeGoal,
    wakeGoal,
    bentoPeriod,
    setBentoPeriod,
    editWidgetsMode,
    setEditWidgetsMode,
    setWidgetGalleryOpen,
    setWeeklyRecapOpen,
    setMoodDrawerOpen,
    setProfileOpen,
    setActiveTab,
  } = useSomna()

  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>()
  const [slideIdx, setSlideIdx] = React.useState(0)
  const now = useNow(30_000)
  const countdown = React.useMemo(
    () => computeBedtimeCountdown(bedtimeGoal, wakeGoal, now),
    [bedtimeGoal, wakeGoal, now]
  )

  React.useEffect(() => {
    if (!carouselApi) return
    const onSelect = () => setSlideIdx(carouselApi.selectedScrollSnap())
    onSelect()
    carouselApi.on("select", onSelect)
    return () => {
      carouselApi.off("select", onSelect)
    }
  }, [carouselApi])

  const periodDays = bentoPeriod === "7D" ? 7 : bentoPeriod === "30D" ? 30 : 90
  const periodNights = React.useMemo(
    () => sleepHistory.slice(-periodDays),
    [sleepHistory, periodDays]
  )
  const last7 = React.useMemo(() => sleepHistory.slice(-7), [sleepHistory])

  const targetDur = getTargetDurationMin(bedtimeGoal, wakeGoal)
  const latestSleep = React.useMemo(
    () =>
      last7[last7.length - 1] ?? {
        id: "fallback",
        date: "Сегодня",
        dayShort: "Вс",
        bedtime: bedtimeGoal,
        wakeTime: wakeGoal,
        durationMin: targetDur,
        quality: 82,
        awakenings: 0,
      },
    [last7, bedtimeGoal, wakeGoal, targetDur]
  )
  const latestMood = moodHistory[moodHistory.length - 1]

  const sleepGoalPct = Math.min(100, Math.round((latestSleep.durationMin / targetDur) * 100))
  const moodPct = latestMood ? Math.round((latestMood.valence + 1) * 50) : 50

  // Honest day readiness derived directly from duration goal, morning quality and logged mood
  const dayIndex = Math.round(
    sleepGoalPct * 0.4 + latestSleep.quality * 0.35 + moodPct * 0.25
  )

  const avgHrs = (
    periodNights.reduce((s, n) => s + n.durationMin, 0) /
    Math.max(1, periodNights.length) /
    60
  ).toFixed(1)
  const avgQual = Math.round(
    periodNights.reduce((s, n) => s + n.quality, 0) / Math.max(1, periodNights.length)
  )

  const sleepHours = Math.floor(latestSleep.durationMin / 60)
  const sleepMins = String(latestSleep.durationMin % 60).padStart(2, "0")

  // 29-column x 6-row honest micro-dot equalizer interpolated symmetrically from last 7 nights
  const equalizerCols = React.useMemo(() => {
    const cols = 29
    const center = (cols - 1) / 2
    const src = last7.length > 0 ? last7 : [latestSleep]
    return Array.from({ length: cols }, (_, c) => {
      const distNorm = Math.abs(c - center) / center
      const srcFloat = (c / Math.max(1, cols - 1)) * Math.max(0, src.length - 1)
      const i0 = Math.floor(srcFloat)
      const i1 = Math.min(src.length - 1, i0 + 1)
      const frac = srcFloat - i0
      const q = src[i0].quality * (1 - frac) + src[i1].quality * frac
      // Center emphasis blended with real logged morning quality
      const envelope = 1 - distNorm * 0.62
      const activeRows = Math.max(
        1,
        Math.min(6, Math.round((q / 100) * 5.8 * envelope))
      )
      return { c, activeRows, isCenterBand: distNorm < 0.34 }
    })
  }, [last7, latestSleep])

  // Honest orbital node positions analytically locked onto each dashed elliptical arc
  const orbitalNodes = React.useMemo(() => {
    const devClamp = Math.max(
      -45,
      Math.min(45, getBedtimeDeviationMin(latestSleep.bedtime, bedtimeGoal))
    )
    const arcY = (x: number, cx: number, cy: number, rx: number, ry: number) =>
      +(cy - ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2))).toFixed(1)

    const bedX = +(46 + (devClamp / 45) * 16).toFixed(1)
    const midX = +(
      140 +
      Math.max(-22, Math.min(22, ((sleepGoalPct - 85) / 20) * 14))
    ).toFixed(1)
    const wakeX = +(
      226 +
      Math.max(-18, Math.min(18, ((latestSleep.quality - 70) / 30) * 16))
    ).toFixed(1)

    return [
      { x: bedX, y: arcY(bedX, 88, 72, 78, 54), highlight: false },
      { x: midX, y: arcY(midX, 140, 72, 78, 60), highlight: true },
      { x: wakeX, y: arcY(wakeX, 192, 72, 78, 54), highlight: false },
    ]
  }, [latestSleep.bedtime, latestSleep.quality, bedtimeGoal, sleepGoalPct])

  const orbAmbientColor = React.useMemo(() => {
    const v = latestMood?.valence ?? 0.4
    if (v >= 0.35) return "rgba(163, 230, 53, 0.28)"
    if (v >= 0) return "rgba(56, 189, 248, 0.26)"
    return "rgba(167, 139, 250, 0.28)"
  }, [latestMood?.valence])

  return (
    <div className="space-y-3.5 px-4 pt-2.5 pb-34">
      {/* Top App Bar with WordRoll status & Activity-style circular frosted controls */}
      <header className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-[19px] font-semibold tracking-tight text-white">
            {userName.trim()
              ? `${getTimeGreeting(now)}, ${userName.trim()}`
              : getTimeGreeting(now)}
          </h1>
          <div className="mt-0.5 text-[11.5px]">
            <WordRoll
              lead="Режим:"
              words={[
                countdown.isPastBedtime
                  ? `отбой в ${bedtimeGoal}`
                  : `через ${countdown.formattedLeft} ко сну`,
                `ср. сон ${avgHrs}ч`,
                `${periodNights.length} ${pluralRu(periodNights.length, ["ночь", "ночи", "ночей"])}`,
                `${moodHistory.length} ${pluralRu(moodHistory.length, ["чек-ин", "чек-ина", "чек-инов"])}`,
              ]}
              intervalSec={2.8}
              leadClassName="text-white/45"
              accentClassName="text-[#e8ff1f]"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditWidgetsMode(!editWidgetsMode)}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold backdrop-blur-md transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97] motion-reduce:transition-none",
              editWidgetsMode
                ? "border-[#e8ff1f]/32 bg-[#e8ff1f]/[0.16] text-[#f2ff78] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_14px_rgba(232,255,31,0.12)]"
                : "border-white/14 bg-white/[0.09] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-white/[0.15]"
            )}
          >
            <IconSwap
              state={editWidgetsMode ? "b" : "a"}
              iconA={<LayoutGrid className="h-3.5 w-3.5" />}
              iconB={<Check className="h-3.5 w-3.5" />}
            />
            <TextStatesSwap value={editWidgetsMode ? "Готово" : "Виджеты"} />
          </button>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Профиль и настройки"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/16 bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.17] active:scale-[0.96] motion-reduce:transition-none"
          >
            <User className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Honest Weekly Recap Banner (scoped Glimm sweep triggers inside IPhoneFrame) */}
      <button
        type="button"
        onClick={() => setWeeklyRecapOpen(true)}
        className="group flex w-full cursor-pointer items-center justify-between rounded-[24px] border border-indigo-300/22 bg-gradient-to-r from-[#171535]/90 via-[#1f163b]/82 to-[#10121e]/92 px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition-[border-color,background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:border-indigo-300/38 active:scale-[0.985] motion-reduce:transition-none"
      >
        <div className="flex items-center gap-2.5">
          <OrbLoader size={30} speed={1.1} label="Итоги" />
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <span className="t-shimmer" data-text="Итоги недели готовы">
                Итоги недели готовы
              </span>
              <Sparkles className="h-3 w-3 text-[#e8ff1f]" />
            </div>
            <p className="text-[11px] text-white/58">
              Ср. <TextSwapSoft value={avgHrs} /> ч · Бодрость{" "}
              <TextSwapSoft value={`${avgQual}%`} /> · {moodHistory.length}{" "}
              {pluralRu(moodHistory.length, ["чек-ин", "чек-ина", "чек-инов"])}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/15 bg-white/[0.12] px-2.5 py-1 text-[11px] font-medium text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-[background-color] duration-[var(--duration-quick)] group-hover:bg-white/[0.2] motion-reduce:transition-none">
          Обзор
        </span>
      </button>

      {/* 3D Peeking Hero Carousel */}
      <div>
        <Carousel
          setApi={setCarouselApi}
          opts={{ align: "center", loop: true }}
          className="-mx-4"
        >
          <CarouselContent>
            {/* Hero Slide 1: Green Score + 29x6 Equalizer + Dual Concentric Milky Cards */}
            <CarouselItem className="basis-[80%]">
              <TiltCard
                disabled={slideIdx !== 0}
                maxTilt={6}
                glare
                className="rounded-[32px]"
              >
                <div
                  className={cn(
                    "relative flex min-h-[272px] flex-col justify-between overflow-hidden rounded-[32px] p-3.5 text-white shadow-xl transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                    slideIdx === 0 ? "scale-100 opacity-100" : "scale-[0.89] opacity-65"
                  )}
                  style={{
                    background:
                      "radial-gradient(65% 42% at 50% 22%, rgba(255,248,225,0.22), transparent 70%), linear-gradient(180deg, #d7b996 0%, #b8c96c 34%, #2f9646 76%, #1f7436 100%)",
                  }}
                >
                  <div
                    aria-hidden
                    className="oled-grain pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[32px]"
                    style={{
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.46), inset 0 0 0 1px rgba(255,255,255,0.14)",
                    }}
                  />
                  <div className="relative z-10 flex flex-1 flex-col items-center justify-between">
                    <span className="text-[12px] font-medium tracking-tight text-white/95">
                      Индекс дня
                    </span>
                    <DotMatrix
                      value={dayIndex}
                      size="lg"
                      countUp
                      glow
                      className="mt-1.5"
                    />
                    <span className="mt-1 text-[11.5px] font-medium text-white/90">
                      {dayIndex >= 80
                        ? "Хороший баланс режима"
                        : dayIndex >= 60
                          ? "Умеренный ритм"
                          : "Нужно выспаться"}
                    </span>

                    {/* 29-col x 6-row honest micro-dot equalizer */}
                    <svg
                      viewBox="0 0 203 28"
                      className="mt-2.5 h-6.5 w-full max-w-[236px]"
                      aria-hidden="true"
                    >
                      {equalizerCols.map(({ c, activeRows, isCenterBand }) =>
                        Array.from({ length: 6 }, (_, r) => {
                          const rowFromBottom = 5 - r
                          const isActive = rowFromBottom < activeRows
                          const isBaseQuiet = rowFromBottom < 2 && !isCenterBand
                          if (!isActive && rowFromBottom >= 2) return null
                          const opacity = isActive
                            ? isBaseQuiet
                              ? 0.38
                              : isCenterBand && rowFromBottom >= 3
                                ? 0.96
                                : 0.7
                            : 0.22
                          return (
                            <circle
                              key={`${c}-${r}`}
                              cx={c * 7 + 3.5}
                              cy={r * 4.5 + 2.5}
                              r={1.35}
                              fill={
                                isActive && isCenterBand && rowFromBottom >= 4
                                  ? "#f6ffb0"
                                  : "#ffffff"
                              }
                              opacity={opacity}
                            />
                          )
                        })
                      )}
                    </svg>

                    {/* Dual Concentric Milky-Glass Sub-Cards */}
                    <div className="mt-2.5 grid w-full grid-cols-2 gap-2.5">
                      <MilkySubCard
                        onClick={() => setActiveTab("sleep")}
                        className="flex min-h-[104px] cursor-pointer flex-col justify-between p-3 active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/95">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.16]">
                            <Moon className="h-3.5 w-3.5" />
                          </span>
                          <span>Сон</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-baseline gap-1">
                            <DotMatrix value={`${sleepHours}:${sleepMins}`} size="sm" />
                            <span className="text-[10px] text-white/85">ч</span>
                          </div>
                          <div className="mt-0.5 text-[10px] text-white/80">
                            Цель {sleepGoalPct}% · {latestSleep.bedtime}
                          </div>
                        </div>
                      </MilkySubCard>

                      <MilkySubCard
                        onClick={() => setActiveTab("analytics")}
                        className="flex min-h-[104px] cursor-pointer flex-col justify-between p-3 active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/95">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.16]">
                            <Heart className="h-3.5 w-3.5" />
                          </span>
                          <span>Настроение</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-baseline gap-1">
                            <DotMatrix value={moodPct} size="sm" />
                            <span className="text-[10px] text-white/85">%</span>
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-white/80">
                            {latestMood?.label ?? "Отметьте фон"}
                          </div>
                        </div>
                      </MilkySubCard>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </CarouselItem>

            {/* Hero Slide 2: Activity-style Nocturnal Overlapping Dotted Orbital Arcs */}
            <CarouselItem className="basis-[80%]">
              <TiltCard
                disabled={slideIdx !== 1}
                maxTilt={6}
                glare
                className="rounded-[32px]"
              >
                <GlowCard
                  theme="plum-violet"
                  coreOpacity={0.9}
                  onClick={() => setActiveTab("sleep")}
                  className={cn(
                    "h-[272px] cursor-pointer rounded-[32px] transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                    slideIdx === 1 ? "scale-100 opacity-100" : "scale-[0.89] opacity-65"
                  )}
                  contentClassName="flex flex-col justify-between p-4"
                >
                  <div className="flex items-center justify-between text-xs text-white/88">
                    <span className="font-medium">Прошлая ночь</span>
                    <span className="rounded-full border border-white/18 bg-white/[0.12] px-2.5 py-0.5 font-mono text-[10px] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md">
                      {latestSleep.bedtime} – {latestSleep.wakeTime}
                    </span>
                  </div>

                  <div className="my-auto flex flex-col items-center pt-1">
                    <DotMatrix
                      value={(latestSleep.durationMin / 60).toFixed(1)}
                      size="lg"
                      glow
                    />
                    <span className="mt-1.5 text-[11.5px] text-white/75">
                      Часов сна · бодрость {latestSleep.quality}% · цель {sleepGoalPct}%
                    </span>
                  </div>

                  {/* Overlapping dotted semicircular orbital arcs + glowing night nodes */}
                  <svg viewBox="0 0 280 72" className="-mx-4 -mb-4 h-[72px] w-[calc(100%+32px)] overflow-visible">
                    <path
                      d="M 10 72 A 78 54 0 0 1 166 72"
                      fill="none"
                      stroke="rgba(255,255,255,0.24)"
                      strokeWidth="1.2"
                      strokeDasharray="1.5 4.5"
                    />
                    <path
                      d="M 62 72 A 78 60 0 0 1 218 72"
                      fill="none"
                      stroke="rgba(255,255,255,0.34)"
                      strokeWidth="1.2"
                      strokeDasharray="1.5 4.5"
                    />
                    <path
                      d="M 114 72 A 78 54 0 0 1 270 72"
                      fill="none"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="1.2"
                      strokeDasharray="1.5 4.5"
                    />
                    {orbitalNodes.map((node, i) => (
                      <g key={i}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.highlight ? 7.5 : 5.5}
                          fill={node.highlight ? "rgba(232,255,31,0.22)" : "rgba(255,255,255,0.18)"}
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.highlight ? 3.1 : 2.3}
                          fill={node.highlight ? "#e8ff1f" : "#ffffff"}
                        />
                      </g>
                    ))}
                  </svg>
                </GlowCard>
              </TiltCard>
            </CarouselItem>

            {/* Hero Slide 3: State of Mind Quick Card with ambient valence halo */}
            <CarouselItem className="basis-[80%]">
              <TiltCard
                disabled={slideIdx !== 2}
                maxTilt={6}
                glare
                className="rounded-[32px]"
              >
                <GlowCard
                  theme="emerald-lime"
                  coreOpacity={0.86}
                  onClick={() => setMoodDrawerOpen(true)}
                  className={cn(
                    "h-[272px] cursor-pointer rounded-[32px] transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                    slideIdx === 2 ? "scale-100 opacity-100" : "scale-[0.89] opacity-65"
                  )}
                  contentClassName="flex flex-col items-center justify-between p-4"
                >
                  <div className="flex w-full items-center justify-between text-xs text-white/88">
                    <span className="font-medium">Чек-ин состояния</span>
                    <span className="text-[11px] text-white/62">
                      {latestMood?.timestamp ?? "Сегодня"}
                    </span>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute h-36 w-36 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${orbAmbientColor} 0%, transparent 72%)`,
                      }}
                    />
                    <StateOfMindOrb valence={latestMood?.valence ?? 0.42} size={118} />
                  </div>

                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {latestMood?.label ?? "Отметьте состояние"}
                      </div>
                      <div className="truncate text-[11px] text-white/62">
                        {(latestMood?.emotions ?? ["Спокойствие"]).slice(0, 2).join(" · ")}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/22 bg-white/[0.15] px-3 py-1.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md">
                      <Plus className="h-3.5 w-3.5" />
                      Чек-ин
                    </span>
                  </div>
                </GlowCard>
              </TiltCard>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        {/* External Slide Label + Pagination Dots */}
        <div className="mt-2 flex flex-col items-center gap-1.5">
          <TextStatesSwap
            value={SLIDE_TITLES[slideIdx] ?? SLIDE_TITLES[0]}
            className="text-[12px] font-medium tracking-tight text-white/82"
          />
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => carouselApi?.scrollTo(i)}
                aria-label={`Слайд ${i + 1}`}
                className={cn(
                  "h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                  slideIdx === i ? "w-4 bg-white" : "w-1.5 bg-white/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bento Dashboard Header + SlidingTabs Period Switcher */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[13.5px] font-semibold tracking-tight text-white/95">
            <TextStatesSwap
              value={editWidgetsMode ? "Правка сетки" : "Виджеты"}
            />
          </h2>

          {!editWidgetsMode ? (
            <SlidingTabs
              items={PERIOD_ITEMS}
              value={bentoPeriod}
              onValueChange={setBentoPeriod}
              ariaLabel="Период графиков"
              size="xs"
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setWidgetGalleryOpen(true)}
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[#e8ff1f]/24 bg-[#e8ff1f]/[0.12] px-2.5 py-1 text-[11px] font-semibold text-[#f1ff76] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition-[background-color,border-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-[#e8ff1f]/[0.2] active:scale-[0.97] motion-reduce:transition-none"
        >
          <Plus className="h-3 w-3" />
          <span>Виджет</span>
        </button>
      </div>

      <EditableBentoGrid />
    </div>
  )
}

export default HomeScreen
