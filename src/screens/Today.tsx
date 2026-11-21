import * as React from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, ChevronRight, Info, Plus, Sparkles } from "lucide-react"
import { cn } from "@/lib/cn"
import { indexLabel, qualityLabel } from "@/lib/metrics"
import { riseIn } from "@/lib/motion"
import { dayMonth, dayMonthShort, greeting, hm, parseKey, weekdayShort } from "@/lib/time"
import { getValenceLabel } from "@/lib/valence"
import { useNow, useSummary } from "@/store/derived"
import { useStore } from "@/store/store"
import { AwardsStrip, DayPlan } from "@/screens/TodayExtras"
import { TopBar } from "@/shell/TopBar"
import { Card } from "@/ui/Card"
import { Bars, Orbits, Wave } from "@/ui/charts"
import { Chip, IconButton, SectionHead } from "@/ui/controls"
import { Dots, DotsCount } from "@/ui/Dots"
import { WidgetGrid } from "@/widgets/WidgetGrid"

function HeroShell({
  tone,
  title,
  icon,
  label,
  onClick,
  children,
}: {
  tone: React.ComponentProps<typeof Card>["tone"]
  title: string
  icon: React.ReactNode
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Card
      tone={tone}
      r="lg"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className="h-[348px] w-full cursor-pointer"
    >
      <div className="flex h-full flex-col p-6">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium">{title}</span>
          <span className="glass-inset grid size-9 place-items-center rounded-full [&_svg]:size-4">{icon}</span>
        </div>
        {children}
      </div>
    </Card>
  )
}

export function TodayScreen() {
  const { userName, nights, moods, setTab, openSheet, editing, setEditing } = useStore()
  const sum = useSummary()
  const now = useNow(60_000)
  const [slide, setSlide] = React.useState(0)
  const track = React.useRef<HTMLDivElement>(null)

  const last = sum.last
  const week = sum.week
  const moodTrail = moods.slice(-10).map((m) => m.valence)
  const range =
    week.length > 1
      ? `${dayMonthShort(parseKey(week[0].dateKey))} – ${dayMonthShort(parseKey(week[week.length - 1].dateKey))}`
      : "Эта неделя"

  const onScroll = () => {
    const el = track.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    if (!first) return
    setSlide(Math.round(el.scrollLeft / (first.offsetWidth + 12)))
  }

  const slides = [
    {
      caption: "Прошлая ночь",
      node: (
        <HeroShell tone="violet" title="Прошлая ночь" icon={<Info />} label="Прошлая ночь. Открыть сон" onClick={() => setTab("sleep")}>
          <div className="mt-7 flex flex-col items-center">
            <DotsCount value={last?.durationMin ?? 0} format={(v) => hm(Math.round(v))} className="text-[58px]" />
            <span className="mt-3 text-[13px] text-ink-2">
              {last ? `часов сна · ${last.bedtime} → ${last.wakeTime}` : "добавьте первую запись"}
            </span>
          </div>
          <Orbits className="-mx-6 mt-auto w-[calc(100%+48px)]" points={[0.2, (last?.quality ?? 60) / 100, 0.78]} />
        </HeroShell>
      ),
    },
    {
      caption: "Индекс недели",
      node: (
        <HeroShell tone="night" title="Индекс недели" icon={<Sparkles />} label="Индекс недели. Открыть итоги" onClick={() => openSheet("recap")}>
          <div className="mt-7 flex flex-col items-center">
            <DotsCount value={sum.index} shape="square" className="text-[58px]" />
            <span className="mt-3 text-[13px] text-ink-2">
              {indexLabel(sum.index)}
              {sum.indexDelta !== 0 && ` · ${sum.indexDelta > 0 ? "+" : ""}${sum.indexDelta} к прошлой`}
            </span>
          </div>
          <div className="mt-auto h-[108px]">
            <Bars
              values={week.map((n) => n.durationMin)}
              labels={week.map((n) => weekdayShort(parseKey(n.dateKey)))}
              goal={sum.target}
              max={Math.max(sum.target * 1.12, ...week.map((n) => n.durationMin))}
            />
          </div>
        </HeroShell>
      ),
    },
    {
      caption: "Состояние",
      node: (
        <HeroShell tone="mint" title="Состояние" icon={<Plus />} label="Состояние. Сделать чек-ин" onClick={() => openSheet("mood")}>
          <div className="mt-7 flex flex-col items-center">
            {sum.moodNow != null ? <DotsCount value={sum.moodNow} format={(v) => `${Math.round(v)}%`} className="text-[58px]" /> : <Dots value="--" className="text-[58px]" />}
            <span className="mt-3 text-[13px] text-ink-2">
              {sum.lastMood ? getValenceLabel(sum.lastMood.valence) : "сделайте первый чек-ин"}
            </span>
          </div>
          <Wave values={moodTrail} color="#f4ffb0" height={84} fill className="mt-auto" />
        </HeroShell>
      ),
    },
  ]

  return (
    <>
      <TopBar
        title={userName ? `${greeting(now)}, ${userName}` : greeting(now)}
        sub={`${weekdayShort(now)}, ${dayMonth(now)}`}
        action={
          <IconButton label="Итоги недели" onClick={() => openSheet("recap")}>
            <Sparkles />
          </IconButton>
        }
      />

      <motion.section {...riseIn(0)} aria-label="Главное за сегодня">
        <div
          ref={track}
          onScroll={onScroll}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[11%]"
        >
          {slides.map((s, i) => (
            <div key={i} className="w-full shrink-0 snap-center">
              {s.node}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-col items-center gap-3">
          <span className="text-[13px] font-medium">{slides[slide]?.caption}</span>
          <div className="flex items-center gap-1.5" aria-hidden>
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn("rounded-full transition-all duration-250", i === slide ? "size-[5px] bg-white" : "size-[3px] bg-white/40")}
              />
            ))}
          </div>
        </div>
      </motion.section>

      <motion.button
        {...riseIn(1)}
        type="button"
        onClick={() => openSheet("recap")}
        className="press glass mt-6 flex w-full items-center gap-4 rounded-[30px] p-3 pr-4 text-left"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">
          <Sparkles className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-[-0.01em]">Итоги недели готовы</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">
            {range} · {sum.goalNights} из {week.length} ночей по цели
            {last ? ` · ${qualityLabel(last.quality).toLowerCase()}` : ""}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-3" />
      </motion.button>

      <motion.div {...riseIn(2)} className="mt-8">
        <DayPlan />
      </motion.div>

      <motion.section {...riseIn(2)} className="mt-8" aria-label="Виджеты">
        <SectionHead
          title="Виджеты"
          hint={editing ? "Перетащите, смените размер или цвет" : `${nights.length} ночей в журнале`}
        >
          <Chip active={editing} onClick={() => setEditing(!editing)}>
            {editing ? "Готово" : "Изменить"}
          </Chip>
          <IconButton label="Добавить виджет" size="sm" className="size-9" onClick={() => openSheet("gallery")}>
            <Plus />
          </IconButton>
        </SectionHead>
        <div className="mt-4">
          <WidgetGrid />
        </div>
      </motion.section>

      <motion.div {...riseIn(3)} className="mt-8">
        <AwardsStrip />
      </motion.div>

      <motion.button
        {...riseIn(3)}
        type="button"
        onClick={() => setTab("mind")}
        className="press mt-8 flex w-full items-center justify-between gap-3 px-1 text-left text-[14px] text-ink-2 hover:text-ink"
      >
        Как сон влияет на настроение
        <ArrowUpRight className="size-4" />
      </motion.button>
    </>
  )
}
