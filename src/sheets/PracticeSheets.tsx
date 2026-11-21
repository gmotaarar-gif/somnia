import * as React from "react"
import { useSubscription } from "@/store/subscription"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Ear, Eye, Hand, Leaf, Pause, Play, Soup, Trash2, X } from "lucide-react"
import { cn } from "@/lib/cn"
import { DUR, EASE_OUT } from "@/lib/motion"
import { relativeDay, dateKey } from "@/lib/time"
import { useStore } from "@/store/store"
import { Button, IconButton } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { Field, Sheet } from "@/ui/Sheet"
import { usePrefersReducedMotion } from "@/ui/MotionProvider"

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <IconButton label="Закрыть" size="sm" className="absolute right-5 top-6 z-10 size-9" onClick={onClose}>
      <X />
    </IconButton>
  )
}

/* ── Grounding 5-4-3-2-1 ────────────────────────────────────────── */

const SENSES = [
  { n: 5, icon: Eye, title: "вещей, которые видите", hint: "Назовите про себя цвет и форму каждой.", color: "#d9f24a" },
  { n: 4, icon: Hand, title: "ощущения в теле", hint: "Ткань одежды, опора под ногами, воздух на коже.", color: "#9fe8a0" },
  { n: 3, icon: Ear, title: "звука вокруг", hint: "Дальние, ближние и совсем тихие.", color: "#8fb6ff" },
  { n: 2, icon: Leaf, title: "запаха", hint: "Или два запаха, которые вам приятно вспомнить.", color: "#c4a3ff" },
  { n: 1, icon: Soup, title: "вкус", hint: "Что чувствуете во рту прямо сейчас.", color: "#ffb86b" },
]

