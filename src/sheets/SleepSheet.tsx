import * as React from "react"
import { cn } from "@/lib/cn"
import { qualityLabel } from "@/lib/metrics"
import { dateKey, daysAgo, durationRu, hm, relativeDay, spanMinutes } from "@/lib/time"
import { useStore } from "@/store/store"
import { Button, Chip, Slider, Stepper, TimeField } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { Field, Sheet } from "@/ui/Sheet"

const TAGS = [
  "Быстро уснул",
  "Глубокий сон",
  "Проснулся сам",
  "Яркие сны",
  "Прохладно",
  "Поздний экран",
  "Кофеин",
  "Стресс",
  "Шум",
  "Алкоголь",
  "Поздний ужин",
]

const nowHHMM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function SleepForm({ onDone }: { onDone: () => void }) {
  const { addNight, bedGoal, wakeGoal, nightStart, clearNightStart, nights } = useStore()
  const days = React.useMemo(() => [0, 1, 2].map((n) => dateKey(daysAgo(n))), [])
  const [day, setDay] = React.useState(days[0])
  const [bedtime, setBedtime] = React.useState(nightStart ?? bedGoal)
  const [wakeTime, setWakeTime] = React.useState(nightStart ? nowHHMM() : wakeGoal)
  const [quality, setQuality] = React.useState(75)
  const [awakenings, setAwakenings] = React.useState(0)
  const [tags, setTags] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")

  const inBed = spanMinutes(bedtime, wakeTime)
  const duration = Math.max(0, inBed - awakenings * 8)
  const target = spanMinutes(bedGoal, wakeGoal)
  const exists = nights.some((n) => n.dateKey === day)

  const save = () => {
    addNight({ dateKey: day, bedtime, wakeTime, durationMin: duration, quality, awakenings, tags, note: note.trim() || undefined })
    clearNightStart()
    onDone()
  }

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
        <div className="card" data-tone="night" data-r="md">
          <div className="flex items-end justify-between gap-4 p-5">
            <div>
              <div className="text-[12px] text-ink-2">Вы спали</div>
              <Dots value={hm(duration)} shape="square" className="mt-3 text-[46px]" />
            </div>
            <div className="pb-1 text-right text-[12px] leading-relaxed text-ink-2">
              цель {durationRu(target)}
              <br />
              {duration >= target ? `+${durationRu(duration - target)}` : `−${durationRu(target - duration)}`}
            </div>
          </div>
        </div>

        <Field label="Утро">
          <div className="flex gap-2">
            {days.map((d) => (
              <Chip key={d} active={day === d} onClick={() => setDay(d)} className="flex-1 justify-center">
                {relativeDay(d)}
              </Chip>
            ))}
          </div>
          {exists && <p className="mt-2 text-[12px] text-ink-3">Запись за это утро уже есть, она будет заменена.</p>}
        </Field>

        <Field label="Время">
          <div className="flex gap-3">
            <TimeField label="Отбой" value={bedtime} onChange={setBedtime} />
            <TimeField label="Подъём" value={wakeTime} onChange={setWakeTime} />
          </div>
        </Field>

        <Field label="Бодрость утром" hint={`${qualityLabel(quality)} · ${quality}`}>
          <Slider
            label="Бодрость утром"
            value={quality}
            onChange={setQuality}
            track="linear-gradient(90deg,#5b4bd6,#3aa0e8 35%,#3ecf8e 62%,#d9f24a)"
          />
        </Field>

        <Field label="Пробуждения">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] text-ink-2">Сколько раз просыпались ночью</span>
            <Stepper label="Пробуждения" value={awakenings} onChange={setAwakenings} max={9} />
          </div>
        </Field>

        <Field label="Что повлияло">
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const on = tags.includes(t)
              return (
                <Chip key={t} active={on} onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}>
                  {t}
                </Chip>
              )
            })}
          </div>
        </Field>

        <Field label="Заметка">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={160}
            placeholder="Что запомнилось об этой ночи"
            className={cn("glass w-full resize-none rounded-[22px] px-4 py-3 text-[15px] outline-none placeholder:text-ink-3")}
          />
        </Field>
      </div>
      <footer className="border-t border-hair px-6 pb-[max(var(--safe-bottom),20px)] pt-4">
        <Button className="w-full" onClick={save}>
          Сохранить ночь
        </Button>
      </footer>
    </>
  )
}

export function SleepSheet() {
  const { sheet, openSheet, clearNightStart } = useStore()
  const close = () => {
    clearNightStart()
    openSheet(null)
  }
  return (
    <Sheet open={sheet === "sleep"} onClose={close} title="Запись сна" description="Минута утром: когда легли, когда встали и как себя чувствуете" form>
      <SleepForm onDone={() => openSheet(null)} />
    </Sheet>
  )
}
