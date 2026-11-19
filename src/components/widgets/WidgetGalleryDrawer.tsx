import * as React from "react"
import { motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  Check,
  Droplets,
  Flame,
  Gauge,
  Moon,
  Plus,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  Waves,
  Wind,
} from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ToggleGroup,
  ToggleGroupItem,
  Input,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { GlowCard, GLOW_PALETTES } from "@/components/ui/glow-card"
import { DotMatrix } from "@/components/ui/dot-matrix"
import { TickBar } from "@/components/ui/tick-bar"
import { Scrubber } from "@/components/ui/scrubber"
import { IconSwap, TextMorph } from "@/components/ui/t-motion"
import { SOMNA_TRANSITIONS } from "@/lib/motion"
import {
  getTargetDurationMin,
  useSomna,
  type BentoWidgetItem,
  type GlowTheme,
  type WidgetKind,
  type WidgetSize,
} from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const THEME_KEYS = Object.keys(GLOW_PALETTES) as GlowTheme[]

function WidgetKindGlyph({ kind }: { kind: WidgetKind }) {
  const cls = "h-4 w-4 text-white/95"
  switch (kind) {
    case "bio-stream":
      return <Activity className={cls} />
    case "weekly-capsules":
      return <BarChart3 className={cls} />
    case "morning-energy":
      return <Sparkles className={cls} />
    case "sleep-phases":
      return <Gauge className={cls} />
    case "mood-waves":
      return <Waves className={cls} />
    case "daily-streak":
      return <Flame className={cls} />
    case "water-balance":
      return <Droplets className={cls} />
    case "evening-detox":
      return <SlidersHorizontal className={cls} />
    case "sleep-quality":
      return <Moon className={cls} />
    case "breath-volume":
      return <Wind className={cls} />
    case "body-report":
      return <Ruler className={cls} />
    case "custom":
    default:
      return <Sparkles className={cls} />
  }
}

