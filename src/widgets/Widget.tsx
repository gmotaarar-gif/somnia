import * as React from "react"
import { AlarmClock, ArrowUpRight, Flame, HeartPulse, ListChecks, Plus, Sparkles, Zap } from "lucide-react"
import { dayPlan, wakeOptions, who5Label } from "@/lib/features"
import { cn } from "@/lib/cn"
import { bedtimeCountdown, moodPct, qualityLabel } from "@/lib/metrics"
import { deviationMinutes, hm, pluralRu } from "@/lib/time"
import { getValenceLabel } from "@/lib/valence"
import { useNow, useSummary } from "@/store/derived"
import { useStore, type Widget } from "@/store/store"
import { Card, CardTitle } from "@/ui/Card"
import { Arc, DotRow, DotTrack, Ring, Wave } from "@/ui/charts"
import { Toggle } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { WATER_GOAL_ML, WIDGET_META } from "@/widgets/catalog"

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="glass-inset grid size-9 shrink-0 place-items-center rounded-full text-ink [&_svg]:size-4">
      {children}
    </span>
  )
}

function Head({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <CardTitle sub={sub}>{title}</CardTitle>
      {right && <span data-widget-action className="shrink-0">{right}</span>}
    </div>
  )
}

function Figure({
  value,
  unit,
  className,
  shape = "round",
}: {
  value: string | number
  unit?: string
  className?: string
  shape?: "round" | "square"
}) {
  return (
    <div className="flex items-end gap-2">
      <Dots value={value} shape={shape} className={cn("text-[32px]", className)} />
      {unit && <span className="pb-px text-[12px] leading-none text-ink-2">{unit}</span>}
    </div>
  )
}

const MILESTONES = [7, 14, 30, 60, 100, 200, 365]

interface BodyProps {
  widget: Widget
  wide: boolean
}

function useWidgetAction(widget: Widget): { run: () => void; label: string } {
  const s = useStore()
  switch (widget.kind) {
    case "streak":
    case "week":
      return { run: () => s.openSheet("recap"), label: "Открыть итоги недели" }
    case "water":
      return { run: () => s.addWater(250), label: "Добавить 250 мл воды" }
    case "mood":
      return { run: () => s.openSheet("mood"), label: "Чек-ин состояния" }
    case "evening":
      return { run: () => s.patch({ eveningMode: !s.eveningMode }), label: "Переключить вечерний режим" }
    case "energy":
      return { run: () => s.openSheet("sleep"), label: "Записать сон" }
    case "plan":
      return { run: () => s.setTab("today"), label: "План дня" }
    case "cycle":
      return { run: () => s.openSheet("cycles"), label: "Открыть калькулятор циклов" }
    case "wellbeing":
      return { run: () => s.openSheet("wellbeing"), label: "Пройти тест благополучия" }
    case "custom":
      return { run: () => s.bumpWidget(widget.id), label: `Добавить ${widget.step ?? 1} ${widget.unit ?? ""}` }
    default:
      return { run: () => s.setTab("sleep"), label: "Открыть сон" }
  }
}

function EveningBody({ wide }: { wide: boolean }) {
  const store = useStore()
  const { bedGoal, wakeGoal } = store
  const now = useNow()
  const c = bedtimeCountdown(bedGoal, wakeGoal, now)
  const on = store.eveningMode
  return (
    <>
      <Head
        title={wide ? "Вечерний режим" : "Вечер"}
        sub={wide ? `Отбой в ${bedGoal} · напоминание ${store.reminderTime}` : undefined}
        right={<Toggle checked={on} onChange={(v) => store.patch({ eveningMode: v })} label="Вечерний режим" />}
      />
      <div className={cn("mt-auto transition-opacity duration-250", !on && "opacity-40")}>
        <Figure
          value={c.past ? "0:00" : hm(c.minutes)}
          unit={wide ? (c.past ? "пора спать" : "до отбоя") : undefined}
          className={wide ? "text-[40px]" : undefined}
        />
        {!wide && <div className="mt-2 text-[12px] text-ink-2">{c.past ? "пора спать" : "до отбоя"}</div>}
        <DotTrack value={c.dayProgress} count={wide ? 44 : 22} className="-mx-[18px] mt-3" />
      </div>
    </>
  )
}

