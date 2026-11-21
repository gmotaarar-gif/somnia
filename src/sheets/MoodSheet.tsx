import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/cn"
import BlurText from "@/ui/BlurText"
import { screenVariants } from "@/lib/motion"
import { getValenceLabel, sampleValencePalette } from "@/lib/valence"
import { useStore } from "@/store/store"
import { Button, Chip, IconButton, Slider } from "@/ui/controls"
import { usePrefersReducedMotion } from "@/ui/MotionProvider"
import { EmotionField } from "@/ui/EmotionField"
import { MoodOrb } from "@/ui/MoodOrb"
import { Sheet } from "@/ui/Sheet"

const EMOTIONS = {
  low: ["Тревога", "Усталость", "Напряжение", "Раздражение", "Грусть", "Апатия", "Одиночество"],
  mid: ["Спокойствие", "Рассеянность", "Задумчивость", "Скука", "Ровно", "Усталость"],
  high: ["Лёгкость", "Ясность", "Умиротворение", "Благодарность", "Вдохновение", "Уверенность", "Радость"],
}

export const FACTORS = ["Сон", "Работа", "Отдых", "Прогулка", "Спорт", "Семья", "Друзья", "Кофеин", "Еда", "Погода", "Здоровье"]

const STEPS = [
  { id: "state", title: "Как вы себя чувствуете прямо сейчас?" },
  { id: "feelings", title: "Что лучше всего описывает это чувство?", hint: "Отпустите шар на чувстве, можно до трёх" },
  { id: "causes", title: "Что влияет на вас сильнее всего?", hint: "Можно выбрать до пяти" },
  { id: "note", title: "Хотите добавить пару слов?", hint: "Необязательно" },
] as const
const LAST = STEPS.length - 1
/** How long «Записано» stays before the sheet leaves by itself. */
const DONE_MS = 1500

const rgb = (c: number[]) => `rgb(${c.join(" ")})`

function Choices({ label, options, chosen, max, onChange }: {
  label: string
  options: string[]
  chosen: string[]
  max: number
  onChange: (next: string[]) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap justify-center gap-2">
      {options.map((option) => {
        const on = chosen.includes(option)
        return (
          <Chip
            key={option}
            active={on}
            onClick={() => onChange(on ? chosen.filter((x) => x !== option) : chosen.length < max ? [...chosen, option] : chosen)}
            className="h-11 px-[18px] text-[15px]"
          >
            {option}
          </Chip>
        )
      })}
    </div>
  )
}

function Progress({ step, done }: { step: number; done: boolean }) {
  return (
    <div role="img" aria-label={done ? "Чек-ин записан" : `Шаг ${step + 1} из ${STEPS.length}`} className="relative flex gap-[14px]">
      {STEPS.map((s, i) => (
        <span key={s.id} className={cn("size-1.5 rounded-full transition-colors duration-250", done || i < step ? "bg-lime" : "bg-white/25")} />
      ))}
      <span
        className={cn("absolute left-0 top-0 h-1.5 w-[22px] rounded-full bg-lime transition-[translate,opacity] duration-250 ease-out-smooth", done && "opacity-0")}
        style={{ translate: `${step * 20 - 8}px 0` }}
      />
    </div>
  )
}

/** The chosen state, kept in sight while it is being described. */
function Chosen({ valence }: { valence: number }) {
  return (
    <>
      <div className="flex justify-center [&_svg]:size-[92px]">
        <MoodOrb valence={valence} />
      </div>
      <div className="mt-1 text-center text-[15px] text-white/70">{getValenceLabel(valence)}</div>
    </>
  )
}

function Question({ step, className }: { step: number; className?: string }) {
  const { title } = STEPS[step]
  const hint = "hint" in STEPS[step] ? (STEPS[step] as { hint: string }).hint : null
  return (
    <div className={cn("px-3 text-center", className)}>
      <h2 className="text-[22px] font-medium leading-[1.2] tracking-[-0.03em] [text-wrap:balance]">{title}</h2>
      {hint && <p className="mt-2 text-[13px] text-white/55">{hint}</p>}
    </div>
  )
}

