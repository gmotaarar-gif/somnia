import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Check, Eye, NotebookPen, Pause, Play, RotateCcw, ScanLine, Volume2 } from "lucide-react"
import { cn } from "@/lib/cn"
import { pluralRu } from "@/lib/time"
import { SLEEP_TIPS } from "@/lib/metrics"
import { riseIn } from "@/lib/motion"
import { hm } from "@/lib/time"
import { useBreath, useStore, type Technique } from "@/store/store"
import { SOUNDS } from "@/screens/Sleep"
import { TopBar } from "@/shell/TopBar"
import { Card, CardTitle } from "@/ui/Card"
import { DotTrack } from "@/ui/charts"
import { Chip, IconButton, SectionHead, Segmented, Slider } from "@/ui/controls"
import { Dots } from "@/ui/Dots"

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
  const tech = TECHNIQUES[breath.technique]
  const elapsed = breath.totalSec - breath.remainingSec
  const { index, left } = phaseAt(tech.phases, elapsed)
  const phase = tech.phases[index]
  const started = elapsed > 0
  const minutes = breath.totalSec / 60

  return (
    <motion.div {...riseIn(0)} className="">
      <Card r="lg" className="practice-hero h-full">
        <div className="flex h-full flex-col items-center p-6">
          <div className="flex w-full items-start justify-between gap-3">
            <CardTitle sub={tech.about}>Дыхание</CardTitle>
          </div>

          <div className="relative mt-6 grid size-[236px] place-items-center">
            {[1, 0.8, 0.6].map((s, i) => (
              <span
                key={i}
                className="absolute rounded-full border border-dashed border-white/20"
                style={{ inset: `${(1 - s) * 50}%` }}
              />
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
              <span className="text-[19px] font-semibold tracking-[-0.02em]">
                {breath.running ? phase.label : started ? "Пауза" : "Готовы?"}
              </span>
              {breath.running && <span className="mt-0.5 text-[14px] font-medium tabular-nums opacity-70">{Math.ceil(left)}</span>}
            </div>
          </div>

          <Dots value={hm(breath.remainingSec)} still className="mt-7 text-[40px]" />
          <DotTrack value={elapsed / breath.totalSec} count={36} className="-mx-6 mt-4 w-[calc(100%+48px)]" />

          <div className="mt-6 flex items-center gap-4">
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
            <span className="grid size-11 place-items-center text-[13px] font-semibold tabular-nums text-ink-2">{minutes} мин</span>
          </div>

          <div className={cn("mt-7 w-full space-y-3 transition-opacity duration-250", started && "pointer-events-none opacity-40")}>
            <Segmented
              id="technique"
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
        </div>
      </Card>
    </motion.div>
  )
}

function SoundCard() {
  const { breath, setBreath } = useBreath()
  return <SoundControls sound={breath.sound} setBreath={setBreath} />
}

const SoundControls = React.memo(function SoundControls({ sound, setBreath }: {
  sound: ReturnType<typeof useBreath>["breath"]["sound"]
  setBreath: ReturnType<typeof useBreath>["setBreath"]
}) {
  const { volume, patch } = useStore()
  return (
    <motion.div {...riseIn(2)}>
      <Card>
        <div className="p-5">
          <CardTitle sub="Играет во время дыхания">Звук</CardTitle>
          <div className="mt-4 flex flex-wrap gap-2">
            {SOUNDS.map((s) => (
              <Chip key={s.id} active={sound === s.id} onClick={() => setBreath((b) => ({ ...b, sound: s.id }))}>
                {s.label}
              </Chip>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Volume2 className="size-[18px] shrink-0 text-ink-2" />
            <Slider label="Громкость" value={volume} onChange={(v) => patch({ volume: v })} className="flex-1" />
            <span className="w-9 text-right text-[13px] font-semibold tabular-nums text-ink-2">{volume}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  )
})

export function PracticesScreen() {
  const { ritual, toggleRitual, breath: today, sessions, worries, openSheet } = useStore()
  const totalMin = Math.round(sessions.reduce((a, x) => a + x.min, 0))
  const openWorries = worries.filter((w) => !w.done).length

  return (
    <>
      <TopBar title="Практики" sub={`Сегодня ${today.min.toFixed(1)} мин дыхания`} />

      <div className="grid gap-3">
        <BreathingCard />

        <div className="grid content-start gap-3">
          <motion.div {...riseIn(1)}>
            <Card>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle sub="Отмечайте шаги перед сном">Вечерний ритуал</CardTitle>
                  <div className="flex items-end gap-1.5">
                    <Dots value={`${ritual.done.length}/${RITUAL.length}`} className="text-[22px]" />
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {RITUAL.map((r) => {
                    const done = ritual.done.includes(r.id)
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          onClick={() => toggleRitual(r.id)}
                          className="press flex w-full items-center gap-3 rounded-[20px] p-2 text-left hover:bg-white/6"
                        >
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-250",
                              done ? "bg-lime text-lime-ink" : "glass-inset text-transparent"
                            )}
                          >
                            <Check className="size-4" strokeWidth={3} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block text-[15px] font-medium transition-opacity", done && "opacity-50")}>{r.label}</span>
                            <span className="block text-[12px] text-ink-3">{r.hint}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Card>
          </motion.div>

          <SoundCard />
        </div>
      </div>

      <motion.section {...riseIn(3)} className="mt-8">
        <SectionHead title="Библиотека" hint={`${sessions.length} ${pluralRu(sessions.length, ["сессия", "сессии", "сессий"])} · ${totalMin} мин всего`} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              { id: "grounding", tone: "moss", icon: Eye, title: "Заземление", sub: "5-4-3-2-1 · 3 мин", wide: false },
              { id: "bodyscan", tone: "plum", icon: ScanLine, title: "Скан тела", sub: "Расслабление · 3 мин", wide: false },
              { id: "worry", tone: "ember", icon: NotebookPen, title: "Дневник тревог", sub: openWorries ? `${openWorries} отложено до завтра` : "Выгрузить мысли перед сном", wide: true },
            ] as const
          ).map((x) => (
            <Card
              key={x.id}
              tone={x.tone}
              role="button"
              tabIndex={0}
              aria-label={x.title}
              onClick={() => openSheet(x.id)}
              onKeyDown={(e) => e.key === "Enter" && openSheet(x.id)}
              className={cn("cursor-pointer", x.wide && "col-span-2")}
            >
              <div className={cn("flex p-5", x.wide ? "items-center gap-4" : "min-h-[180px] flex-col")}>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/12">
                  <x.icon className="size-[18px]" />
                </span>
                <div className={cn("min-w-0", !x.wide && "mt-auto")}>
                  <div className="text-[16px] font-semibold tracking-[-0.01em]">{x.title}</div>
                  <div className="mt-1.5 text-[12px] leading-snug text-ink-2">{x.sub}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </motion.section>

      <motion.section {...riseIn(3)} className="mt-8">
        <SectionHead title="Гигиена сна" hint="Короткие правила КПТ-Б, которые работают" />
        <div className="mt-4 grid gap-3">
          {SLEEP_TIPS.map((t, i) => (
            <Card key={t.id} className={i === 0 ? "reading-card" : undefined}>
              <div className="flex flex-col p-6">
                <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.1em] opacity-60">
                  <span>{t.tag}</span><span>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className={cn("mt-5 font-semibold leading-[1.1] tracking-[-0.04em]", i === 0 ? "text-[28px]" : "text-[22px]")}>{t.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed opacity-70">{t.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </motion.section>
    </>
  )
}
