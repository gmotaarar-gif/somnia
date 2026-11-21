import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/cn"
import { emotionCounts, indexLabel, nightScore, sleepMoodLink, weeklyGoalOptions } from "@/lib/metrics"
import { DUR, EASE_OUT } from "@/lib/motion"
import { dayMonthShort, daysAgo, durationRu, hm, parseKey, pluralRu, relativeDay, weekdayShort } from "@/lib/time"
import { useSummary } from "@/store/derived"
import { useStore } from "@/store/store"
import { RITUAL } from "@/screens/Practices"
import { Card, type CardTone } from "@/ui/Card"
import { Bars, Wave } from "@/ui/charts"
import { Button, IconButton } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { Sheet } from "@/ui/Sheet"

const TONES: CardTone[] = ["night", "violet", "mint", "sunset", "forest"]

function RecapStories({ onClose }: { onClose: () => void }) {
  const { nights, moods, bedGoal, wakeGoal, breath, ritual, weeklyGoal, patch } = useStore()
  const sum = useSummary()
  const [i, setI] = React.useState(0)
  const week = sum.week
  const weekMoods = moods.filter((m) => new Date(m.at) >= daysAgo(6))
  const best = week.reduce<(typeof week)[number] | undefined>(
    (b, n) => (!b || nightScore(n, bedGoal, wakeGoal) > nightScore(b, bedGoal, wakeGoal) ? n : b),
    undefined
  )
  const emotions = emotionCounts(weekMoods).slice(0, 4)
  const link = sleepMoodLink(nights, moods)
  const goals = weeklyGoalOptions(sum, weekMoods.length)
  const [goal, setGoal] = React.useState(weeklyGoal?.id ?? goals[0]?.id)
  const range =
    week.length > 1
      ? `${dayMonthShort(parseKey(week[0].dateKey))} – ${dayMonthShort(parseKey(week[week.length - 1].dateKey))}`
      : "Эта неделя"
  const last = i === TONES.length - 1

  const go = (d: number) => setI((v) => Math.max(0, Math.min(TONES.length - 1, v + d)))
  const accept = () => {
    const g = goals.find((x) => x.id === goal)
    if (g) patch({ weeklyGoal: { id: g.id, text: g.text } })
    onClose()
  }

  const slides = [
    <Slide key="index" kicker={range} title="Ваша неделя">
      <div className="flex flex-1 flex-col items-center justify-center">
        <Dots value={sum.index} shape="square" className="text-[108px]" />
        <div className="mt-6 text-[22px] font-semibold tracking-[-0.02em]">{indexLabel(sum.index)}</div>
        <p className="mt-2 max-w-[300px] text-center text-[14px] leading-relaxed text-ink-2">
          Индекс сна из 100
          {sum.indexDelta !== 0 && `, на ${Math.abs(sum.indexDelta)} ${sum.indexDelta > 0 ? "выше" : "ниже"}, чем неделей раньше`}.
        </p>
      </div>
    </Slide>,
    <Slide key="sleep" kicker="Сон" title={`В среднем ${durationRu(sum.avgDuration)}`}>
      <div className="mt-8 flex items-end gap-2">
        <Dots value={hm(sum.avgDuration)} className="text-[64px]" />
        <span className="pb-1 text-[13px] text-ink-2">ч за ночь</span>
      </div>
      <div className="mt-8 h-[150px]">
        <Bars
          values={week.map((n) => n.durationMin)}
          labels={week.map((n) => weekdayShort(parseKey(n.dateKey)))}
          goal={sum.target}
          highlight={best ? week.indexOf(best) : undefined}
          max={Math.max(sum.target * 1.12, ...week.map((n) => n.durationMin))}
        />
      </div>
      <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
        <Fact label="Лучшая ночь" value={best ? relativeDay(best.dateKey) : "—"} />
        <Fact label="По цели" value={`${sum.goalNights} из ${week.length}`} />
        <Fact label="Точность отбоя" value={`${sum.accuracy}%`} />
        <Fact label="Долг сна" value={durationRu(sum.debt)} />
      </div>
    </Slide>,
    <Slide key="mood" kicker="Состояние" title={sum.moodAvg != null ? "Баланс настроения" : "Пока без чек-инов"}>
      <div className="mt-8 flex items-end gap-2">
        <Dots value={sum.moodAvg != null ? `${sum.moodAvg}%` : "--"} className="text-[64px]" />
        <span className="pb-1 text-[13px] text-ink-2">в среднем</span>
      </div>
      <Wave values={weekMoods.map((m) => m.valence)} color="#f4ffb0" height={84} fill className="mt-8" />
      <div className="mt-6 flex flex-wrap gap-2">
        {emotions.map((e) => (
          <span key={e.name} className="glass-inset rounded-full px-3.5 py-2 text-[13px]">
            {e.name} <span className="text-ink-3">{e.count}</span>
          </span>
        ))}
      </div>
      <p className="mt-auto pt-6 text-[15px] leading-relaxed text-ink-2">
        {link > 3
          ? `После ночей от 7 часов настроение выше на ${link} ${pluralRu(link, ["пункт", "пункта", "пунктов"])} из 100. Сон остаётся вашим главным рычагом.`
          : `${weekMoods.length} ${pluralRu(weekMoods.length, ["чек-ин", "чек-ина", "чек-инов"])} за неделю. Чем их больше, тем точнее связи со сном.`}
      </p>
    </Slide>,
    <Slide key="habits" kicker="Привычки" title="Что вы делали для себя">
      <div className="mt-auto grid grid-cols-2 gap-3">
        <Big label={`${pluralRu(sum.streak, ["день", "дня", "дней"])} подряд`} value={sum.streak} />
        <Big label="чек-инов" value={weekMoods.length} />
        <Big label="мин дыхания сегодня" value={breath.min.toFixed(1)} />
        <Big label="шагов ритуала" value={`${ritual.done.length}/${RITUAL.length}`} />
      </div>
    </Slide>,
    <Slide key="goal" kicker="Следующая неделя" title="Выберите одну цель">
      <div className="mt-8 space-y-2.5" role="radiogroup" aria-label="Цель на неделю">
        {goals.map((g) => {
          const on = goal === g.id
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setGoal(g.id)}
              className={cn(
                "press flex w-full items-center gap-4 rounded-[26px] p-4 text-left transition-colors duration-250",
                on ? "bg-white text-black" : "glass-inset"
              )}
            >
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", on ? "bg-black text-white" : "ring-1 ring-inset ring-white/30 text-transparent")}>
                <Check className="size-4" strokeWidth={3} />
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold leading-snug tracking-[-0.01em]">{g.text}</span>
                <span className={cn("mt-0.5 block text-[13px]", on ? "text-black/60" : "text-ink-3")}>{g.why}</span>
              </span>
            </button>
          )
        })}
      </div>
      <Button className="mt-auto w-full" onClick={accept}>
        Принять цель
      </Button>
    </Slide>,
  ]

  return (
    <Card tone={TONES[i]} r="lg" className="flex h-full flex-col rounded-b-none">
      <div className="relative z-10 flex items-center gap-3 px-5 pt-8">
        <div className="flex flex-1 gap-1.5">
          {TONES.map((_, n) => (
            <span key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <span
                className="block h-full origin-left rounded-full bg-white transition-transform duration-500 ease-out-smooth"
                style={{ transform: `scaleX(${n <= i ? 1 : 0})` }}
              />
            </span>
          ))}
        </div>
        <IconButton label="Закрыть" size="sm" className="size-9" onClick={onClose}>
          <X />
        </IconButton>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={i}
            className="absolute inset-0 flex flex-col px-6 pb-6 pt-6"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0, transition: { duration: DUR.medium, ease: EASE_OUT } }}
            exit={{ opacity: 0, x: -16, transition: { duration: DUR.quick } }}
          >
            {slides[i]}
          </motion.div>
        </AnimatePresence>
      </div>

      {!last && (
        <div className="relative z-10 flex gap-3 px-6 pb-[max(var(--safe-bottom),22px)]">
          {i > 0 && (
            <Button variant="glass" className="flex-1" onClick={() => go(-1)}>
              Назад
            </Button>
          )}
          <Button className="flex-[2]" onClick={() => go(1)}>
            Дальше
          </Button>
        </div>
      )}
    </Card>
  )
}

function Slide({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-2">{kicker}</div>
      <h2 className="mt-2 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em]">{title}</h2>
      {children}
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-inset rounded-[22px] px-4 py-3">
      <div className="text-[12px] text-ink-2">{label}</div>
      <div className="mt-1 text-[17px] font-semibold tracking-[-0.01em]">{value}</div>
    </div>
  )
}

function Big({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-inset flex h-[150px] flex-col justify-between rounded-[30px] p-5">
      <Dots value={value} shape="square" className="text-[40px]" />
      <div className="text-[13px] leading-snug text-ink-2">{label}</div>
    </div>
  )
}

export function RecapSheet() {
  const { sheet, openSheet } = useStore()
  const close = () => openSheet(null)
  return (
    <Sheet open={sheet === "recap"} onClose={close} title="Итоги недели" bare className="bg-transparent">
      <RecapStories onClose={close} />
    </Sheet>
  )
}