function MoodFlow({ onDone }: { onDone: () => void }) {
  const { addMood, toast } = useStore()
  const reduce = usePrefersReducedMotion()
  const [step, setStep] = React.useState(0)
  const [dir, setDir] = React.useState(1)
  const [valence, setValence] = React.useState(0.3)
  const [emotions, setEmotions] = React.useState<string[]>([])
  const [factors, setFactors] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")
  // The toast on show when the check-in was handed over: a newer error is this save failing.
  const [saved, setSaved] = React.useState<{ toast: number | undefined } | null>(null)
  const held = React.useRef<{ x: number; valence: number; width: number } | null>(null)

  const failed = saved !== null && toast?.variant === "error" && toast.id !== saved.toast
  const done = saved !== null && !failed
  React.useLayoutEffect(() => {
    if (failed) onDone()
  }, [failed, onDone])
  React.useEffect(() => {
    if (!done) return
    const id = window.setTimeout(onDone, DONE_MS)
    return () => window.clearTimeout(id)
  }, [done, onDone])

  const pool = valence < -0.12 ? EMOTIONS.low : valence < 0.3 ? EMOTIONS.mid : EMOTIONS.high
  // A chosen feeling stays on offer after the state moves away from it, after the ones that fit.
  const feelings = [...pool, ...emotions.filter((e) => !pool.includes(e))]
  const go = (to: number) => {
    setDir(to > step ? 1 : -1)
    setStep(to)
  }
  const next = () => {
    if (step < LAST) return go(step + 1)
    setDir(1)
    setSaved({ toast: toast?.id })
    addMood({ valence, emotions, factors, note: note.trim() || undefined })
  }

  const view = done ? (
    <div role="status" className="flex min-h-0 flex-1 flex-col items-center justify-center pb-16">
      <div className="relative">
        <div className="[&_svg]:size-[168px]">
          <MoodOrb valence={valence} />
        </div>
        <motion.span
          className="absolute inset-0 grid place-items-center"
          initial={reduce ? false : { opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0, delay: 0.1 }}
        >
          <Check className="size-12 drop-shadow-[0_1px_8px_rgb(0_0_0/0.35)]" strokeWidth={2.5} />
        </motion.span>
      </div>
      <BlurText text="Записано" trigger="load" effect="focus" animateBy="letters" delay={35} className="mt-7 text-[26px] font-medium leading-tight tracking-[-0.03em]" />
      <div className="mt-2 text-[14px] text-white/60">{getValenceLabel(valence)}</div>
    </div>
  ) : step === 0 ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <Question step={0} className="mx-5" />
      {/* The whole stage is the control: carry the feeling left or right. The
          slider under it is the same value for keys and screen readers. */}
      <div
        data-mood-stage
        className="flex min-h-0 flex-1 cursor-grab touch-pan-y select-none flex-col items-center justify-center active:cursor-grabbing"
        onPointerDown={(event) => {
          try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* a scripted pointer */ }
          held.current = { x: event.clientX, valence, width: event.currentTarget.getBoundingClientRect().width || 1 }
        }}
        onPointerMove={(event) => {
          const from = held.current
          if (!from) return
          const to = from.valence + ((event.clientX - from.x) / from.width) * 2
          setValence(Math.round(Math.max(-1, Math.min(1, to)) * 100) / 100)
        }}
        onPointerUp={() => { held.current = null }}
        onPointerCancel={() => { held.current = null }}
      >
        <div className="[&_svg]:size-[184px]">
          <MoodOrb valence={valence} />
        </div>
        <div className="mt-7 text-center text-[28px] font-medium leading-tight tracking-[-0.04em]">{getValenceLabel(valence)}</div>
      </div>
      <div className="px-6 pb-3">
        <Slider
          label="Насколько приятно ваше состояние"
          value={Math.round(valence * 100)}
          min={-100}
          max={100}
          onChange={(v) => setValence(v / 100)}
          track="linear-gradient(90deg,#622ed7,#2563eb 28%,#14948a 50%,#5fa830 71%,#ea761c)"
        />
        <div className="mt-1 flex justify-between text-[11px] uppercase tracking-[0.06em] text-white/55">
          <span>Очень неприятно</span>
          <span>Очень приятно</span>
        </div>
      </div>
    </div>
  ) : (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-4">
      <div className="my-auto">
        {step === 1 ? (
          <>
            <Question step={1} />
            <div className="mt-5">
              <EmotionField
                options={feelings}
                chosen={emotions}
                onPick={(e) => setEmotions(emotions.includes(e) || emotions.length >= 3 ? emotions : [...emotions, e])}
              />
            </div>
          </>
        ) : (
          <>
            <Chosen valence={valence} />
            <Question step={step} className="mt-6" />
          </>
        )}
        <div className={step === 1 ? "mt-5" : "mt-7"}>
          {step === 1 && <Choices label="Что чувствуете" options={feelings} chosen={emotions} max={3} onChange={setEmotions} />}
          {step === 2 && <Choices label="Что повлияло" options={FACTORS} chosen={factors} max={5} onChange={setFactors} />}
          {step === 3 && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={200}
              aria-label="Заметка"
              placeholder="Пара слов о моменте"
              className="glass w-full resize-none rounded-[24px] px-4 py-3.5 text-[16px] placeholder:text-ink-3"
            />
          )}
        </div>
      </div>
    </div>
  )
  const key = done ? "done" : STEPS[step].id

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" style={{ "--mood": rgb(sampleValencePalette(valence).mid) } as React.CSSProperties}>
      <div className="mood-glow" aria-hidden />
      <div className="relative flex h-[76px] shrink-0 items-center justify-center pt-1">
        {step > 0 && !done && (
          <IconButton label="Назад" size="sm" className="absolute left-5 size-9" onClick={() => go(step - 1)}>
            <ChevronLeft />
          </IconButton>
        )}
        <Progress step={step} done={done} />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {reduce ? (
          <div key={key} className="flex min-h-0 flex-1 flex-col">{view}</div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={key}
              custom={dir}
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex min-h-0 flex-1 flex-col"
            >
              {view}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      {!done && (
        <footer className="relative shrink-0 px-5 pb-[max(var(--safe-bottom),20px)] pt-3">
          <Button className="h-14 w-full" onClick={next}>
            {step === LAST ? "Сохранить чек-ин" : "Далее"}
          </Button>
        </footer>
      )}
    </div>
  )
}

export function MoodSheet() {
  const { sheet, openSheet } = useStore()
  const close = React.useCallback(() => openSheet(null), [openSheet])
  return (
    <Sheet open={sheet === "mood"} onClose={close} title="Чек-ин состояния" bare className="on-dark bg-[#19191c]">
      <MoodFlow onDone={close} />
    </Sheet>
  )
}
