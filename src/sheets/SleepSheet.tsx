import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { PenLine } from "lucide-react"
import { cn } from "@/lib/cn"
import { qualityLabel } from "@/lib/metrics"
import { DUR, EASE_OUT } from "@/lib/motion"
import { dateKey, daysAgo, durationRu, hm, relativeDay, spanMinutes } from "@/lib/time"
import { useStore, type SleepNight } from "@/store/store"
import { Card } from "@/ui/Card"
import { Button, Chip, Segmented, Stepper } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { NightLine } from "@/ui/NightLine"
import { Sheet } from "@/ui/Sheet"
import { TimeScrubber } from "@/ui/TimeScrubber"
import PeekRating from "@/ui/PeekRating"

const TAG_GROUPS = [
  { label: "Помогло", tags: ["Быстро уснул", "Глубокий сон", "Проснулся сам", "Яркие сны", "Прохладно"] },
  { label: "Мешало", tags: ["Поздний экран", "Кофеин", "Стресс", "Шум", "Алкоголь", "Поздний ужин"] },
]

/** Five answers to "how do you feel this morning", each the middle of the
 * range `qualityLabel` names. */
const ENERGY = [
  { value: 25, color: "#7c6cf0" },
  { value: 46, color: "#4aa3ea" },
  { value: 63, color: "#3ecf8e" },
  { value: 79, color: "#a6e05a" },
  { value: 94, color: "#d9f24a" },
]
const energyLevel = (quality: number) => ENERGY.findIndex((level, i) => i === ENERGY.length - 1 || qualityLabel(level.value) === qualityLabel(quality))

type Draft = Pick<SleepNight, "bedtime" | "wakeTime" | "quality" | "awakenings" | "tags"> & { note: string }

const nowHHMM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function SleepForm({ onDone }: { onDone: () => void }) {
  const { addNight, bedGoal, wakeGoal, nightStart, clearNightStart, nights, notify } = useStore()
  const days = React.useMemo(() => [0, 1, 2].map((n) => dateKey(daysAgo(n))), [])
  // A morning that already has a night opens that night, to be corrected
  // rather than silently replaced by the usual hours.
  const draftFor = (key: string, tracked: string | null): Draft => {
    const saved = tracked ? undefined : nights.find((n) => n.dateKey === key)
    if (saved) return { bedtime: saved.bedtime, wakeTime: saved.wakeTime, quality: saved.quality, awakenings: saved.awakenings, tags: saved.tags, note: saved.note ?? "" }
    return { bedtime: tracked ?? bedGoal, wakeTime: tracked ? nowHHMM() : wakeGoal, quality: 75, awakenings: 0, tags: [], note: "" }
  }
  const [day, setDay] = React.useState(days[0])
  const [draft, setDraft] = React.useState(() => draftFor(days[0], nightStart))
  const [noteOpen, setNoteOpen] = React.useState(() => draft.note !== "")
  const { bedtime, wakeTime, quality, awakenings, tags, note } = draft
  const edit = (change: Partial<Draft>) => setDraft((current) => ({ ...current, ...change }))

  const inBed = bedtime === wakeTime ? 0 : spanMinutes(bedtime, wakeTime)
  const duration = Math.max(0, inBed - awakenings * 8)
  const diff = duration - spanMinutes(bedGoal, wakeGoal)
  const exists = nights.some((n) => n.dateKey === day)
  const level = energyLevel(quality)

  const pickDay = (key: string) => {
    const next = draftFor(key, null)
    setDay(key)
    setDraft(next)
    setNoteOpen(next.note !== "")
  }
  const save = () => {
    addNight({ dateKey: day, bedtime, wakeTime, durationMin: duration, quality, awakenings, tags, note: note.trim() || undefined })
    clearNightStart()
    notify(exists ? "Ночь обновлена" : "Ночь записана")
    onDone()
  }

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <Segmented
          id="sleep-day"
          label="Утро"
          className="flex w-full"
          value={day}
          onChange={pickDay}
          options={days.map((key) => ({ value: key, label: relativeDay(key) }))}
        />

        <Card tone="night" r="lg" className="mt-3">
          <div className="px-6 pb-2 pt-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] text-white/72">Вы спали</span>
              <span className={cn("rounded-full px-3 py-1.5 text-[12px] font-medium", diff >= 0 ? "bg-lime text-lime-ink" : "bg-black/30 text-white/80")}>
                {diff === 0 ? "Ровно в цель" : diff > 0 ? `+${durationRu(diff)} к цели` : `${durationRu(-diff)} до цели`}
              </span>
            </div>
            <Dots value={hm(duration)} shape="square" still className="mt-6 text-[60px]" />
            <NightLine className="mt-8" bedtime={bedtime} wakeTime={wakeTime} goal={{ bed: bedGoal, wake: wakeGoal }} />
            <div className="mt-5 divide-y divide-white/10 border-t border-white/10">
              <TimeScrubber label="Отбой" value={bedtime} onChange={(v) => edit({ bedtime: v })} className="night-ruler" />
              <TimeScrubber label="Подъём" value={wakeTime} onChange={(v) => edit({ wakeTime: v })} className="night-ruler" />
            </div>
          </div>
        </Card>
        {exists && <p className="mt-2.5 px-1 text-[12px] text-ink-3">За это утро уже есть запись: вы её исправляете.</p>}

        <section className="glass mt-3 rounded-[30px] p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3 id="sleep-energy" className="text-[13px] text-ink-3">Бодрость утром</h3>
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{qualityLabel(quality)}</span>
          </div>
          <div className="mt-2 flex justify-center">
            <PeekRating
              shape="bolt"
              count={ENERGY.length}
              value={level + 1}
              onChange={(v) => edit({ quality: ENERGY[v - 1].value })}
              labels={ENERGY.map((option) => qualityLabel(option.value))}
              ariaLabelledBy="sleep-energy"
              allowClear={false}
              size={34}
              lift={8}
              activeColor={ENERGY[level].color}
              idleColor="color-mix(in srgb, var(--color-ink) 16%, transparent)"
              tipColor="var(--color-white)"
              tipTextColor="var(--color-black)"
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-hair pt-4">
            <span className="text-[15px]">Просыпались ночью</span>
            <Stepper label="Пробуждения" value={awakenings} onChange={(v) => edit({ awakenings: v })} max={9} />
          </div>
        </section>

        <section className="mt-7 px-1" aria-label="Что повлияло">
          <h3 className="text-[19px] font-semibold tracking-[-0.03em]">Что повлияло</h3>
          {TAG_GROUPS.map((group) => (
            <div key={group.label} className="mt-4">
              <div className="mb-2.5 text-[12px] text-ink-3">{group.label}</div>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => (
                  <Chip key={tag} active={tags.includes(tag)} onClick={() => edit({ tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag] })}>
                    {tag}
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
              autoFocus={note === ""}
              value={note}
              onChange={(e) => edit({ note: e.target.value })}
              rows={3}
              maxLength={160}
              aria-label="Заметка"
              placeholder="Что запомнилось об этой ночи"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.fast, ease: EASE_OUT }}
              className="glass mt-6 w-full resize-none rounded-[24px] px-4 py-3.5 text-[16px] outline-none placeholder:text-ink-3"
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
          {exists ? "Обновить ночь" : "Сохранить ночь"}
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
    <Sheet open={sheet === "sleep"} onClose={close} title="Запись сна" description="Минута утром, остальное посчитаем сами" form>
      <SleepForm onDone={() => openSheet(null)} />
    </Sheet>
  )
}
