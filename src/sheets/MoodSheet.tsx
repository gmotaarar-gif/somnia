import * as React from "react"
import { moodPct } from "@/lib/metrics"
import { getValenceLabel, sampleValencePalette } from "@/lib/valence"
import { useStore } from "@/store/store"
import { Button, Chip, Slider } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { Field, Sheet } from "@/ui/Sheet"

const EMOTIONS = {
  low: ["Тревога", "Усталость", "Напряжение", "Раздражение", "Грусть", "Апатия", "Одиночество"],
  mid: ["Спокойствие", "Рассеянность", "Задумчивость", "Скука", "Ровно", "Усталость"],
  high: ["Лёгкость", "Ясность", "Умиротворение", "Благодарность", "Вдохновение", "Уверенность", "Радость"],
}

export const FACTORS = ["Сон", "Работа", "Отдых", "Прогулка", "Спорт", "Семья", "Друзья", "Кофеин", "Еда", "Погода", "Здоровье"]

const rgb = (c: number[]) => `rgb(${c.join(" ")})`

function MoodForm({ onDone }: { onDone: () => void }) {
  const { addMood } = useStore()
  const [valence, setValence] = React.useState(0.3)
  const [emotions, setEmotions] = React.useState<string[]>([])
  const [factors, setFactors] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")

  const pal = sampleValencePalette(valence)
  const pool = valence < -0.12 ? EMOTIONS.low : valence < 0.3 ? EMOTIONS.mid : EMOTIONS.high
  const list = [...new Set([...emotions, ...pool])]
  const toggle = (arr: string[], set: (v: string[]) => void, v: string, max: number) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : arr.length < max ? [...arr, v] : arr)

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
        <div
          className="card"
          data-r="md"
          style={{
            background: `radial-gradient(120% 62% at 50% 46%, #050506 0%, rgb(5 5 6 / 0.82) 34%, rgb(5 5 6 / 0.3) 68%, transparent 100%), linear-gradient(180deg, ${rgb(pal.outer)}, ${rgb(pal.mid)})`,
            transition: "background 0.25s",
          }}
        >
          <div className="flex flex-col items-center px-5 pb-6 pt-7">
            <div
              className="size-[92px] rounded-full"
              style={{
                background: `radial-gradient(circle at 36% 30%, ${rgb(pal.core)}, ${rgb(pal.mid)} 46%, ${rgb(pal.outer)} 100%)`,
                boxShadow: `0 0 60px -6px ${rgb(pal.mid)}, inset 0 -10px 24px rgb(0 0 0 / 0.25)`,
                scale: String(0.86 + (valence + 1) * 0.1),
                transition: "scale 0.35s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
            <Dots value={`${moodPct(valence)}%`} still className="mt-6 text-[34px]" />
            <div className="mt-3 text-[17px] font-semibold tracking-[-0.01em]">{getValenceLabel(valence)}</div>
          </div>
        </div>

        <div className="mt-5">
          <Slider
            label="Насколько приятно ваше состояние"
            value={Math.round(valence * 100)}
            min={-100}
            max={100}
            onChange={(v) => setValence(v / 100)}
            track="linear-gradient(90deg,#622ed7,#2563eb 28%,#14948a 50%,#5fa830 71%,#ea761c)"
          />
          <div className="mt-1 flex justify-between text-[12px] text-ink-3">
            <span>Неприятно</span>
            <span>Приятно</span>
          </div>
        </div>

        <Field label="Что чувствуете" hint={`${emotions.length} из 3`}>
          <div className="flex flex-wrap gap-2">
            {list.map((e) => (
              <Chip key={e} active={emotions.includes(e)} onClick={() => toggle(emotions, setEmotions, e, 3)}>
                {e}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Что повлияло">
          <div className="flex flex-wrap gap-2">
            {FACTORS.map((f) => (
              <Chip key={f} active={factors.includes(f)} onClick={() => toggle(factors, setFactors, f, 5)}>
                {f}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Заметка">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Пара слов о моменте"
            className="glass w-full resize-none rounded-[22px] px-4 py-3 text-[15px] outline-none placeholder:text-ink-3"
          />
        </Field>
      </div>
      <footer className="border-t border-hair px-6 pb-[max(var(--safe-bottom),20px)] pt-4">
        <Button
          className="w-full"
          onClick={() => {
            addMood({ valence, emotions, factors, note: note.trim() || undefined })
            onDone()
          }}
        >
          Сохранить чек-ин
        </Button>
      </footer>
    </>
  )
}

export function MoodSheet() {
  const { sheet, openSheet } = useStore()
  const close = () => openSheet(null)
  return (
    <Sheet open={sheet === "mood"} onClose={close} title="Как вы сейчас?" description="Отметьте состояние: это занимает 20 секунд" form>
      <MoodForm onDone={close} />
    </Sheet>
  )
}