function Body({ widget, wide }: BodyProps) {
  const store = useStore()
  const sum = useSummary()
  const { nights, bedGoal } = store

  switch (widget.kind) {
    case "streak": {
      const next = MILESTONES.find((m) => m > sum.streak) ?? sum.streak + 100
      return (
        <>
          <Head title="Серия" right={wide ? <Badge><Flame /></Badge> : undefined} sub={wide ? `До отметки ${next}` : undefined} />
          <div className="mt-auto">
            <Figure value={sum.streak} unit={pluralRu(sum.streak, ["день", "дня", "дней"])} />
            <DotTrack value={sum.streak / next} count={wide ? 44 : 22} className="-mx-[18px] mt-3" />
          </div>
        </>
      )
    }
    case "sleep": {
      const last = sum.last
      return (
        <>
          <Head title="Сон" sub={wide && last ? `${last.bedtime} → ${last.wakeTime}` : undefined} right={<Badge><ArrowUpRight /></Badge>} />
          <div className={cn("mt-auto", wide && "flex items-end justify-between gap-6")}>
            {!wide && <Wave values={sum.week.map((n) => n.durationMin)} color="#f0a8dc" height={56} className="mb-2" />}
            <div>
              <Figure value={last ? hm(last.durationMin) : "0:00"} shape="square" className={wide ? "text-[44px]" : undefined} />
              <div className="mt-2 text-[12px] text-ink-2">{last ? "часов прошлой ночью" : "нет записей"}</div>
            </div>
            {wide && <Wave values={sum.week.map((n) => n.durationMin)} color="#f0a8dc" height={70} className="max-w-[52%]" />}
          </div>
        </>
      )
    }
    case "water": {
      const ml = store.water.ml
      return (
        <>
          <Head title="Вода" sub={wide ? `Цель ${WATER_GOAL_ML} мл` : undefined} right={<Badge><Plus /></Badge>} />
          <div className={cn("mt-auto", wide && "flex items-end justify-between gap-6")}>
            {!wide && <Arc value={ml / WATER_GOAL_ML} className="-mx-[18px] mb-3 w-[calc(100%+36px)]" />}
            <div>
              <Figure value={ml} unit="мл" shape="square" className={wide ? "text-[44px]" : undefined} />
              {wide && <div className="mt-2 text-[12px] text-ink-2">осталось {Math.max(0, WATER_GOAL_ML - ml)} мл</div>}
            </div>
            {wide && <Arc value={ml / WATER_GOAL_ML} className="max-w-[50%]" />}
          </div>
        </>
      )
    }
    case "mood": {
      const m = sum.lastMood
      const pct = m ? moodPct(m.valence) : 0
      const ring = (
        <Ring value={pct / 100} size={wide ? 118 : 96} stroke={2.4} color="#c9ec5a">
          <Dots value={m ? pct : "--"} shape="square" className={wide ? "text-[30px]" : "text-[24px]"} />
        </Ring>
      )
      return wide ? (
        <div className="flex h-full items-center justify-between gap-5">
          <div className="flex h-full min-w-0 flex-col justify-between">
            <CardTitle sub="Последний чек-ин">Состояние</CardTitle>
            <div>
              <div className="text-[20px] font-semibold leading-tight tracking-[-0.02em]">
                {m ? getValenceLabel(m.valence) : "Нет записей"}
              </div>
              <div className="mt-1.5 truncate text-[12px] text-ink-2">{m?.emotions.slice(0, 3).join(" · ") || "Отметьте, как вы"}</div>
            </div>
          </div>
          {ring}
        </div>
      ) : (
        <>
          <Head title="Состояние" />
          <div className="mt-auto flex flex-col items-center gap-2">
            {ring}
            <div className="max-w-full truncate text-[11px] text-ink-2">{m ? getValenceLabel(m.valence) : "Отметьте, как вы"}</div>
          </div>
        </>
      )
    }
    case "evening":
      return <EveningBody wide={wide} />
    case "week": {
      const span = nights.slice(wide ? -28 : -14)
      return (
        <>
          <Head title="Неделя сна" sub="Среднее за 7 ночей" right={wide ? <Badge><Sparkles /></Badge> : undefined} />
          <div className="mt-auto">
            <Figure value={hm(sum.avgDuration)} unit="ч" shape="square" className={wide ? "text-[46px]" : undefined} />
            <DotRow values={span.map((n) => n.durationMin >= sum.target * 0.93)} className="mt-4" size={wide ? 6 : 5} />
          </div>
        </>
      )
    }
    case "energy": {
      const q = sum.last?.quality ?? 0
      return (
        <>
          <Head title="Бодрость" sub={wide ? qualityLabel(q) : undefined} right={<Badge><Zap /></Badge>} />
          <div className={cn("mt-auto", wide && "flex items-end justify-between gap-6")}>
            <div>
              <Figure value={q} unit="/ 100" shape="square" className={wide ? "text-[44px]" : undefined} />
              {!wide && <div className="mt-2 truncate text-[12px] text-ink-2">{qualityLabel(q)}</div>}
            </div>
            {wide && <Wave values={sum.week.map((n) => n.quality)} color="#ffb070" height={70} className="max-w-[52%]" />}
          </div>
        </>
      )
    }
    case "rhythm": {
      const devs = sum.week.map((n) => deviationMinutes(n.bedtime, bedGoal))
      return (
        <>
          <Head title="Режим" sub={`План отбоя ${bedGoal}`} />
          <div className="mt-auto flex items-end justify-between gap-5">
            <div className="shrink-0">
              <Figure value={`${sum.accuracy}%`} className={wide ? "text-[40px]" : undefined} />
              <div className="mt-2 text-[12px] text-ink-2">ночей вовремя</div>
            </div>
            {wide && (
              <div className="relative flex h-[76px] flex-1 items-center justify-between">
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/25" />
                {devs.map((d, i) => (
                  <span
                    key={i}
                    title={`${d > 0 ? "+" : ""}${d} мин`}
                    className={cn("relative size-[9px] rounded-full", Math.abs(d) <= 30 ? "bg-lime shadow-[0_0_10px_rgb(217_242_74/0.6)]" : "bg-white/70")}
                    style={{ translate: `0 ${Math.max(-32, Math.min(32, (d / 90) * 32))}px` }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )
    }
    case "debt":
      return (
        <>
          <Head title="Долг сна" sub={wide ? "Недосып за 7 ночей" : undefined} />
          <div className="mt-auto">
            <Figure value={hm(sum.debt)} unit="ч" shape="square" className={wide ? "text-[44px]" : undefined} />
            <div className="mt-2 text-[12px] text-ink-2">{sum.debt > 90 ? "верните +20 мин к отбою" : "в пределах нормы"}</div>
          </div>
        </>
      )
    case "plan": {
      const plan = dayPlan({
        nights,
        moods: store.moods,
        waterMl: store.water.ml,
        waterGoal: WATER_GOAL_ML,
        ritualDone: store.ritual.done.length,
      })
      const done = plan.filter((p) => p.done).length
      return (
        <>
          <Head title="План дня" sub={wide ? plan.find((p) => !p.done)?.label ?? "Всё выполнено" : undefined} right={<Badge><ListChecks /></Badge>} />
          <div className="mt-auto">
            <Figure value={`${done}/${plan.length}`} unit={wide ? "шагов сделано" : undefined} shape="square" className={wide ? "text-[44px]" : undefined} />
            <DotRow values={plan.map((p) => p.done)} className="mt-4" size={wide ? 7 : 6} />
          </div>
        </>
      )
    }
    case "cycle": {
      const best = wakeOptions(bedGoal).find((o) => o.best)!
      return (
        <>
          <Head title="Циклы сна" sub={wide ? `Если лечь в ${bedGoal}` : undefined} right={<Badge><AlarmClock /></Badge>} />
          <div className="mt-auto">
            <Figure value={best.time} unit={wide ? "лучший подъём" : undefined} className={wide ? "text-[44px]" : undefined} />
            <div className="mt-2 text-[12px] text-ink-2">{best.cycles} циклов · {hm(best.sleepMin)} ч</div>
          </div>
        </>
      )
    }
    case "wellbeing": {
      const lastW = store.wellbeing[store.wellbeing.length - 1]
      return (
        <>
          <Head title={wide ? "Благополучие" : "WHO-5"} sub={wide ? "Индекс WHO-5" : undefined} right={<Badge><HeartPulse /></Badge>} />
          <div className="mt-auto">
            <Figure value={lastW ? lastW.score : "--"} unit="/ 100" shape="square" className={wide ? "text-[44px]" : undefined} />
            <div className="mt-2 text-[12px] text-ink-2">{lastW ? who5Label(lastW.score) : "пройдите тест"}</div>
          </div>
        </>
      )
    }
    case "custom": {
      const value = widget.value ?? 0
      const target = widget.target || 1
      return (
        <>
          <Head title={widget.title || "Мой виджет"} sub={wide ? `Цель ${target} ${widget.unit ?? ""}` : undefined} right={<Badge><Plus /></Badge>} />
          <div className="mt-auto">
            <Figure value={value} unit={`/ ${target} ${widget.unit ?? ""}`} className={wide ? "text-[40px]" : undefined} />
            <DotTrack value={value / target} count={wide ? 44 : 22} className="-mx-[18px] mt-3" marker={value < target} />
          </div>
        </>
      )
    }
  }
}

export const WidgetTile = React.memo(function WidgetTile({
  widget,
  interactive = true,
  className,
}: {
  widget: Widget
  interactive?: boolean
  className?: string
}) {
  const action = useWidgetAction(widget)
  const wide = widget.size === "2x1"
  return (
    <Card
      tone={widget.tone}
      className={cn("h-full w-full text-left", className)}
      {...(interactive
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": `${widget.kind === "custom" ? widget.title : WIDGET_META[widget.kind].title}. ${action.label}`,
            onClick: action.run,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                action.run()
              }
            },
          }
        : {})}
    >
      <div className="flex h-full flex-col p-[18px]">
        <Body widget={widget} wide={wide} />
      </div>
    </Card>
  )
})
