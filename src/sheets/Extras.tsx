import * as React from "react"
import { motion } from "framer-motion"
import { Award as AwardIcon, Check, Trash2 } from "lucide-react"
import { cn } from "@/lib/cn"
import {
  STAGE_META,
  WHO5,
  WHO5_SCALE,
  bedOptions,
  buildAwards,
  wakeOptions,
  who5Label,
  type Stage,
} from "@/lib/features"
import { nightScore, qualityLabel } from "@/lib/metrics"
import { EASE_OUT } from "@/lib/motion"
import { durationRu, hm, relativeDay } from "@/lib/time"
import { useNow } from "@/store/derived"
import { useStore } from "@/store/store"
import { Card, type CardTone } from "@/ui/Card"
import { Ring } from "@/ui/charts"
import { Hypnogram, stageMinutes } from "@/ui/SleepStages"
import { Button, Segmented, TimeField } from "@/ui/controls"
import { Dots, DotsCount } from "@/ui/Dots"
import { Field, Sheet } from "@/ui/Sheet"

/* ── Sleep-cycle calculator ─────────────────────────────────────── */

export function CyclesSheet() {
  const { sheet, openSheet, bedGoal, wakeGoal, patch, notify } = useStore()
  const now = useNow()
  const [mode, setMode] = React.useState<"bed" | "wake">("bed")
  const [bed, setBed] = React.useState(bedGoal)
  const [wake, setWake] = React.useState(wakeGoal)
  const options = mode === "bed" ? wakeOptions(bed) : bedOptions(wake)
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

  return (
    <Sheet
      open={sheet === "cycles"}
      onClose={() => openSheet(null)}
      title="Циклы сна"
      description="Проснуться между циклами по 90 минут легче, чем посреди глубокого сна"
    >
      <Segmented
        id="cycles-mode"
        className="flex w-full"
        value={mode}
        onChange={setMode}
        options={[
          { value: "bed", label: "Лягу в…" },
          { value: "wake", label: "Встану в…" },
        ]}
      />
      <div className="mt-3 flex gap-3">
        {mode === "bed" ? (
          <>
            <TimeField label="Отбой" value={bed} onChange={setBed} />
            <Button variant="glass" className="h-auto flex-1 rounded-[22px]" onClick={() => setBed(nowStr)}>
              Лечь сейчас
            </Button>
          </>
        ) : (
          <TimeField label="Подъём" value={wake} onChange={setWake} />
        )}
      </div>

      <Field label={mode === "bed" ? "Лучше встать в" : "Лучше лечь в"} hint="+14 мин на засыпание">
        <ul className="space-y-2.5">
          {options.map((o, i) => (
            <motion.li
              key={`${mode}-${o.cycles}-${o.time}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT, delay: i * 0.05 }}
            >
              <button
                type="button"
                onClick={() => {
                  patch(mode === "bed" ? { bedGoal: bed, wakeGoal: o.time } : { bedGoal: o.time, wakeGoal: wake })
                  notify(`Режим: ${mode === "bed" ? bed : o.time} → ${mode === "bed" ? o.time : wake}`)
                  openSheet(null)
                }}
                className={cn(
                  "press flex w-full items-center justify-between gap-4 rounded-[26px] px-5 py-4 text-left",
                  o.best ? "bg-lime text-lime-ink" : "glass"
                )}
              >
                <span>
                  <Dots value={o.time} still className="text-[34px]" />
                  <span className={cn("mt-2 block text-[12px]", o.best ? "text-lime-ink/70" : "text-ink-3")}>
                    {o.cycles} циклов · {durationRu(o.sleepMin)} сна
                  </span>
                </span>
                <span className="flex shrink-0 gap-1" aria-hidden>
                  {Array.from({ length: 6 }, (_, k) => (
                    <span
                      key={k}
                      className={cn("h-7 w-2 rounded-full", k < o.cycles ? (o.best ? "bg-lime-ink" : "bg-white") : o.best ? "bg-lime-ink/20" : "bg-white/15")}
                    />
                  ))}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-3">Нажмите на вариант, чтобы сделать его своим режимом.</p>
      </Field>
    </Sheet>
  )
}

/* ── WHO-5 wellbeing check ──────────────────────────────────────── */

function WellbeingTest({ onDone }: { onDone: () => void }) {
  const { addWellbeing, wellbeing, notify } = useStore()
  const [answers, setAnswers] = React.useState<number[]>([])
  const q = answers.length
  const done = q >= WHO5.length
  const score = answers.reduce((a, b) => a + b, 0) * 4
  const prev = wellbeing[wellbeing.length - 1]

  if (done)
    return (
      <div className="flex flex-col items-center pb-2 text-center">
        <Ring value={score / 100} size={190} stroke={4}>
          <DotsCount value={score} shape="square" className="text-[54px]" />
        </Ring>
        <div className="mt-6 text-[22px] font-semibold tracking-[-0.02em]">{who5Label(score)}</div>
        <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-ink-2">
          {prev ? `Прошлый результат: ${prev.score}. ` : ""}
          {score < 52
            ? "Если такое состояние держится больше двух недель, стоит обсудить его со специалистом."
            : "Повторяйте тест раз в неделю, чтобы видеть динамику."}
        </p>
        <Button
          className="mt-7 w-full"
          onClick={() => {
            addWellbeing(score)
            notify("Результат сохранён")
            onDone()
          }}
        >
          Сохранить результат
        </Button>
        <Button variant="glass" className="mt-2.5 w-full" onClick={() => setAnswers([])}>
          Пройти заново
        </Button>
      </div>
    )

  return (
    <div>
      <div className="flex gap-1.5">
        {WHO5.map((_, i) => (
          <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
            <span className="block h-full origin-left rounded-full bg-lime transition-transform duration-500 ease-out-smooth" style={{ transform: `scaleX(${i < q ? 1 : 0})` }} />
          </span>
        ))}
      </div>
      <motion.div key={q} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
        <div className="mt-6 text-[12px] font-medium uppercase tracking-[0.1em] text-ink-3">За последние две недели</div>
        <h3 className="mt-2 min-h-[84px] text-[24px] font-semibold leading-[1.15] tracking-[-0.03em]">{WHO5[q]}</h3>
        <div className="mt-5 space-y-2">
          {WHO5_SCALE.map((label, v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAnswers([...answers, v])}
              className="press glass flex w-full items-center justify-between rounded-full px-5 py-3.5 text-left text-[15px]"
            >
              {label}
              <span className="flex gap-1" aria-hidden>
                {Array.from({ length: 5 }, (_, k) => (
                  <span key={k} className={cn("size-1.5 rounded-full", k < v ? "bg-lime" : "bg-white/20")} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
      {q > 0 && (
        <Button variant="glass" className="mt-4 w-full" onClick={() => setAnswers(answers.slice(0, -1))}>
          Назад
        </Button>
      )}
    </div>
  )
}

export function WellbeingSheet() {
  const { sheet, openSheet } = useStore()
  return (
    <Sheet open={sheet === "wellbeing"} onClose={() => openSheet(null)} title="Индекс благополучия" description="WHO-5: пять вопросов, одна минута">
      <WellbeingTest onDone={() => openSheet(null)} />
    </Sheet>
  )
}

/* ── Night details with estimated stages ────────────────────────── */

export function NightSheet() {
  const { sheet, sheetArg, openSheet, nights, bedGoal, wakeGoal, removeNight, notify } = useStore()
  const night = nights.find((n) => n.id === sheetArg)
  const totals = night ? stageMinutes(night) : null
  const score = night ? nightScore(night, bedGoal, wakeGoal) : 0

  return (
    <Sheet
      open={sheet === "night" && !!night}
      onClose={() => openSheet(null)}
      title={night ? relativeDay(night.dateKey) : "Ночь"}
      description={night ? `${night.bedtime} → ${night.wakeTime} · ${durationRu(night.durationMin)}` : undefined}
    >
      {night && totals && (
        <>
          <Card className="sleep-hero">
            <div className="flex items-end justify-between p-5">
              <div>
                <div className="text-[12px] text-ink-2">Сон</div>
                <DotsCount value={night.durationMin} format={(v) => hm(Math.round(v))} shape="square" className="mt-3 text-[50px]" />
              </div>
              <Ring value={score / 100} size={84} stroke={5}>
                <span className="text-[20px] font-semibold tabular-nums">{score}</span>
              </Ring>
            </div>
          </Card>

          <Field label="Фазы сна" hint="оценка по вашей записи">
            <div className="glass rounded-[26px] p-4">
              <Hypnogram night={night} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {(Object.keys(STAGE_META) as Stage[]).map((st) => (
                <div key={st} className="glass-inset flex items-center gap-3 rounded-[20px] px-4 py-3">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: STAGE_META[st].color }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] text-ink-3">{STAGE_META[st].label}</span>
                    <span className="block text-[15px] font-semibold">{durationRu(Math.round(totals[st]))}</span>
                  </span>
                </div>
              ))}
            </div>
          </Field>

          <Field label="Утро">
            <div className="flex flex-wrap gap-2">
              <span className="glass-inset rounded-full px-3.5 py-2 text-[13px]">{qualityLabel(night.quality)} · {night.quality}</span>
              <span className="glass-inset rounded-full px-3.5 py-2 text-[13px]">
                {night.awakenings ? `Пробуждений: ${night.awakenings}` : "Без пробуждений"}
              </span>
              {night.tags.map((t) => (
                <span key={t} className="glass-inset rounded-full px-3.5 py-2 text-[13px]">{t}</span>
              ))}
            </div>
            {night.note && <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{night.note}</p>}
          </Field>

          <Button
            variant="danger"
            className="mt-6 w-full"
            onClick={() => {
              removeNight(night.id)
              notify("Запись удалена")
              openSheet(null)
            }}
          >
            <Trash2 /> Удалить запись
          </Button>
        </>
      )}
    </Sheet>
  )
}

/* ── Achievements ───────────────────────────────────────────────── */

export function useAwards() {
  const { nights, moods, sessions, wellbeing, bedGoal, wakeGoal, widgets } = useStore()
  return React.useMemo(
    () =>
      buildAwards({ nights, moods, sessions, wellbeing, bedGoal, wakeGoal, customWidgets: widgets.filter((w) => w.kind === "custom").length }),
    [nights, moods, sessions, wellbeing, bedGoal, wakeGoal, widgets]
  )
}

export function AwardsSheet() {
  const { sheet, openSheet } = useStore()
  const awards = useAwards()
  const done = awards.filter((a) => a.done).length
  return (
    <Sheet open={sheet === "awards"} onClose={() => openSheet(null)} title="Достижения" description={`Открыто ${done} из ${awards.length}`}>
      <ul className="grid grid-cols-2 gap-3">
        {awards.map((a, i) => (
          <motion.li
            key={a.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT, delay: i * 0.035 }}
          >
            <Card tone={(a.done ? a.tone : "ink") as CardTone} className={cn("h-[168px]", !a.done && "opacity-70")}>
              <div className="flex h-full flex-col p-4">
                <Ring value={a.progress} size={46} stroke={6} color={a.done ? "#fff" : "#d9f24a"}>
                  {a.done ? <Check className="size-4" strokeWidth={3} /> : <AwardIcon className="size-4 text-ink-3" />}
                </Ring>
                <div className="mt-auto text-[15px] font-semibold leading-tight tracking-[-0.01em]">{a.title}</div>
                <div className="mt-1 text-[12px] leading-snug text-ink-2">{a.about}</div>
              </div>
            </Card>
          </motion.li>
        ))}
      </ul>
    </Sheet>
  )
}
