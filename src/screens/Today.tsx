import * as React from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, Plus } from "lucide-react"
import { ARTICLES } from "@/lib/articles"
import { indexLabel, moodPct, qualityLabel } from "@/lib/metrics"
import { useRiseIn } from "@/ui/MotionProvider"
import { dayMonth, greeting, hm, pluralRu, weekdayShort } from "@/lib/time"
import { getValenceLabel } from "@/lib/valence"
import { useNow, useSummary } from "@/store/derived"
import { useStore } from "@/store/store"
import { DayPlan } from "@/screens/TodayExtras"
import { TopBar } from "@/shell/TopBar"
import { Card } from "@/ui/Card"
import { NightLine } from "@/ui/NightLine"
import { Button, Chip, IconButton, SectionHead } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { WidgetGrid } from "@/widgets/WidgetGrid"
import { Mascot } from "@/ui/Mascot"

const onKey = (run: () => void) => (e: React.KeyboardEvent) => {
  if (e.target !== e.currentTarget) return
  if (e.key !== "Enter" && e.key !== " ") return
  e.preventDefault()
  run()
}

function Tile({
  title,
  label,
  icon,
  note,
  onClick,
  children,
}: {
  title: string
  label: string
  icon: React.ReactNode
  note: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="press tile squircle flex h-[138px] min-w-0 flex-col p-4 text-left">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[14px] text-white/80">{title}</span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/14 [&_svg]:size-4 [&_svg]:[stroke-width:1.75]">{icon}</span>
      </span>
      <span className="mt-auto block">{children}</span>
      <span className="mt-2.5 block truncate text-[12px] text-white/70">{note}</span>
    </button>
  )
}

export function TodayScreen() {
  const riseIn = useRiseIn()
  const { userName, widgets, readArticles, setTab, openSheet, editing, setEditing, bedGoal, wakeGoal } = useStore()
  const sum = useSummary()
  const now = useNow(60_000)
  const last = sum.last
  const mood = sum.lastMood
  const article = ARTICLES.find((a) => !readArticles.includes(a.id)) ?? ARTICLES[0]
  const shown = widgets.filter((w) => w.visible).length

  return (
    <>
      <TopBar title={userName ? `${greeting(now)}, ${userName}` : greeting(now)} sub={`${weekdayShort(now)}, ${dayMonth(now)}`} action={<Mascot size={48} />} />

      <motion.div {...riseIn(0)}>
        <Card tone="nightfall" r="lg" grain>
          <div
            role="button"
            tabIndex={0}
            aria-label="Прошлая ночь. Открыть сон"
            onClick={() => setTab("sleep")}
            onKeyDown={onKey(() => setTab("sleep"))}
            className="flex min-h-[278px] cursor-pointer flex-col rounded-[30px] p-6 -outline-offset-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[17px] font-medium leading-tight tracking-[-0.02em]">Прошлая ночь</span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/14">
                <ArrowUpRight className="size-4" strokeWidth={1.75} />
              </span>
            </div>
            <div className="mt-7 flex items-end gap-3">
              {last ? <Dots value={hm(last.durationMin)} shape="square" className="text-[64px]" /> : <><span className="text-[64px] leading-none">—</span><Mascot size={80} /></>}
              {last && <span className="pb-0.5 text-[17px] text-white/65">ч</span>}
            </div>
            {last ? (
              <>
                <p className="mt-4 text-[15px] font-medium leading-snug">{qualityLabel(last.quality)}</p>
                <p className="mt-1 text-[13px] text-white/65">
                  {last.bedtime} → {last.wakeTime},{" "}
                  {last.awakenings ? `${last.awakenings} ${pluralRu(last.awakenings, ["пробуждение", "пробуждения", "пробуждений"])}` : "без пробуждений"}
                </p>
                <div className="mt-auto pt-8">
                  <NightLine bedtime={last.bedtime} wakeTime={last.wakeTime} goal={{ bed: bedGoal, wake: wakeGoal }} />
                </div>
              </>
            ) : (
              <>
                <p className="mt-4 text-[13px] text-white/70">Запишите первую ночь: это займёт минуту.</p>
                <Button
                  className="mt-auto self-start"
                  onClick={(e) => {
                    e.stopPropagation()
                    openSheet("sleep")
                  }}
                >
                  <Plus /> Записать сон
                </Button>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 px-2.5 pb-2.5">
            <Tile
              title="Состояние"
              label="Состояние. Сделать чек-ин"
              icon={<Plus />}
              note={mood ? getValenceLabel(mood.valence) : "Сделайте чек-ин"}
              onClick={() => openSheet("mood")}
            >
              {mood ? <Dots value={`${moodPct(mood.valence)}%`} className="text-[30px]" /> : <span className="text-[30px] leading-none">—</span>}
            </Tile>
            <Tile
              title="Неделя"
              label="Индекс недели. Открыть итоги"
              icon={<ArrowUpRight />}
              note={sum.week.length ? `${indexLabel(sum.index)}${sum.indexDelta ? `, ${sum.indexDelta > 0 ? "+" : ""}${sum.indexDelta}` : ""}` : "Пока нет данных"}
              onClick={() => openSheet("recap")}
            >
              {sum.week.length ? <Dots value={sum.index} shape="square" className="text-[30px]" /> : <span className="text-[30px] leading-none">—</span>}
            </Tile>
          </div>
        </Card>
      </motion.div>

      <motion.div {...riseIn(1)} className="mt-10">
        <DayPlan />
      </motion.div>

      <motion.section {...riseIn(2)} className="mt-10" aria-label="Почитать">
        <SectionHead title="Почитать" hint={`${article.tag} · ${article.min} мин`} />
        <Card tone={article.tone} className="mt-4">
          <button
            type="button"
            aria-label={`Читать: ${article.title}`}
            onClick={() => openSheet("article", article.id)}
            className="press flex min-h-[148px] w-full flex-col p-5 text-left"
          >
            <span className="grid size-9 place-items-center self-end rounded-full bg-white/14">
              <ArrowUpRight className="size-4" strokeWidth={1.75} />
            </span>
            <span className="mt-auto block pr-6 text-[22px] font-medium leading-[1.12] tracking-[-0.035em]">{article.title}</span>
          </button>
        </Card>
      </motion.section>

      <motion.section {...riseIn(3)} className="mt-10" aria-label="Виджеты">
        <SectionHead title="Виджеты" hint={editing ? "Перетащите, смените размер или цвет" : undefined}>
          {(shown > 0 || editing) && (
            <Chip active={editing} onClick={() => setEditing(!editing)}>
              {editing ? "Готово" : "Изменить"}
            </Chip>
          )}
          <IconButton label="Добавить виджет" size="sm" className="size-9" onClick={() => openSheet("gallery")}>
            <Plus />
          </IconButton>
        </SectionHead>
        <div className="mt-4">
          <WidgetGrid />
        </div>
      </motion.section>
    </>
  )
}
