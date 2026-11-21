import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, ChevronRight, Eye, LockKeyhole, NotebookPen, Pause, Play, RotateCcw, ScanLine, SlidersHorizontal, Volume2 } from "lucide-react"
import { cn } from "@/lib/cn"
import { pluralRu } from "@/lib/time"
import { SLEEP_TIPS } from "@/lib/metrics"
import { DUR, EASE_OUT, riseIn } from "@/lib/motion"
import { hm } from "@/lib/time"
import { useBreath, useStore, type Technique } from "@/store/store"
import { SOUNDS } from "@/screens/Sleep"
import { TopBar } from "@/shell/TopBar"
import { Card } from "@/ui/Card"
import { DotTrack } from "@/ui/charts"
import { Chip, IconButton, SectionHead, Segmented, Slider } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { useSubscription } from "@/store/subscription"

interface Phase {
  label: string
  sec: number
  /** Orb scale at the end of the phase */
  to: number
}

const TECHNIQUES: Record<Technique, { name: string; about: string; phases: Phase[] }> = {
  calm: {
    name: "4–6",
    about: "Длинный выдох замедляет пульс. Подходит на каждый день.",
    phases: [
      { label: "Вдох", sec: 4, to: 1 },
      { label: "Выдох", sec: 6, to: 0.56 },
    ],
  },
  "478": {
    name: "4–7–8",
    about: "Задержка и долгий выдох. Помогает уснуть при тревоге.",
    phases: [
      { label: "Вдох", sec: 4, to: 1 },
      { label: "Задержка", sec: 7, to: 1 },
      { label: "Выдох", sec: 8, to: 0.56 },
    ],
  },
  box: {
    name: "Квадрат",
    about: "Равные фазы 4–4–4–4. Возвращает фокус днём.",
    phases: [
      { label: "Вдох", sec: 4, to: 1 },
      { label: "Задержка", sec: 4, to: 1 },
      { label: "Выдох", sec: 4, to: 0.56 },
      { label: "Пауза", sec: 4, to: 0.56 },
    ],
  },
}

export const RITUAL = [
  { id: "dim", label: "Приглушить свет", hint: "за час до сна" },
  { id: "screen", label: "Убрать экран", hint: "за 30 минут" },
  { id: "warm", label: "Тёплый душ или чай", hint: "телу проще остыть" },
  { id: "breath", label: "Подышать 4 минуты", hint: "техника 4–7–8" },
  { id: "notes", label: "Выгрузить мысли", hint: "три строки на бумаге" },
]

function phaseAt(phases: Phase[], elapsed: number) {
  const cycle = phases.reduce((s, p) => s + p.sec, 0)
  let t = elapsed % cycle
  for (let i = 0; i < phases.length; i++) {
    if (t < phases[i].sec) return { index: i, left: phases[i].sec - t }
    t -= phases[i].sec
  }
  return { index: 0, left: phases[0].sec }
}

