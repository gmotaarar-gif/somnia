import * as React from "react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { Textarea, ToggleGroup, ToggleGroupItem } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { WheelPicker, SOMNA_TIME_COLUMNS } from "@/components/ui/wheel-picker"
import { Scrubber } from "@/components/ui/scrubber"
import { SlidingTabs, TextSwapSoft } from "@/components/ui/t-motion"
import { toLocalDateKey, useSomna } from "@/store/useSomnaStore"

const WEEKDAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
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

type DayOffsetId = "0" | "1" | "2"

const DAY_CHOICES: { id: DayOffsetId; label: string }[] = [
  { id: "0", label: "Сегодня" },
  { id: "1", label: "Вчера" },
  { id: "2", label: "Позавчера" },
]

function splitTime(t: string): Record<string, string> {
  const [h = "23", m = "30"] = t.split(":")
  const roundedMin = String((Math.round(Number(m) / 5) * 5) % 60).padStart(2, "0")
  return {
    hour: h.padStart(2, "0"),
    minute: roundedMin,
  }
}

function buildNightDateInfo(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const dayShort = WEEKDAYS_RU[d.getDay()] ?? "Вс"
  const dateKey = toLocalDateKey(d)
  const date =
    offsetDays === 0
      ? "Сегодня"
      : `${dayShort}, ${d.getDate()} ${MONTHS_RU[d.getMonth()] ?? ""}`
  return { date, dayShort, dateKey }
}

export function SleepLogDrawer() {
  const { sleepLogOpen, setSleepLogOpen, bedtimeGoal, wakeGoal, addSleepNight } =
    useSomna()

  const [dayOffset, setDayOffset] = React.useState<DayOffsetId>("0")
  const [bedWheel, setBedWheel] = React.useState<Record<string, string>>(() =>
    splitTime(bedtimeGoal)
  )
  const [wakeWheel, setWakeWheel] = React.useState<Record<string, string>>(() =>
    splitTime(wakeGoal)
  )
  const [quality, setQuality] = React.useState(86)
  const [awakenings, setAwakenings] = React.useState(0)
  const [note, setNote] = React.useState("")

  React.useEffect(() => {
    if (sleepLogOpen) {
      setDayOffset("0")
      setBedWheel(splitTime(bedtimeGoal))
      setWakeWheel(splitTime(wakeGoal))
      setQuality(86)
      setAwakenings(0)
      setNote("")
    }
  }, [sleepLogOpen, bedtimeGoal, wakeGoal])

  const bedtime = `${bedWheel.hour}:${bedWheel.minute}`
  const wakeTime = `${wakeWheel.hour}:${wakeWheel.minute}`

  const durationPreview = React.useMemo(() => {
    const bh = Number(bedWheel.hour)
    const bm = Number(bedWheel.minute)
    const wh = Number(wakeWheel.hour)
    const wm = Number(wakeWheel.minute)
    let diff = wh * 60 + wm - (bh * 60 + bm)
    if (diff <= 0) diff += 1440
    return `${Math.floor(diff / 60)}ч ${String(diff % 60).padStart(2, "0")}м`
  }, [bedWheel, wakeWheel])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const [bh, bm] = bedtime.split(":").map(Number)
    const [wh, wm] = wakeTime.split(":").map(Number)
    let diff = wh * 60 + wm - (bh * 60 + bm)
    if (diff <= 0) diff += 1440

    const { date, dayShort, dateKey } = buildNightDateInfo(Number(dayOffset))

    addSleepNight({
      date,
      dateKey,
      dayShort,
      bedtime,
      wakeTime,
      durationMin: diff,
      quality,
      awakenings,
      note: note.trim() || undefined,
    })
    setNote("")
    setSleepLogOpen(false)
  }

  return (
    <Drawer open={sleepLogOpen} onOpenChange={setSleepLogOpen}>
      <DrawerContent className="max-h-[92%]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Записать сон</DrawerTitle>
              <DrawerDescription>
                Время в постели, пробуждения и бодрость утром
              </DrawerDescription>
            </div>
            <span className="rounded-full border border-[#e8ff1f]/30 bg-[#e8ff1f]/14 px-3 py-1 font-mono text-xs font-semibold text-[#f2ff78] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
              <TextSwapSoft value={durationPreview} align="end" />
            </span>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSave} className="space-y-3.5 overflow-y-auto px-5 pb-7 no-scrollbar">
          {/* Date Selector Pill */}
          <SlidingTabs
            items={DAY_CHOICES}
            value={dayOffset}
            onValueChange={setDayOffset}
            ariaLabel="День записи"
            size="xs"
            fullWidth
          />

          {/* Kokonut UI 3D Cylindrical Wheel Pickers */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="text-white/65">Отбой 🌙</span>
                <span className="font-mono font-semibold text-white">{bedtime}</span>
              </div>
              <WheelPicker
                label="Время отбоя"
                columns={SOMNA_TIME_COLUMNS}
                value={bedWheel}
                onValueChange={setBedWheel}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="text-white/65">Подъём ☀️</span>
                <span className="font-mono font-semibold text-white">{wakeTime}</span>
              </div>
              <WheelPicker
                label="Время подъёма"
                columns={SOMNA_TIME_COLUMNS}
                value={wakeWheel}
                onValueChange={setWakeWheel}
              />
            </div>
          </div>

          {/* SmoothUI Scrubber for Morning Readiness */}
          <Scrubber
            label="Ощущение бодрости утром"
            unit="%"
            min={20}
            max={100}
            step={1}
            decimals={0}
            ticks={9}
            value={quality}
            onValueChange={setQuality}
          />

          {/* Self-reported Awakenings */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/65">Просыпались ночью</label>
            <ToggleGroup
              type="single"
              value={String(awakenings)}
              onValueChange={(v) => v && setAwakenings(Number(v))}
              className="grid w-full grid-cols-4"
            >
              <ToggleGroupItem value="0">0</ToggleGroupItem>
              <ToggleGroupItem value="1">1 раз</ToggleGroupItem>
              <ToggleGroupItem value="2">2 раза</ToggleGroupItem>
              <ToggleGroupItem value="3">3+</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/65">Заметка об утре</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Напр.: проснулся сам за 5 минут до будильника"
              rows={2}
            />
          </div>

          <Button type="submit" size="lg" className="w-full">
            Сохранить ночь
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

export default SleepLogDrawer
