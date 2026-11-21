import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Moon, PenLine, Sun } from "lucide-react"
import { cn } from "@/lib/cn"
import { qualityLabel } from "@/lib/metrics"
import { DUR, EASE_OUT } from "@/lib/motion"
import { dateKey, daysAgo, durationRu, hm, relativeDay, shiftTime, spanMinutes, timeToMinutes } from "@/lib/time"
import { useStore } from "@/store/store"
import { Card } from "@/ui/Card"
import { Button, Chip, Slider, Stepper } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { Sheet } from "@/ui/Sheet"

const TAG_GROUPS = [
  { label: "Помогло", tags: ["Быстро уснул", "Глубокий сон", "Проснулся сам", "Яркие сны", "Прохладно"] },
  { label: "Мешало", tags: ["Поздний экран", "Кофеин", "Стресс", "Шум", "Алкоголь", "Поздний ужин"] },
]

const nowHHMM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function SleepForm({ onDone }: { onDone: () => void }) {
  const { addNight, bedGoal, wakeGoal, nightStart, clearNightStart, nights, notify } = useStore()
  const days = React.useMemo(() => [0, 1, 2].map((n) => dateKey(daysAgo(n))), [])
  const [day, setDay] = React.useState(days[0])
  const [bedtime, setBedtime] = React.useState(nightStart ?? bedGoal)
  const [wakeTime, setWakeTime] = React.useState(nightStart ? nowHHMM() : wakeGoal)
  const [quality, setQuality] = React.useState(75)
  const [awakenings, setAwakenings] = React.useState(0)
  const [tags, setTags] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")
  const [noteOpen, setNoteOpen] = React.useState(false)

  const inBed = bedtime === wakeTime ? 0 : spanMinutes(bedtime, wakeTime)
  const duration = Math.max(0, inBed - awakenings * 8)
  const target = spanMinutes(bedGoal, wakeGoal)
  const exists = nights.some((n) => n.dateKey === day)

  const save = () => {
    addNight({ dateKey: day, bedtime, wakeTime, durationMin: duration, quality, awakenings, tags, note: note.trim() || undefined })
    clearNightStart()
    notify("Ночь записана")
    onDone()
  }

  const diff = duration - target
  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <div className="flex gap-2" role="group" aria-label="Утро">
          {days.map((d) => (
            <Chip key={d} active={day === d} onClick={() => setDay(d)} className="flex-1 justify-center">
              {relativeDay(d)}
            </Chip>
          ))}
        </div>
        {exists && <p className="mt-2.5 px-1 text-[12px] text-ink-3">Запись за это утро уже есть, она будет заменена.</p>}

        <Card tone="night" r="lg" className="mt-4">
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] text-white/72">Вы спали</span>
              <span className={cn("rounded-full px-3 py-1.5 text-[12px] font-medium", diff >= 0 ? "bg-lime text-lime-ink" : "bg-black/30 text-white/80")}>
                {diff === 0 ? "Ровно в цель" : diff > 0 ? `+${durationRu(diff)} к цели` : `${durationRu(-diff)} до цели`}
              </span>
            </div>
            <Dots value={hm(duration)} shape="square" still className="mt-7 text-[68px]" />
            <NightSpan bedtime={bedtime} inBed={inBed} />
          </div>
        </Card>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <TimeTile label="Отбой" icon={<Moon />} value={bedtime} onChange={setBedtime} />
          <TimeTile label="Подъём" icon={<Sun />} value={wakeTime} onChange={setWakeTime} />
        </div>

        <section className="glass mt-3 rounded-[30px] p-5" aria-label="Бодрость утром">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13px] text-ink-3">Бодрость утром</div>
              <div className="mt-1.5 truncate text-[22px] font-semibold tracking-[-0.03em]">{qualityLabel(quality)}</div>
            </div>
            <Dots value={String(quality)} still className="mb-1 shrink-0 text-[30px]" />
          </div>
          <Slider
            label="Бодрость утром"
            value={quality}
            onChange={setQuality}
            track="linear-gradient(90deg,#5b4bd6,#3aa0e8 35%,#3ecf8e 62%,#d9f24a)"
            className="mt-4"
          />
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-hair pt-4">
            <span className="text-[15px]">Просыпались ночью</span>
            <Stepper label="Пробуждения" value={awakenings} onChange={setAwakenings} max={9} />
          </div>
        </section>

        <section className="mt-7 px-1" aria-label="Что повлияло">
          <h3 className="text-[19px] font-semibold tracking-[-0.03em]">Что повлияло</h3>
          {TAG_GROUPS.map((g) => (
            <div key={g.label} className="mt-4">
              <div className="mb-2.5 text-[12px] text-ink-3">{g.label}</div>
              <div className="flex flex-wrap gap-2">
                {g.tags.map((t) => (
                  <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </section>

        <AnimatePresence initial={false} mode="wait">
          {noteOpen ? (
            <motion.textarea
              key="note"
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={160}
              aria-label="Заметка"
              placeholder="Что запомнилось об этой ночи"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.fast, ease: EASE_OUT }}
              className="glass mt-6 w-full resize-none rounded-[24px] px-4 py-3.5 text-[15px] outline-none placeholder:text-ink-3"
            />
          ) : (
            <button
              key="add"
              type="button"
              onClick={() => setNoteOpen(true)}
              className="press glass mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] text-ink-2"
            >
              <PenLine className="size-4" /> Добавить заметку
            </button>
          )}
        </AnimatePresence>
      </div>
      <footer className="border-t border-hair px-5 pb-[max(var(--safe-bottom),20px)] pt-4">
        <Button className="w-full" onClick={save} disabled={duration === 0}>
          Сохранить ночь
        </Button>
      </footer>
    </>
  )
}

const SPAN_START = 18 * 60
const SPAN_DOTS = 48

/** The night on a dotted 24-hour line that starts at 18:00. */
function NightSpan({ bedtime, inBed }: { bedtime: string; inBed: number }) {
  const from = (timeToMinutes(bedtime) - SPAN_START + 1440) % 1440
  return (
    <div className="mt-7" aria-hidden>
      <div className="flex items-center justify-between">
        {Array.from({ length: SPAN_DOTS }, (_, i) => {
          const t = i * 30
          const on = (t >= from && t < from + inBed) || (t + 1440 >= from && t + 1440 < from + inBed)
          return <span key={i} className={cn("rounded-full transition-all duration-250", on ? "h-3 w-[3px] bg-lime" : "size-[3px] bg-white/28")} />
        })}
      </div>
      <div className="mt-2.5 grid grid-cols-4 text-[11px] tabular-nums text-white/50">
        <span>18:00</span>
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
      </div>
    </div>
  )
}

function TimeTile({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void }) {
  return (
    <div className="glass rounded-[30px] p-4">
      <label className="relative block rounded-[18px] focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-lime">
        <span className="flex items-center gap-2 text-[13px] text-ink-3 [&_svg]:size-4">
          {icon} {label}
        </span>
        <span className="mt-3 block text-[34px] font-semibold leading-none tabular-nums tracking-[-0.04em]" aria-hidden>
          {value}
        </span>
        {/* Native picker stays invisible: the visible value is always 24-hour regardless of locale */}
        <input
          type="time"
          value={value}
          aria-label={label}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker()
            } catch {
              /* picker unavailable: typing still works */
            }
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[-15, 15].map((step) => (
          <button
            key={step}
            type="button"
            aria-label={`${label}: ${step < 0 ? "раньше" : "позже"} на 15 минут`}
            onClick={() => onChange(shiftTime(value, step))}
            className="press glass-inset h-10 rounded-full text-[13px] font-medium tabular-nums"
          >
            {step < 0 ? "−15" : "+15"}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SleepSheet() {
  const { sheet, openSheet, clearNightStart } = useStore()
  const close = () => {
    clearNightStart()
    openSheet(null)
  }
  return (
    <Sheet open={sheet === "sleep"} onClose={close} title="Запись сна" description="Минута утром, остальное посчитаем сами" form>
      <SleepForm onDone={() => openSheet(null)} />
    </Sheet>
  )
}