function Grounding({ onDone }: { onDone: () => void }) {
  const { addSession, notify } = useStore()
  const [step, setStep] = React.useState(0)
  const [count, setCount] = React.useState(0)
  const s = SENSES[step]
  const Icon = s.icon

  const tap = () => {
    if (count + 1 < s.n) return setCount(count + 1)
    if (step + 1 < SENSES.length) {
      setStep(step + 1)
      setCount(0)
      return
    }
    addSession("grounding", 3)
    notify("Заземление завершено")
    onDone()
  }

  return (
    <div className="flex h-full flex-col items-center px-6 pb-[max(var(--safe-bottom),24px)] pt-12 text-center">
      <div className="flex w-full gap-1.5 pr-12">
        {SENSES.map((x, i) => (
          <span key={x.n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
            <span
              className="block h-full origin-left rounded-full bg-white transition-transform duration-500 ease-out-smooth"
              style={{ transform: `scaleX(${i < step ? 1 : i === step ? count / s.n : 0})` }}
            />
          </span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="flex flex-1 flex-col items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: DUR.medium, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: -16, transition: { duration: DUR.quick } }}
        >
          <motion.button
            type="button"
            onClick={tap}
            aria-label={`Отметить: ${count + 1} из ${s.n}`}
            whileTap={{ scale: 0.94 }}
            className="relative grid size-[210px] place-items-center rounded-full"
            style={{ background: `radial-gradient(circle at 35% 30%, #fff8, ${s.color} 38%, ${s.color}55 70%, transparent 72%)` }}
          >
            <span className="absolute inset-[-18px] rounded-full border border-dashed border-white/20" />
            <span style={{ color: "#10130a" }}>
              <Dots value={s.n - count} still className="text-[76px]" />
            </span>
          </motion.button>
          <div className="mt-9 flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em]">
            <Icon className="size-5 text-ink-2" /> {s.n} {s.title}
          </div>
          <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-ink-2">{s.hint}</p>
        </motion.div>
      </AnimatePresence>
      <p className="text-[13px] text-ink-3">Нажимайте на шар каждый раз, когда нашли ещё одно</p>
    </div>
  )
}

export function GroundingSheet() {
  const { sheet, openSheet } = useStore()
  return (
    <Sheet open={sheet === "grounding"} onClose={() => openSheet(null)} title="Заземление 5-4-3-2-1" bare>
      <CloseButton onClose={() => openSheet(null)} />
      <Grounding onDone={() => openSheet(null)} />
    </Sheet>
  )
}

/* ── Body scan ──────────────────────────────────────────────────── */

const BODY = [
  { part: "Стопы и голени", text: "Почувствуйте вес ног. Отпустите пальцы, пятки, икры.", y: 88 },
  { part: "Бёдра и таз", text: "Пусть опора держит вас. Ничего не нужно удерживать.", y: 66 },
  { part: "Живот и грудь", text: "Живот мягко поднимается и опускается сам.", y: 46 },
  { part: "Плечи и руки", text: "Плечи вниз, ладони тяжёлые и тёплые.", y: 32 },
  { part: "Шея и лицо", text: "Разожмите челюсть, расслабьте лоб и глаза.", y: 12 },
]
const STEP_SEC = 36

function BodyScan({ onDone }: { onDone: () => void }) {
  const reduce = usePrefersReducedMotion()
  const { addSession, notify } = useStore()
  const [sec, setSec] = React.useState(0)
  const [running, setRunning] = React.useState(false)
  const total = BODY.length * STEP_SEC
  const step = Math.min(BODY.length - 1, Math.floor(sec / STEP_SEC))

  React.useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setSec((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  React.useEffect(() => {
    if (sec < total) return
    addSession("bodyscan", Math.round(total / 60))
    notify("Сканирование тела завершено")
    onDone()
  }, [sec, total, addSession, notify, onDone])

  const left = total - sec
  return (
    <div className="flex h-full flex-col items-center px-6 pb-[max(var(--safe-bottom),24px)] pt-12 text-center">
      <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-3">Шаг {step + 1} из {BODY.length}</div>
      <div className="relative mt-5 h-[300px] w-[150px]">
        <svg viewBox="0 0 100 200" className="size-full" aria-hidden>
          <g fill="rgb(255 255 255 / 0.1)" stroke="rgb(255 255 255 / 0.22)" strokeWidth="0.8">
            <circle cx="50" cy="20" r="13" />
            <rect x="30" y="38" width="40" height="62" rx="14" />
            <rect x="14" y="42" width="12" height="62" rx="6" />
            <rect x="74" y="42" width="12" height="62" rx="6" />
            <rect x="32" y="104" width="15" height="88" rx="7.5" />
            <rect x="53" y="104" width="15" height="88" rx="7.5" />
          </g>
        </svg>
        <motion.span
          key={String(reduce)}
          className="absolute left-1/2 size-[130px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgb(217 242 74 / 0.75), rgb(217 242 74 / 0) 68%)" }}
          animate={{ top: `${BODY[step].y}%`, scale: running && !reduce ? [1, 1.18, 1] : 1 }}
          transition={{ top: { duration: 1.2, ease: EASE_OUT }, scale: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: DUR.medium, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: DUR.quick } }}
        >
          <div className="mt-6 text-[22px] font-semibold tracking-[-0.02em]">{BODY[step].part}</div>
          <p className="mx-auto mt-2 min-h-[44px] max-w-[280px] text-[14px] leading-relaxed text-ink-2">{BODY[step].text}</p>
        </motion.div>
      </AnimatePresence>
      <div className="mt-auto flex w-full items-center gap-4">
        <Dots value={`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`} still className="text-[30px]" />
        <Button className="flex-1" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause /> : <Play />} {running ? "Пауза" : sec ? "Продолжить" : "Начать"}
        </Button>
      </div>
    </div>
  )
}

export function BodyScanSheet() {
  const { sheet, openSheet } = useStore()
  const { isPlus } = useSubscription()
  const close = React.useCallback(() => openSheet(null), [openSheet])
  if (!isPlus) return null
  return (
    <Sheet open={sheet === "bodyscan"} onClose={close} title="Сканирование тела" bare>
      <CloseButton onClose={close} />
      <BodyScan onDone={close} />
    </Sheet>
  )
}

/* ── Worry journal ──────────────────────────────────────────────── */

export function WorrySheet() {
  const { sheet, openSheet, worries, addWorry, toggleWorry, removeWorry, addSession, notify } = useStore()
  const [text, setText] = React.useState("")
  const [plan, setPlan] = React.useState("")
  const today = dateKey(new Date())

  const save = () => {
    if (!text.trim()) return
    addWorry(text.trim(), plan.trim())
    addSession("worry", 2)
    notify("Отложено до завтра")
    setText("")
    setPlan("")
  }

  return (
    <Sheet
      open={sheet === "worry"}
      onClose={() => openSheet(null)}
      title="Дневник тревог"
      description="Выгрузите мысль из головы и назначьте ей время: мозгу проще отпустить записанное"
    >
      <Field label="Что крутится в голове">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={240}
          placeholder="Например: не успеваю с отчётом"
          aria-label="Тревожная мысль"
          className="glass w-full resize-none rounded-[22px] px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-ink-3"
        />
      </Field>
      <Field label="Первый маленький шаг завтра">
        <input
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          maxLength={120}
          placeholder="Например: в 10:00 написать план на 3 пункта"
          aria-label="Шаг на завтра"
          className="glass h-12 w-full rounded-full px-5 text-[15px] outline-none placeholder:text-ink-3"
        />
      </Field>
      <Button className="mt-5 w-full" disabled={!text.trim()} onClick={save}>
        Отложить до завтра
      </Button>

      {worries.length > 0 && (
        <Field label="Отложенное" hint={`${worries.filter((w) => !w.done).length} открыто`}>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {worries.map((w) => (
                <motion.li
                  key={w.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: DUR.fast, ease: EASE_OUT }}
                  className="glass flex items-start gap-3 rounded-[22px] p-3.5"
                >
                  <button
                    type="button"
                    aria-label={w.done ? "Вернуть" : "Отметить решённым"}
                    aria-pressed={w.done}
                    onClick={() => toggleWorry(w.id)}
                    className={cn(
                      "press mt-0.5 grid size-7 shrink-0 place-items-center rounded-full transition-colors duration-250",
                      w.done ? "bg-lime text-lime-ink" : "text-transparent ring-1 ring-inset ring-white/30"
                    )}
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </button>
                  <div className={cn("min-w-0 flex-1 transition-opacity duration-250", w.done && "opacity-45")}>
                    <div className={cn("text-[15px] leading-snug", w.done && "line-through")}>{w.text}</div>
                    {w.plan && <div className="mt-1 text-[13px] text-ink-2">→ {w.plan}</div>}
                    <div className="mt-1 text-[11px] text-ink-3">{relativeDay(w.at.slice(0, 10) === today ? today : dateKey(new Date(w.at)))}</div>
                  </div>
                  <button type="button" aria-label="Удалить" onClick={() => removeWorry(w.id)} className="press grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:text-ink">
                    <Trash2 className="size-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Field>
      )}
    </Sheet>
  )
}
