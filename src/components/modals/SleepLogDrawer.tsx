import * as React from "react"
import { AnimatePresence, m, useReducedMotion } from "framer-motion"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { SleepRestOrb } from "@/components/ui/sleep-rest-orb"
import { WordRoll } from "@/components/ui/word-roll"
import { Slider } from "@/components/ui/controls"
import { Textarea, ToggleGroup, ToggleGroupItem } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { WheelPicker } from "@/components/ui/wheel-picker"
import { SLFocusTopics } from "@/components/ui/sl-product-controls"
import { SlidingTabs, StaggerReveal, TextSwapSoft } from "@/components/ui/t-motion"
import { Moon as KeylineMoon } from "@/components/icons/duotone/moon"
import { Sun as KeylineSun } from "@/components/icons/duotone/sun"
import { SOMNA_TIME_COLUMNS } from "@/lib/wheelColumns"
import { STEP_SLIDE_VARIANTS, haptic } from "@/lib/motion"
import {
  getNightDateLabels,
  getTargetDurationMin,
  toLocalDateKey,
} from "@/lib/sleepTime"
import {
  getSleepQualityLabel,
  getSleepTone,
  sampleSleepQualityPalette,
} from "@/lib/sleepQuality"
import { useSomna } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const MONTHS_RU = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
]

const STEP_KEYS = ["quality", "schedule", "details", "done"] as const
const STEP_ORB_SIZES = [192, 96, 76, 192] as const
const DAY_SUFFIX_MAP: Record<DayOffsetId, string> = {
  "0": "",
  "1": " · Вчера",
  "2": " · Позавчера",
}

function formatTargetDelta(diffMin: number) {
  if (Math.abs(diffMin) <= 15) return "в пределах цели"
  return diffMin > 0 ? `+${diffMin} мин к цели` : `${diffMin} мин к цели`
}

type DayOffsetId = "0" | "1" | "2"

const DAY_CHOICES: { id: DayOffsetId; label: string }[] = [
  { id: "0", label: "Сегодня" },
  { id: "1", label: "Вчера" },
  { id: "2", label: "Позавчера" },
]

const SLEEP_TAGS = [
  "Быстро уснул",
  "Глубокий сон",
  "Проснулся сам",
  "Прохладно",
  "Поздний экран",
  "Кофеин",
  "Стресс",
  "Яркие сны",
]

function splitTime(t: string): Record<string, string> {
  const [h = "23", m = "30"] = t.split(":")
  const roundedMin = String((Math.round(Number(m) / 5) * 5) % 60).padStart(2, "0")
  return {
    hour: h.padStart(2, "0"),
    minute: roundedMin,
  }
}

function computeDurationMin(
  bedWheel: Record<string, string>,
  wakeWheel: Record<string, string>
) {
  const bh = Number(bedWheel.hour)
  const bm = Number(bedWheel.minute)
  const wh = Number(wakeWheel.hour)
  const wm = Number(wakeWheel.minute)
  let diff = wh * 60 + wm - (bh * 60 + bm)
  if (diff <= 0) diff += 1440
  return diff
}

function formatDurationShort(mins: number) {
  return `${Math.floor(mins / 60)}ч ${String(mins % 60).padStart(2, "0")}м`
}

function buildNightDateInfo(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const dateKey = toLocalDateKey(d)
  const labels = getNightDateLabels(dateKey) ?? { date: "Сегодня", dayShort: "Вс" }
  return { ...labels, dateKey }
}