function BreathingCard() {
  const { breath, setBreath } = useBreath()
  const reduce = useReducedMotion()
  const [tune, setTune] = React.useState(false)
  const tech = TECHNIQUES[breath.technique]
  const elapsed = breath.totalSec - breath.remainingSec
  const { index, left } = phaseAt(tech.phases, elapsed)
  const phase = tech.phases[index]
  const started = elapsed > 0
  const minutes = breath.totalSec / 60
  const sound = SOUNDS.find((s) => s.id === breath.sound)?.label ?? "Тишина"

  return (
    <motion.div {...riseIn(0)}>
      <Card r="lg" className="practice-hero">
        <div className="flex flex-col items-center p-6">
          <div className="w-full">
            <div className="text-[14px] font-medium text-white/80">Дыхание {tech.name}</div>
            <p className="mt-1.5 text-[13px] leading-snug text-white/60">{tech.about}</p>
          </div>

          <div className="relative mt-7 grid size-[220px] place-items-center">
            {[1, 0.78].map((s, i) => (
              <span key={i} className="absolute rounded-full border border-dashed border-white/18" style={{ inset: `${(1 - s) * 50}%` }} />
            ))}
            <motion.div
              className="absolute inset-[6%] rounded-full"
              style={{
                background: "radial-gradient(circle at 38% 30%, #fff3d6, #f29a5c 34%, #c2489c 68%, #4b2a8f 100%)",
                boxShadow: "0 0 90px -10px rgb(242 154 92 / 0.75), inset 0 -18px 40px rgb(0 0 0 / 0.3)",
              }}
              initial={false}
              animate={{ scale: reduce ? 0.8 : breath.running || started ? phase.to : 0.62 }}
              transition={{ duration: breath.running ? phase.sec : 0.6, ease: [0.45, 0, 0.55, 1] }}
            />
            <div className="relative flex flex-col items-center text-black/85">
              <span className="text-[19px] font-semibold tracking-[-0.02em]">{breath.running ? phase.label : started ? "Пауза" : "Готовы?"}</span>
              {breath.running && <span className="mt-0.5 text-[14px] font-medium tabular-nums opacity-70">{Math.ceil(left)}</span>}
            </div>
          </div>

          <Dots value={hm(breath.remainingSec)} still className="mt-7 text-[40px]" />
          <DotTrack value={elapsed / breath.totalSec} count={36} className="-mx-6 mt-4 w-[calc(100%+48px)]" />

          <div className="mt-6 flex items-center gap-5">
            <IconButton
              label="Сбросить"
              disabled={!started}
              className="disabled:opacity-30"
              onClick={() => setBreath((b) => ({ ...b, running: false, remainingSec: b.totalSec }))}
            >
              <RotateCcw />
            </IconButton>
            <IconButton
              label={breath.running ? "Пауза" : "Начать"}
              size="lg"
              solid
              className="size-[72px]"
              onClick={() => setBreath((b) => ({ ...b, running: !b.running }))}
            >
              {breath.running ? <Pause /> : <Play className="translate-x-px" />}
            </IconButton>
            <IconButton label="Настройки дыхания" aria-expanded={tune} className={cn(tune && "bg-white/20")} onClick={() => setTune((v) => !v)}>
              <SlidersHorizontal />
            </IconButton>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {tune ? (
              <motion.div
                key="tune"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: DUR.fast, ease: EASE_OUT }}
                className="w-full overflow-hidden"
              >
                <div className={cn("space-y-3 pt-6 transition-opacity duration-250", started && "pointer-events-none opacity-40")}>
                  <Segmented
                    id="technique"
                    label="Техника дыхания"
                    className="flex w-full"
                    value={breath.technique}
                    onChange={(technique) => setBreath((b) => ({ ...b, technique }))}
                    options={(Object.keys(TECHNIQUES) as Technique[]).map((k) => ({ value: k, label: TECHNIQUES[k].name }))}
                  />
                  <div className="flex gap-2">
                    {[2, 4, 6, 10].map((m) => (
                      <Chip
                        key={m}
                        active={minutes === m}
                        className="flex-1 justify-center"
                        onClick={() => setBreath((b) => ({ ...b, totalSec: m * 60, remainingSec: m * 60 }))}
                      >
                        {m} мин
                      </Chip>
                    ))}
                  </div>
                </div>
                <SoundControls sound={breath.sound} setBreath={setBreath} />
              </motion.div>
            ) : (
              <motion.button
                key="summary"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.quick }}
                onClick={() => setTune(true)}
                className="mt-5 text-[13px] text-white/60 hover:text-white"
              >
                {minutes} мин · {sound}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}

