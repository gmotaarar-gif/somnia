import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check, Heart, Moon, Sparkles, Target, Wind, X } from "lucide-react"
import { cn } from "@/lib/cn"
import { indexLabel, nightScore } from "@/lib/metrics"
import { DUR, EASE_OUT } from "@/lib/motion"
import { buildWeeklyRecap, recapGoalOptions } from "@/lib/recap"
import { dayMonthShort, durationRu, hm, parseKey, pluralRu, weekdayShort } from "@/lib/time"
import { useStore } from "@/store/store"
import { Card, type CardTone } from "@/ui/Card"
import { Button, IconButton } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { Sheet } from "@/ui/Sheet"

const STORIES: { title: string; tone: CardTone; icon: typeof Moon }[] = [
  { title: "Ваша неделя", tone: "night", icon: Sparkles },
  { title: "Сон", tone: "violet", icon: Moon },
  { title: "Состояние", tone: "mint", icon: Heart },
  { title: "Забота о себе", tone: "sunset", icon: Wind },
  { title: "Следующая неделя", tone: "forest", icon: Target },
]

function RecapStories({ onClose }: { onClose: () => void }) {
  const { nights, moods, sessions, bedGoal, wakeGoal, weeklyGoal, patch, notify } = useStore()
  const [now] = React.useState(() => new Date())
  const recap = React.useMemo(
    () => buildWeeklyRecap(nights, moods, sessions, bedGoal, wakeGoal, now),
    [nights, moods, sessions, bedGoal, wakeGoal, now]
  )
  const sum = recap.summary
  const hasSleep = sum.week.length > 0
  const goals = recapGoalOptions(recap.goals, weeklyGoal)
  const [goal, setGoal] = React.useState(weeklyGoal?.id ?? goals[0]?.id)
  const selectedGoal = goals.some((g) => g.id === goal) ? goal : goals[0]?.id
  const [{ index, direction }, setPage] = React.useState({ index: 0, direction: 1 })
  const reduced = useReducedMotion()
  const heading = React.useRef<HTMLHeadingElement>(null)
  const navigated = React.useRef(false)
  const goalGroup = React.useId()
  const best = sum.week.reduce<(typeof sum.week)[number] | undefined>(
    (b, n) => !b || nightScore(n, bedGoal, wakeGoal) > nightScore(b, bedGoal, wakeGoal) ? n : b,
    undefined
  )
  const range = `${dayMonthShort(parseKey(recap.days[0].key))} – ${dayMonthShort(parseKey(recap.days[6].key))}`
  const last = index === STORIES.length - 1
  const StoryIcon = STORIES[index].icon
  const go = (next: number) => {
    if (next < 0 || next >= STORIES.length || next === index) return
    navigated.current = true
    setPage({ index: next, direction: next > index ? 1 : -1 })
  }
  const accept = () => {
    const selected = goals.find((g) => g.id === selectedGoal)
    if (!selected) return
    patch({ weeklyGoal: { id: selected.id, text: selected.text } })
    notify("Цель на неделю сохранена")
    onClose()
  }

  const slides = [
    <React.Fragment key="index">
      <div className="relative mx-auto my-6 grid size-[212px] shrink-0 place-items-center">
        <svg viewBox="0 0 212 212" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="106" cy="106" r="98" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="3" />
          {hasSleep && <circle cx="106" cy="106" r="98" fill="none" stroke="#d9f24a" strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray={`${sum.index} 100`} />}
        </svg>
        <div className="flex flex-col items-center">
          <Dots value={hasSleep ? sum.index : "--"} shape="square" className="text-[76px]" still />
          <span className="mt-3 text-[12px] uppercase tracking-[0.14em] text-ink-2">{hasSleep ? "индекс сна / 100" : "пока без оценки"}</span>
        </div>
      </div>
      <h3 className="text-center text-[23px] font-semibold tracking-[-0.025em]">{hasSleep ? indexLabel(sum.index) : "Начнём с одной ночи"}</h3>
      <div className="mt-3 flex justify-center">
        {recap.indexDelta !== null ? (
          <span className={cn("glass-inset inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px]", recap.indexDelta >= 0 ? "text-lime" : "text-ink-2")}>
            {recap.indexDelta > 0 ? <ArrowUpRight className="size-4" /> : recap.indexDelta < 0 ? <ArrowDownRight className="size-4" /> : null}
            {recap.indexDelta === 0 ? "На уровне прошлой недели" : `${recap.indexDelta > 0 ? "+" : "−"}${Math.abs(recap.indexDelta)} п. к прошлой неделе`}
          </span>
        ) : <p className="max-w-[280px] text-center text-[13px] leading-relaxed text-ink-2">{hasSleep ? "Сравнение появится, когда будут записи за обе недели" : "Запишите сон утром — здесь появится ваш ритм за неделю"}</p>}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
        <Fact label="Средний сон" value={hasSleep ? durationRu(sum.avgDuration) : "Нет записей"} />
        <Fact label="Дни с чек-ином" value={`${recap.moodDays} из 7`} />
      </div>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-2">{hasSleep ? `По ${sum.week.length} ${pluralRu(sum.week.length, ["записанной ночи", "записанным ночам", "записанным ночам"])}` : "Без записей — без выводов"}{recap.indexDelta !== null && ` · ранее: ${recap.previousNights}`}</p>
    </React.Fragment>,
    <React.Fragment key="sleep">
      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Dots value={hasSleep ? hm(sum.avgDuration) : "--"} className="text-[54px]" still />
        <span className="text-[13px] text-ink-2">{hasSleep ? "в среднем за ночь" : "ещё нет записей"}</span>
      </div>
      <WeekChart days={recap.days} kind="sleep" target={sum.target} bestKey={best?.dateKey} />
      <p className="mt-3 text-[12px] leading-relaxed text-ink-2">Пунктир — цель {durationRu(sum.target)}. Пропуски не считаем нулевым сном</p>
      <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
        <Fact label={`Сон не меньше ${durationRu(sum.target)}`} value={hasSleep ? `${sum.goalNights} из ${sum.week.length}` : "—"} />
        <Fact label="Отбой ±30 мин" value={hasSleep ? `${sum.accuracy}%` : "—"} />
        <Fact label="Лучшая ночь" value={best ? dayMonthShort(parseKey(best.dateKey)) : "—"} />
        <Fact label="Недосып по записям" value={hasSleep ? durationRu(sum.debt) : "—"} />
      </div>
    </React.Fragment>,
    <React.Fragment key="mood">
      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Dots value={sum.moodAvg !== null ? `${sum.moodAvg}%` : "--"} className="text-[54px]" still />
        <span className="text-[13px] text-ink-2">{sum.moodAvg !== null ? "средний баланс" : "ещё нет чек-инов"}</span>
      </div>
      <WeekChart days={recap.days} kind="mood" />
      <p className="mt-3 text-[12px] text-ink-2">{recap.moods.length} {pluralRu(recap.moods.length, ["чек-ин", "чек-ина", "чек-инов"])} · {recap.moodDays} из 7 дней</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {recap.emotions.map((emotion) => (
          <span key={emotion.name} className="glass-inset rounded-full px-3 py-2 text-[12px]">{emotion.name} <span className="ml-1 text-ink-2">{emotion.count}</span></span>
        ))}
      </div>
      <div className="glass-inset mt-auto rounded-[24px] p-4">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><Heart className="size-4" />Без оценок и правильных ответов</div>
        <p className="text-[13px] leading-relaxed text-ink-2">{recap.moods.length ? "На графике — среднее за каждый день, выше — по всем чек-инам. Любое состояние заслуживает внимания" : "Один короткий чек-ин в день поможет заметить, что поддерживает вас. Пропущенные дни останутся пустыми"}</p>
      </div>
    </React.Fragment>,
    <React.Fragment key="habits">
      <p className="mt-4 text-[14px] leading-relaxed text-ink-2">Маленькие действия тоже считаются. Вот что вы успели за эти семь дней</p>
      <div className="my-6 grid grid-cols-2 gap-3">
        <Activity icon={<Sparkles />} label="дней с записями" value={`${recap.activeDays}/7`} />
        <Activity icon={<Heart />} label="чек-инов состояния" value={recap.moods.length} />
        <Activity icon={<Wind />} label="минут практик" value={recap.practiceMinutes} />
        <Activity icon={<Check />} label="практик завершено" value={recap.practiceCount} />
      </div>
      <p className="glass-inset mt-auto rounded-[24px] p-4 text-[14px] leading-relaxed text-ink-2">{recap.practiceCount ? "Вы находили время для паузы. На следующей неделе не нужно делать больше — попробуйте сохранить то, что подходит вам" : "Не нужно менять всё сразу. Начните с одной короткой практики, когда захотите сделать паузу"}</p>
    </React.Fragment>,
    <React.Fragment key="goal">
      <p className="mt-4 text-[14px] leading-relaxed text-ink-2">Не новый список дел — один посильный шаг. Цель можно изменить в следующих итогах</p>
      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">Цель на неделю</legend>
        {goals.map((g) => {
          const selected = selectedGoal === g.id
          return (
            <label key={g.id} className="block cursor-pointer">
              <input type="radio" name={goalGroup} value={g.id} checked={selected} onChange={() => setGoal(g.id)} className="peer sr-only" />
              <span className={cn("flex items-center gap-3 rounded-[24px] p-4 transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-lime motion-reduce:transition-none", selected ? "bg-white text-black" : "glass-inset")}>
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", selected ? "bg-black text-white" : "ring-1 ring-inset ring-white/35 text-transparent")}><Check className="size-3.5" strokeWidth={3} aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-snug">{g.text}</span>
                  <span className={cn("mt-1 block text-[12px] leading-snug", selected ? "text-black/65" : "text-ink-2")}>{g.why}</span>
                </span>
              </span>
            </label>
          )
        })}
      </fieldset>
      {weeklyGoal && <p className="mt-5 text-[12px] leading-relaxed text-ink-2">Сейчас: {weeklyGoal.text}. Изменения сохранятся только после подтверждения</p>}
    </React.Fragment>,
  ]

  return (
    <Card tone={STORIES[index].tone} r="lg" className="flex h-full min-h-0 flex-col rounded-b-none">
      <header className="relative z-10 shrink-0 px-6 pt-8">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[12px] text-ink-2"><StoryIcon className="size-4" />{range}</span>
          <IconButton label="Закрыть итоги" size="sm" className="size-10" onClick={onClose}><X /></IconButton>
        </div>
        <nav aria-label="Разделы итогов недели" className="flex gap-1.5">
          {STORIES.map((story, n) => (
            <button key={story.title} type="button" onClick={() => go(n)} aria-label={`${n + 1}. ${story.title}`} aria-current={n === index ? "step" : undefined} className="group flex h-11 min-w-0 flex-1 items-center rounded-full">
              <span className="h-1 w-full overflow-hidden rounded-full bg-white/20 group-hover:bg-white/35"><span className="block h-full origin-left rounded-full bg-white transition-transform duration-250 ease-out-smooth motion-reduce:transition-none" style={{ transform: `scaleX(${n <= index ? 1 : 0})` }} /></span>
            </button>
          ))}
        </nav>
      </header>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section
            key={index}
            custom={direction}
            aria-label={STORIES[index].title}
            className="no-scrollbar flex h-full flex-col overflow-y-auto overscroll-contain px-6 pb-5"
            initial={{ opacity: 0, x: reduced ? 0 : 8 * direction }}
            animate={{ opacity: 1, x: 0 }}
            variants={{ exit: (dir: number) => ({ opacity: 0, x: reduced ? 0 : -8 * dir }) }}
            exit="exit"
            transition={{ duration: reduced ? 0 : DUR.fast, ease: EASE_OUT }}
            onAnimationComplete={() => { if (navigated.current) heading.current?.focus({ preventScroll: true }) }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-2" aria-live="polite">{index + 1} / {STORIES.length} · Последние 7 дней</p>
            <h2 ref={heading} tabIndex={-1} className="mt-2 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] outline-none">{last ? "Одна цель — уже начало" : STORIES[index].title}</h2>
            {slides[index]}
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className="relative z-10 flex shrink-0 gap-3 border-t border-white/10 px-6 pb-[max(var(--safe-bottom),22px)] pt-4">
        {index > 0 && <IconButton label="Предыдущий раздел" onClick={() => go(index - 1)} className="size-12"><ArrowLeft /></IconButton>}
        <Button className="min-w-0 flex-1 px-4" onClick={last ? accept : () => go(index + 1)} disabled={last && !selectedGoal}>
          {last ? "Сохранить цель" : index === 0 ? "Посмотреть неделю" : "Дальше"}{last ? <Check /> : <ArrowRight />}
        </Button>
      </footer>
    </Card>
  )
}

function WeekChart({ days, kind, target = 100, bestKey }: { days: ReturnType<typeof buildWeeklyRecap>["days"]; kind: "sleep" | "mood"; target?: number; bestKey?: string }) {
  const values = days.map((d) => kind === "sleep" ? d.night?.durationMin ?? null : d.mood)
  const max = kind === "sleep" ? Math.max(target * 1.15, ...values.map((v) => v ?? 0)) : 100
  return (
    <figure className="mt-6" aria-label={kind === "sleep" ? "Продолжительность сна по дням" : "Средний баланс состояния по дням"}>
      <div className="relative">
        {kind === "sleep" && <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/40" style={{ top: `${100 - target / max * 100}%` }} aria-hidden />}
        <div className="relative grid h-[140px] grid-cols-7 gap-2" aria-hidden>
          {values.map((value, n) => <div key={days[n].key} className="flex h-full items-end justify-center">
            {value !== null ? <div className={cn("w-full max-w-8 rounded-t-xl rounded-b-md", kind === "mood" || bestKey === days[n].key ? "bg-lime" : "bg-white/65")} style={{ height: `${Math.max(2, value / max * 100)}%` }} /> : <span className="mb-1 h-0.5 w-3 rounded-full bg-white/25" />}
          </div>)}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2 text-center" aria-hidden>
        {days.map((day, n) => <div key={day.key}>
          <div className="text-[10px] font-medium">{values[n] === null ? "—" : kind === "sleep" ? hm(values[n]!) : `${values[n]}%`}</div>
          <div className="mt-1 text-[10px] text-ink-2">{weekdayShort(parseKey(day.key))}</div>
        </div>)}
      </div>
      <figcaption className="sr-only">{days.map((day, n) => `${dayMonthShort(parseKey(day.key))}: ${values[n] === null ? "нет записи" : kind === "sleep" ? durationRu(values[n]!) : `${values[n]}%`}`).join("; ")}</figcaption>
    </figure>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="glass-inset rounded-[22px] px-4 py-3"><div className="text-[11px] text-ink-2">{label}</div><div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">{value}</div></div>
}

function Activity({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return <div className="glass-inset flex min-h-[140px] flex-col rounded-[26px] p-4"><span className="mb-4 text-ink-2 [&_svg]:size-4" aria-hidden>{icon}</span><span className="text-[34px] font-semibold leading-none tracking-[-0.04em]">{value}</span><span className="mt-2 text-[12px] leading-snug text-ink-2">{label}</span></div>
}

export function RecapSheet() {
  const { sheet, openSheet } = useStore()
  const close = () => openSheet(null)
  return <Sheet open={sheet === "recap"} onClose={close} title="Итоги недели" bare className="bg-transparent"><RecapStories onClose={close} /></Sheet>
}
