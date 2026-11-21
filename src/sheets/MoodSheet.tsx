import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/cn"
import { moodPct } from "@/lib/metrics"
import { DUR, EASE_OUT } from "@/lib/motion"
import { getValenceLabel, sampleValencePalette } from "@/lib/valence"
import { useStore } from "@/store/store"
import { Button, Chip, Slider } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { MoodOrb } from "@/ui/MoodOrb"
import { Sheet } from "@/ui/Sheet"

const EMOTIONS = {
  low: ["Тревога", "Усталость", "Напряжение", "Раздражение", "Грусть", "Апатия", "Одиночество"],
  mid: ["Спокойствие", "Рассеянность", "Задумчивость", "Скука", "Ровно", "Усталость"],
  high: ["Лёгкость", "Ясность", "Умиротворение", "Благодарность", "Вдохновение", "Уверенность", "Радость"],
}

export const FACTORS = ["Сон", "Работа", "Отдых", "Прогулка", "Спорт", "Семья", "Друзья", "Кофеин", "Еда", "Погода", "Здоровье"]

const rgb = (c: number[]) => `rgb(${c.join(" ")})`

const swap = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: DUR.fast, ease: EASE_OUT },
}

function MoodForm({ onDone }: { onDone: () => void }) {
  const { addMood, notify } = useStore()
  const [step, setStep] = React.useState<0 | 1>(0)
  const [valence, setValence] = React.useState(0.3)
  const [emotions, setEmotions] = React.useState<string[]>([])
  const [factors, setFactors] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")

  const pal = sampleValencePalette(valence)
  const pool = valence < -0.12 ? EMOTIONS.low : valence < 0.3 ? EMOTIONS.mid : EMOTIONS.high
  const list = [...new Set([...emotions, ...pool])]
  const toggle = (arr: string[], set: (v: string[]) => void, v: string, max: number) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : arr.length < max ? [...arr, v] : arr)
  const save = () => {
    addMood({ valence, emotions, factors, note: note.trim() || undefined })
    notify("Чек-ин сохранён")
    onDone()
  }

  return (
    <>
      <div className="flex gap-1.5 px-5 pb-4" role="img" aria-label={`Шаг ${step + 1} из 2`}>
        {[0, 1].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-250", i <= step ? "bg-white/85" : "bg-white/14")} />
        ))}
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 ? (
            <motion.div key="state" {...swap}>
              <div
                className="card"
                data-r="lg"
                style={{
                  background: `radial-gradient(120% 58% at 50% 42%, #050506 0%, rgb(5 5 6 / 0.82) 34%, rgb(5 5 6 / 0.3) 68%, transparent 100%), linear-gradient(180deg, ${rgb(pal.outer)}, ${rgb(pal.mid)})`,
                  transition: "background 0.25s",
                }}
              >
                <div className="flex flex-col items-center px-5 pb-7 pt-12">
                  <div className="scale-[1.2]">
                    <MoodOrb valence={valence} />
                  </div>
                  <div className="mt-12 text-center text-[28px] font-semibold leading-tight tracking-[-0.04em]">{getValenceLabel(valence)}</div>
                  <Dots value={`${moodPct(valence)}%`} still className="mt-4 text-[26px] text-white/80" />
                </div>
              </div>

              <div className="glass mt-3 rounded-[30px] px-4 pb-4 pt-3">
                <Slider
                  label="Насколько приятно ваше состояние"
                  value={Math.round(valence * 100)}
                  min={-100}
                  max={100}
                  onChange={(v) => setValence(v / 100)}
                  track="linear-gradient(90deg,#622ed7,#2563eb 28%,#14948a 50%,#5fa830 71%,#ea761c)"
                />
                <div className="mt-1 flex justify-between px-1 text-[12px] text-ink-3">
                  <span>Неприятно</span>
                  <span>Приятно</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="details" {...swap}>
              <button
                type="button"
                onClick={() => setStep(0)}
                aria-label={`Изменить состояние: ${getValenceLabel(valence)}`}
                className="press glass flex w-full items-center gap-3.5 rounded-[26px] p-3 pr-4 text-left"
              >
                <span
                  className="size-11 shrink-0 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.4)]"
                  style={{ background: `radial-gradient(circle at 38% 30%, ${rgb(pal.core)}, ${rgb(pal.mid)} 55%, ${rgb(pal.outer)})` }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium">{getValenceLabel(valence)}</span>
                  <span className="mt-0.5 block text-[12px] text-ink-3">{moodPct(valence)}% · изменить</span>
                </span>
                <ChevronLeft className="size-5 shrink-0 text-ink-3" />
              </button>

              <section className="mt-7 px-1" aria-label="Что чувствуете">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[19px] font-semibold tracking-[-0.03em]">Что чувствуете</h3>
                  <span className="text-[13px] tabular-nums text-ink-3">{emotions.length} из 3</span>
                </div>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {list.map((e) => (
                    <Chip key={e} active={emotions.includes(e)} onClick={() => toggle(emotions, setEmotions, e, 3)} className="h-10 px-4 text-[14px]">
                      {e}
                    </Chip>
                  ))}
                </div>
              </section>

              <section className="mt-7 px-1" aria-label="Что повлияло">
                <h3 className="text-[19px] font-semibold tracking-[-0.03em]">Что повлияло</h3>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {FACTORS.map((f) => (
                    <Chip key={f} active={factors.includes(f)} onClick={() => toggle(factors, setFactors, f, 5)} className="h-10 px-4 text-[14px]">
                      {f}
                    </Chip>
                  ))}
                </div>
              </section>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={200}
                aria-label="Заметка"
                placeholder="Пара слов о моменте"
                className="glass mt-7 w-full resize-none rounded-[24px] px-4 py-3.5 text-[15px] outline-none placeholder:text-ink-3"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <footer className="border-t border-hair px-5 pb-[max(var(--safe-bottom),20px)] pt-4">
        {step === 0 ? (
          <div className="flex gap-2.5">
            <Button variant="glass" className="flex-1" onClick={save}>
              Сохранить
            </Button>
            <Button className="flex-1" onClick={() => setStep(1)}>
              Детали <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={save}>
            Сохранить чек-ин
          </Button>
        )}
      </footer>
    </>
  )
}

export function MoodSheet() {
  const { sheet, openSheet } = useStore()
  const close = () => openSheet(null)
  return (
    <Sheet open={sheet === "mood"} onClose={close} title="Как вы сейчас?" description="Двадцать секунд, чтобы заметить себя" form>
      <MoodForm onDone={close} />
    </Sheet>
  )
}