const SoundControls = React.memo(function SoundControls({ sound, setBreath }: {
  sound: ReturnType<typeof useBreath>["breath"]["sound"]
  setBreath: ReturnType<typeof useBreath>["setBreath"]
}) {
  const { volume, patch } = useStore()
  return (
    <div className="mt-5 border-t border-white/12 pt-5">
      <div className="text-[13px] text-white/60">Звук во время дыхания</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {SOUNDS.map((s) => (
          <Chip key={s.id} active={sound === s.id} onClick={() => setBreath((b) => ({ ...b, sound: s.id }))}>
            {s.label}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Volume2 className="size-[18px] shrink-0 text-white/60" />
        <Slider label="Громкость" value={volume} onChange={(v) => patch({ volume: v })} className="flex-1" />
        <span className="w-9 text-right text-[13px] font-semibold tabular-nums text-white/70">{volume}</span>
      </div>
    </div>
  )
})

const LIBRARY = [
  { id: "grounding", tone: "moss", icon: Eye, title: "Заземление", sub: "5-4-3-2-1 · 3 мин" },
  { id: "bodyscan", tone: "plum", icon: ScanLine, title: "Скан тела", sub: "Расслабление · 3 мин" },
] as const

export function PracticesScreen() {
  const { isPlus } = useSubscription()
  const { ritual, toggleRitual, breath: today, sessions, worries, openSheet } = useStore()
  const totalMin = Math.round(sessions.reduce((s, x) => s + x.min, 0))
  const openWorries = worries.filter((w) => !w.done).length
  const open = (id: "grounding" | "bodyscan") => (e?: React.KeyboardEvent) => {
    if (e && e.key !== "Enter" && e.key !== " ") return
    e?.preventDefault()
    openSheet(id)
  }

  return (
    <>
      <TopBar title="Практики" sub={`Сегодня ${today.min.toFixed(1)} мин дыхания`} />

      <BreathingCard />

      <motion.div {...riseIn(1)} className="mt-3 grid grid-cols-2 gap-3">
        {LIBRARY.map((x) => (
          <Card
            key={x.id}
            tone={x.tone}
            role="button"
            tabIndex={0}
            aria-label={x.id === "bodyscan" && !isPlus ? `${x.title} · Plus` : x.title}
            onClick={() => openSheet(x.id)}
            onKeyDown={open(x.id)}
            className="cursor-pointer"
          >
            <div className="flex min-h-[156px] flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/14">
                  <x.icon className="size-[18px]" />
                </span>
                {x.id === "bodyscan" && (
                  <span className="flex items-center gap-1 rounded-full bg-white/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {!isPlus && <LockKeyhole className="size-3" />} Plus
                  </span>
                )}
              </div>
              <div className="mt-auto min-w-0">
                <div className="text-[17px] font-semibold tracking-[-0.02em]">{x.title}</div>
                <div className="mt-1 text-[12px] leading-snug text-white/65">{x.sub}</div>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      <motion.button
        {...riseIn(2)}
        type="button"
        aria-label="Дневник тревог"
        onClick={() => openSheet("worry")}
        className="press glass mt-3 flex w-full items-center gap-4 rounded-[30px] p-3 pr-4 text-left"
      >
        <span className="glass-inset grid size-11 shrink-0 place-items-center rounded-full">
          <NotebookPen className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium">Дневник тревог</span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-2">{openWorries ? `${openWorries} отложено до завтра` : "Выгрузить мысли перед сном"}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-3" />
      </motion.button>

      <motion.section {...riseIn(3)} className="mt-10" aria-label="Вечерний ритуал">
        <SectionHead title="Вечерний ритуал" hint={`${ritual.done.length} из ${RITUAL.length} шагов перед сном`} />
        <div className="glass mt-4 rounded-[30px] p-5">
          <div className="flex gap-1.5" aria-hidden>
            {RITUAL.map((r) => (
              <span key={r.id} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-350", ritual.done.includes(r.id) ? "bg-lime" : "bg-white/12")} />
            ))}
          </div>
          <ul className="-mx-2 -mb-2 mt-3">
            {RITUAL.map((r) => {
              const done = ritual.done.includes(r.id)
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    onClick={() => toggleRitual(r.id)}
                    className="press flex w-full items-center gap-3 rounded-[18px] px-2 py-2.5 text-left hover:bg-white/5"
                  >
                    <span
                      className={cn(
                        "grid size-[22px] shrink-0 place-items-center rounded-full transition-colors duration-250",
                        done ? "bg-lime text-lime-ink" : "text-transparent ring-[1.5px] ring-inset ring-white/30"
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3.5} />
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-[15px] transition-opacity duration-250", done && "text-ink-3 line-through decoration-white/25")}>{r.label}</span>
                    <span className="shrink-0 text-[12px] text-ink-3">{r.hint}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </motion.section>

      <motion.section {...riseIn(4)} className="mt-10">
        <SectionHead title="Гигиена сна" hint="Короткие правила, которые работают" />
        <div className="no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5">
          {SLEEP_TIPS.map((t, i) => (
            <Card key={t.id} className={cn("w-[272px] shrink-0 snap-center", i === 0 && "reading-card")}>
              <div className="flex min-h-[228px] flex-col p-5">
                <div className="flex items-center justify-between text-[11px] font-medium opacity-60">
                  <span>{t.tag}</span>
                  <span className="tabular-nums">{i + 1} / {SLEEP_TIPS.length}</span>
                </div>
                <h3 className="mt-5 text-[22px] font-semibold leading-[1.1] tracking-[-0.04em]">{t.title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed opacity-70">{t.body}</p>
              </div>
            </Card>
          ))}
        </div>
        {sessions.length > 0 && (
          <p className="mt-6 text-center text-[12px] text-ink-3">
            {sessions.length} {pluralRu(sessions.length, ["сессия", "сессии", "сессий"])} · {totalMin} мин практики всего
          </p>
        )}
      </motion.section>
    </>
  )
}