export function WidgetGalleryDrawer() {
  const {
    widgetGalleryOpen,
    setWidgetGalleryOpen,
    widgets,
    sleepHistory,
    moodHistory,
    waterMl,
    breathMinutes,
    streakDays,
    eveningDetox,
    bedtimeGoal,
    wakeGoal,
    restoreWidget,
    removeWidget,
    addCustomWidget,
    resetWidgets,
  } = useSomna()

  const [title, setTitle] = React.useState("Медитация")
  const [unit, setUnit] = React.useState("мин")
  const [target, setTarget] = React.useState<number>(15)
  const [size, setSize] = React.useState<WidgetSize>("1x1")
  const [theme, setTheme] = React.useState<GlowTheme>("plum-violet")

  const availableWidgets = React.useMemo(
    () => widgets.filter((w) => !w.visible),
    [widgets]
  )
  const activeWidgets = React.useMemo(
    () => widgets.filter((w) => w.visible),
    [widgets]
  )

  const latestSleep = sleepHistory[sleepHistory.length - 1]
  const last7 = sleepHistory.slice(-7)
  const avgSleepHrs = (
    last7.reduce((s, n) => s + n.durationMin, 0) /
    Math.max(1, last7.length) /
    60
  ).toFixed(1)
  const targetMin = getTargetDurationMin(bedtimeGoal, wakeGoal)
  const avgGoalPct = Math.min(
    100,
    Math.round(
      ((last7.reduce((s, n) => s + n.durationMin, 0) / Math.max(1, last7.length)) /
        Math.max(1, targetMin)) *
        100
    )
  )
  const avgMoodPct = moodHistory.length
    ? Math.round(
        (moodHistory.reduce((s, m) => s + (m.valence + 1) * 50, 0) / moodHistory.length)
      )
    : 50

  const getLiveMetricPill = (w: BentoWidgetItem): string => {
    switch (w.kind) {
      case "bio-stream":
        return `${avgGoalPct}/100`
      case "weekly-capsules":
        return `${avgSleepHrs} ч ср.`
      case "morning-energy":
        return `${latestSleep?.quality ?? 85}%`
      case "sleep-phases":
        return `отбой ${bedtimeGoal}`
      case "mood-waves":
        return `${avgMoodPct}% баланс`
      case "daily-streak":
        return `${streakDays} дн.`
      case "water-balance":
        return `${waterMl} мл`
      case "evening-detox":
        return eveningDetox ? "Вкл" : "Выкл"
      case "sleep-quality":
        return `${latestSleep?.quality ?? 85}%`
      case "breath-volume":
        return `${breathMinutes} мин`
      case "body-report":
        return `${avgGoalPct}% цели`
      case "custom":
      default:
        return `${w.customValue ?? 0}/${w.customTarget ?? 10}`
    }
  }

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault()
    const numTarget = Math.max(1, Math.round(target) || 10)
    addCustomWidget({
      title: title.trim() || "Привычка",
      unit: unit.trim() || "раз",
      target: numTarget,
      size,
      theme,
    })
    setWidgetGalleryOpen(false)
  }

  const renderCatalogRow = (w: BentoWidgetItem) => (
    <div
      key={w.id}
      className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.045] p-3 transition-[border-color,background-color] duration-[var(--duration-quick)] hover:border-white/16 hover:bg-white/[0.065] motion-reduce:transition-none"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
          style={{ background: GLOW_PALETTES[w.theme].outer }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-1 rounded-xl opacity-75"
            style={{
              background: `radial-gradient(circle, ${GLOW_PALETTES[w.theme].core} 0%, transparent 85%)`,
            }}
          />
          <span className="relative z-10">
            <WidgetKindGlyph kind={w.kind} />
          </span>
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-white">
            <span className="truncate">{w.title}</span>
            <span className="shrink-0 rounded-full border border-white/14 bg-white/[0.1] px-2 py-0.5 font-mono text-[9.5px] text-white/75">
              {w.size}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/48">
            <span className="truncate">{w.subtitle ?? "Интерактивный Bento-виджет"}</span>
            <span className="shrink-0 font-mono text-[10px] text-[#e8ff1f]/85">
              · {getLiveMetricPill(w)}
            </span>
          </div>
        </div>
      </div>

      <Button
        size="sm"
        variant={w.visible ? "glass" : "default"}
        onClick={() => (w.visible ? removeWidget(w.id) : restoreWidget(w.id))}
        className={cn("ml-2 h-8 shrink-0 text-xs", w.visible && "text-emerald-300")}
      >
        <IconSwap
          state={w.visible ? "b" : "a"}
          iconA={<Plus className="h-3.5 w-3.5" />}
          iconB={<Check className="h-3.5 w-3.5" />}
        />
        <TextMorph value={w.visible ? "Активен" : "Добавить"} />
      </Button>
    </div>
  )

  return (
    <Drawer open={widgetGalleryOpen} onOpenChange={setWidgetGalleryOpen}>
      <DrawerContent className="max-h-[89%]">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <div>
            <DrawerTitle>Галерея Bento-виджетов</DrawerTitle>
            <DrawerDescription>
              Интерактивные карточки сна, режима и привычек
            </DrawerDescription>
          </div>
          <button
            type="button"
            onClick={resetWidgets}
            className="flex cursor-pointer items-center gap-1 rounded-full border border-white/14 bg-white/[0.08] px-2.5 py-1 text-[11px] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition-[background-color,color] duration-[var(--duration-quick)] hover:bg-white/[0.14] hover:text-white motion-reduce:transition-none"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Сброс</span>
          </button>
        </DrawerHeader>

        <div className="overflow-y-auto px-5 pb-7 no-scrollbar">
          <Tabs defaultValue="catalog" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="catalog">Библиотека</TabsTrigger>
              <TabsTrigger value="create">
                <Sparkles className="mr-1 h-3 w-3" />
                Создать свой
              </TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="space-y-3.5 pt-1.5">
              {availableWidgets.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold tracking-wide text-[#f1ff76] uppercase">
                      Доступные для добавления
                    </span>
                    <span className="font-mono text-[10px] text-white/45">
                      {availableWidgets.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {availableWidgets.map(renderCatalogRow)}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold tracking-wide text-white/55 uppercase">
                    На главном экране
                  </span>
                  <span className="font-mono text-[10px] text-white/45">
                    {activeWidgets.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {activeWidgets.map(renderCatalogRow)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="create">
              <form onSubmit={handleCreateCustom} className="space-y-3.5 pt-1.5">
                <div className="flex justify-center">
                  <motion.div
                    layout
                    transition={SOMNA_TRANSITIONS.cardSpring}
                    className={cn(size === "2x1" ? "w-full" : "w-[56%]")}
                  >
                    <GlowCard
                      theme={theme}
                      className="h-[124px] w-full"
                      contentClassName="flex flex-col justify-between p-3.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-semibold text-white">
                          {title || "Моя метрика"}
                        </span>
                        <span className="shrink-0 rounded-full border border-white/18 bg-white/[0.14] px-2 py-0.5 font-mono text-[9.5px] text-[#f2ff78] backdrop-blur-md">
                          {size}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-1.5">
                          <DotMatrix value={target} size="sm" />
                          <span className="font-mono text-xs text-white/65">
                            {unit || "мин"}
                          </span>
                        </div>
                        <TickBar
                          value={Math.max(1, Math.round(target * 0.6))}
                          max={Math.max(1, target)}
                          segments={size === "2x1" ? 20 : 12}
                          shape="pill"
                          color="#a3e635"
                          className="h-1.5 gap-1"
                        />
                      </div>
                    </GlowCard>
                  </motion.div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-white/70">
                      Название виджета
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Медитация, Чтение, Магний"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/70">
                      Единица
                    </label>
                    <Input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="мин"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/70">
                    Потяните ползунок дневной цели
                  </label>
                  <Scrubber
                    label="Дневная цель"
                    unit={unit || "мин"}
                    min={1}
                    max={120}
                    step={1}
                    decimals={0}
                    ticks={11}
                    value={target}
                    onValueChange={setTarget}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/70">
                    Формат на сетке
                  </label>
                  <ToggleGroup
                    type="single"
                    value={size}
                    onValueChange={(v) => v && setSize(v as WidgetSize)}
                    className="w-full"
                  >
                    <ToggleGroupItem value="1x1" className="flex-1">
                      Квадрат 1×1
                    </ToggleGroupItem>
                    <ToggleGroupItem value="2x1" className="flex-1">
                      Широкий 2×1
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">
                    Купольное свечение
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {THEME_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTheme(key)}
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] backdrop-blur-md transition-[background-color,border-color,color] duration-[var(--duration-quick)] motion-reduce:transition-none",
                          theme === key
                            ? "border-white/35 bg-white/[0.16] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                            : "border-white/10 bg-white/[0.05] text-white/62 hover:bg-white/[0.1]"
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.35)]"
                          style={{ backgroundColor: GLOW_PALETTES[key].swatch }}
                        />
                        <span>{GLOW_PALETTES[key].label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Добавить виджет на главный экран
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default WidgetGalleryDrawer