function SleepQualityStep({
  quality,
  label,
  accentColor,
  onQualityChange,
  onNext,
  dir,
  reduceMotion,
}: {
  quality: number
  label: string
  accentColor: string
  onQualityChange: (val: number) => void
  onNext: () => void
  dir: 1 | -1
  reduceMotion: boolean
}) {
  return (
    <m.div
      key="sleep-step-0"
      custom={{ dir, reduced: reduceMotion }}
      variants={STEP_SLIDE_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      className="flex flex-1 flex-col items-center justify-between px-6 pt-2 pb-8 text-center"
    >
      <div>
        <h2 className="max-w-[290px] text-[20px] leading-snug font-bold tracking-tight text-white">
          Как вы выспались этой ночью?
        </h2>
        <div className="mt-2.5 flex justify-center text-[23px] font-bold tracking-tight">
          <WordRoll lead="" value={label} accentClassName="text-white" />
        </div>
        <div className="mt-1.5 flex justify-center">
          <span
            style={{
              borderColor: `${accentColor}44`,
              backgroundColor: `${accentColor}1f`,
              color: accentColor,
            }}
            className="inline-flex items-center rounded-full border px-3 py-0.5 font-mono text-xs font-semibold tabular-nums"
          >
            {quality}% бодрость
          </span>
        </div>
      </div>

      <div className="w-full space-y-5">
        <div className="space-y-2.5">
          <Slider
            spectrum="sleep"
            aria-label="Оценка бодрости утром"
            min={20}
            max={100}
            step={2}
            value={[quality]}
            onValueChange={([v]) => onQualityChange(v)}
          />
          <div className="flex justify-between text-[11px] font-medium text-white/48">
            <span>Разбитое утро</span>
            <span>Полная бодрость</span>
          </div>
        </div>

        <Button
          size="lg"
          variant="white"
          onClick={onNext}
          className="h-12.5 w-full rounded-full text-[15px] font-semibold"
        >
          Далее
        </Button>
      </div>
    </m.div>
  )
}

function SleepScheduleStep({
  dayOffset,
  onDayOffsetChange,
  bedWheel,
  wakeWheel,
  onBedChange,
  onWakeChange,
  durationPreview,
  deltaBadge,
  accentColor,
  onBack,
  onNext,
  dir,
  reduceMotion,
}: {
  dayOffset: DayOffsetId
  onDayOffsetChange: (v: DayOffsetId) => void
  bedWheel: Record<string, string>
  wakeWheel: Record<string, string>
  onBedChange: (v: Record<string, string>) => void
  onWakeChange: (v: Record<string, string>) => void
  durationPreview: string
  deltaBadge: string
  accentColor: string
  onBack: () => void
  onNext: () => void
  dir: 1 | -1
  reduceMotion: boolean
}) {
  const bedtime = `${bedWheel.hour}:${bedWheel.minute}`
  const wakeTime = `${wakeWheel.hour}:${wakeWheel.minute}`

  return (
    <m.div
      key="sleep-step-1"
      custom={{ dir, reduced: reduceMotion }}
      variants={STEP_SLIDE_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      className="flex flex-1 flex-col justify-between overflow-y-auto overscroll-contain px-5 pt-1 pb-8 no-scrollbar"
    >
      <div className="space-y-3.5">
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Во сколько легли и проснулись?
          </h2>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <span
              style={{
                borderColor: `${accentColor}44`,
                backgroundColor: `${accentColor}1c`,
                color: accentColor,
              }}
              className="rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums"
            >
              <TextSwapSoft value={durationPreview} />
            </span>
            <span className="text-xs text-white/55">{deltaBadge}</span>
          </div>
        </div>

        <SlidingTabs
          items={DAY_CHOICES}
          value={dayOffset}
          onValueChange={onDayOffsetChange}
          ariaLabel="День записи сна"
          size="xs"
          fullWidth
        />

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="inline-flex items-center gap-1.5 text-white/65">
                <KeylineMoon size={13} className="text-indigo-300" />
                <span>Отбой</span>
              </span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {bedtime}
              </span>
            </div>
            <WheelPicker
              label="Время отбоя"
              columns={SOMNA_TIME_COLUMNS}
              value={bedWheel}
              onValueChange={onBedChange}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="inline-flex items-center gap-1.5 text-white/65">
                <KeylineSun size={13} className="text-[#e8ff1f]" />
                <span>Подъём</span>
              </span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {wakeTime}
              </span>
            </div>
            <WheelPicker
              label="Время подъёма"
              columns={SOMNA_TIME_COLUMNS}
              value={wakeWheel}
              onValueChange={onWakeChange}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 pt-3">
        <Button
          size="lg"
          variant="glass"
          onClick={onBack}
          className="rounded-full px-5"
        >
          Назад
        </Button>
        <Button
          size="lg"
          variant="white"
          onClick={onNext}
          className="flex-1 rounded-full"
        >
          Далее
        </Button>
      </div>
    </m.div>
  )
}

function SleepNightDetailsStep({
  awakenings,
  onAwakeningsChange,
  selectedTags,
  onTagsChange,
  note,
  onNoteChange,
  tone,
  onBack,
  onSave,
  dir,
  reduceMotion,
}: {
  awakenings: number
  onAwakeningsChange: (v: number) => void
  selectedTags: string[]
  onTagsChange: (v: string[]) => void
  note: string
  onNoteChange: (v: string) => void
  tone: "rose" | "indigo" | "mint" | "lime"
  onBack: () => void
  onSave: () => void
  dir: 1 | -1
  reduceMotion: boolean
}) {
  const awakeningsLabelId = React.useId()
  const noteInputId = React.useId()

  return (
    <m.div
      key="sleep-step-2"
      custom={{ dir, reduced: reduceMotion }}
      variants={STEP_SLIDE_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      className="flex flex-1 flex-col justify-between overflow-y-auto overscroll-contain px-6 pt-1 pb-8 no-scrollbar"
    >
      <div className="space-y-3.5">
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">
            Как прошла сама ночь?
          </h2>
          <p className="mt-0.5 text-xs text-white/55">
            Пробуждения и теги сохранятся в журнале сна
          </p>
        </div>

        <div className="space-y-1.5">
          <span
            id={awakeningsLabelId}
            className="block text-xs font-medium text-white/60"
          >
            Просыпались ночью
          </span>
          <ToggleGroup
            type="single"
            aria-labelledby={awakeningsLabelId}
            value={String(awakenings)}
            onValueChange={(v) => {
              if (v) {
                haptic(5)
                onAwakeningsChange(Number(v))
              }
            }}
            className="grid w-full grid-cols-4"
          >
            <ToggleGroupItem value="0">0</ToggleGroupItem>
            <ToggleGroupItem value="1">1 раз</ToggleGroupItem>
            <ToggleGroupItem value="2">2 раза</ToggleGroupItem>
            <ToggleGroupItem value="3">3+</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <SLFocusTopics
          options={SLEEP_TAGS}
          selected={selectedTags}
          onChange={onTagsChange}
          ariaLabel="Факторы и ощущения сна"
          tone={tone}
        />

        <div className="pt-0.5">
          <label
            htmlFor={noteInputId}
            className="text-xs font-medium text-white/60"
          >
            Короткая заметка (необязательно)
          </label>
          <Textarea
            id={noteInputId}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Напр.: проснулся сам за 5 минут до будильника"
            rows={2}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex gap-2.5 pt-3">
        <Button
          size="lg"
          variant="glass"
          onClick={onBack}
          className="rounded-full px-5"
        >
          Назад
        </Button>
        <Button
          size="lg"
          variant="white"
          onClick={onSave}
          className="flex-1 rounded-full"
        >
          Записать
        </Button>
      </div>
    </m.div>
  )
}

export function SleepLogDrawer() {
  const { sleepLogOpen, setSleepLogOpen, bedtimeGoal, wakeGoal, addSleepNight } =
    useSomna()
  const reduceMotion = useReducedMotion()

  const [step, setStep] = React.useState(0) // 0: quality orb, 1: time wheels, 2: awakenings/tags/note, 3: Записано
  const [dir, setDir] = React.useState<1 | -1>(1)
  const [dayOffset, setDayOffset] = React.useState<DayOffsetId>("0")
  const [bedWheel, setBedWheel] = React.useState<Record<string, string>>(() =>
    splitTime(bedtimeGoal)
  )
  const [wakeWheel, setWakeWheel] = React.useState<Record<string, string>>(() =>
    splitTime(wakeGoal)
  )
  const [quality, setQuality] = React.useState(84)
  const [awakenings, setAwakenings] = React.useState(0)
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")

  const closeTimerRef = React.useRef<number | null>(null)

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (sleepLogOpen) {
      clearCloseTimer()
      setStep(0)
      setDir(1)
      setDayOffset("0")
      setBedWheel(splitTime(bedtimeGoal))
      setWakeWheel(splitTime(wakeGoal))
      setQuality(84)
      setAwakenings(0)
      setSelectedTags([])
      setNote("")
    } else {
      clearCloseTimer()
    }
  }, [sleepLogOpen, bedtimeGoal, wakeGoal, clearCloseTimer])

  React.useEffect(() => {
    return () => clearCloseTimer()
  }, [clearCloseTimer])

  const durationMin = computeDurationMin(bedWheel, wakeWheel)
  const durationPreview = formatDurationShort(durationMin)
  const targetDurMin = getTargetDurationMin(bedtimeGoal, wakeGoal)
  const deltaBadge = formatTargetDelta(durationMin - targetDurMin)

  const label = getSleepQualityLabel(quality)
  const pal = sampleSleepQualityPalette(quality)
  const accentColor = `rgb(${pal.mid[0]}, ${pal.mid[1]}, ${pal.mid[2]})`
  const orbSize = STEP_ORB_SIZES[step] ?? 192
  const daySuffix = DAY_SUFFIX_MAP[dayOffset]

  const goStep = (next: number) => {
    haptic(6)
    setDir(next >= step ? 1 : -1)
    setStep(next)
  }

  const handleSave = () => {
    haptic(12)
    const bedtime = `${bedWheel.hour}:${bedWheel.minute}`
    const wakeTime = `${wakeWheel.hour}:${wakeWheel.minute}`
    const { date, dayShort, dateKey } = buildNightDateInfo(Number(dayOffset))
    const composedNote = [selectedTags.join(" · "), note.trim()]
      .filter(Boolean)
      .join(" — ")

    addSleepNight({
      date,
      dateKey,
      dayShort,
      bedtime,
      wakeTime,
      durationMin,
      quality,
      awakenings,
      note: composedNote || undefined,
    })

    setDir(1)
    setStep(3)
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setSleepLogOpen(false)
    }, 1850)
  }

  return (
    <Drawer open={sleepLogOpen} onOpenChange={setSleepLogOpen}>
      <DrawerContent
        style={{
          backgroundImage: `radial-gradient(85% 55% at 50% 18%, rgba(${pal.outer[0]}, ${pal.outer[1]}, ${pal.outer[2]}, 0.36), rgba(12, 13, 20, 0.98) 72%)`,
        }}
        className="h-[92%] max-h-[92%] border-t border-white/15 bg-[#0c0d14] transition-colors duration-[var(--duration-medium)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none"
      >
        <DrawerTitle className="sr-only">Запись сна</DrawerTitle>

        {/* Top 4-dot progress indicator (exact State of Mind twin) */}
        <div className="mt-2 flex items-center justify-center gap-2">
          {STEP_KEYS.map((key, i) => {
            if (step === 3) {
              return (
                <span
                  key={key}
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 0 8px ${accentColor}`,
                  }}
                  className="h-2 w-2 rounded-full"
                />
              )
            }
            return (
              <span
                key={key}
                style={{
                  backgroundColor:
                    step >= i ? accentColor : "rgba(255,255,255,0.2)",
                }}
                className={cn(
                  "h-2 rounded-full transition-[width,background-color] duration-[var(--duration-medium)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                  step === i ? "w-6" : "w-2"
                )}
              />
            )
          })}
        </div>

        {/* Persistent SleepRestOrb across all 4 steps */}
        <div className="mt-3 flex flex-col items-center">
          <SleepRestOrb
            quality={quality}
            durationMin={durationMin}
            size={orbSize}
            showCheckmark={step === 3}
          />
        </div>

        <AnimatePresence mode="wait" custom={{ dir, reduced: !!reduceMotion }}>
          {step === 0 && (
            <SleepQualityStep
              quality={quality}
              label={label}
              accentColor={accentColor}
              onQualityChange={setQuality}
              onNext={() => goStep(1)}
              dir={dir}
              reduceMotion={!!reduceMotion}
            />
          )}

          {step === 1 && (
            <SleepScheduleStep
              dayOffset={dayOffset}
              onDayOffsetChange={setDayOffset}
              bedWheel={bedWheel}
              wakeWheel={wakeWheel}
              onBedChange={setBedWheel}
              onWakeChange={setWakeWheel}
              durationPreview={durationPreview}
              deltaBadge={deltaBadge}
              accentColor={accentColor}
              onBack={() => goStep(0)}
              onNext={() => goStep(2)}
              dir={dir}
              reduceMotion={!!reduceMotion}
            />
          )}

          {step === 2 && (
            <SleepNightDetailsStep
              awakenings={awakenings}
              onAwakeningsChange={setAwakenings}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              note={note}
              onNoteChange={setNote}
              tone={getSleepTone(quality)}
              onBack={() => goStep(1)}
              onSave={handleSave}
              dir={dir}
              reduceMotion={!!reduceMotion}
            />
          )}

          {step === 3 && (
            <m.div
              key="sleep-step-3"
              custom={{ dir, reduced: !!reduceMotion }}
              variants={STEP_SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col items-center justify-start px-6 pt-4 text-center"
            >
              <StaggerReveal index={0}>
                <h2 className="text-[28px] font-bold tracking-tight text-white">
                  Записано
                </h2>
              </StaggerReveal>
              <StaggerReveal index={1}>
                <p className="mt-1 font-mono text-sm font-medium text-white/75 tabular-nums">
                  {durationPreview} · {quality}%{daySuffix}
                </p>
              </StaggerReveal>
              <StaggerReveal index={2}>
                <p className="mt-1 text-xs font-medium text-white/52">{label}</p>
              </StaggerReveal>
            </m.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  )
}

export default SleepLogDrawer
