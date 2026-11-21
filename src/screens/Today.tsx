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
import { Card, type CardTone } from "@/ui/Card"
import { Hypnogram } from "@/ui/SleepStages"
import { Button, Chip, IconButton, SectionHead } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { WidgetGrid } from "@/widgets/WidgetGrid"

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
  tone,
  onClick,
  children,
}: {
  title: string
  tone?: CardTone
  label: string
  icon: React.ReactNode
  note: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Card tone={tone} role="button" tabIndex={0} aria-label={label} onClick={onClick} onKeyDown={onKey(onClick)} className="cursor-pointer">
      <div className="flex h-[168px] flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium">{title}</span>
          <span className="grid size-8 place-items-center rounded-full bg-white/12 [&_svg]:size-4">{icon}</span>
        </div>
        <div className="mt-auto">{children}</div>
        <div className="mt-3 truncate text-[12px] text-white/70">{note}</div>
      </div>
    </Card>
  )
}

export function TodayScreen() {
  const riseIn = useRiseIn()
  const { userName, widgets, readArticles, setTab, openSheet, editing, setEditing } = useStore()
  const sum = useSummary()
  const now = useNow(60_000)
  const last = sum.last
  const mood = sum.lastMood
  const article = ARTICLES.find((a) => !readArticles.includes(a.id)) ?? ARTICLES[0]
  const shown = widgets.filter((w) => w.visible).length

  return (
    <>
      <TopBar title={userName ? `${greeting(now)}, ${userName}` : greeting(now)} sub={`${weekdayShort(now)}, ${dayMonth(now)}`} />

      <motion.div {...riseIn(0)}>
        <Card
          r="lg"
          role="button"
          tabIndex={0}
          aria-label="Прошлая ночь. Открыть сон"
          onClick={() => setTab("sleep")}
          onKeyDown={onKey(() => setTab("sleep"))}
          className="sleep-hero on-dark cursor-pointer"
        >
          <div className="flex min-h-[316px] flex-col p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] font-medium text-white/80">Прошлая ночь</span>
              {last && <span className="rounded-full bg-white/16 px-3 py-1.5 text-[12px] font-medium">{qualityLabel(last.quality)}</span>}
            </div>
            <div className="mt-8 flex items-end gap-3">
              {last ? <Dots value={hm(last.durationMin)} shape="square" className="text-[64px]" /> : <span className="text-[64px] leading-none">—</span>}
              {last && <span className="pb-0.5 text-[17px] text-white/65">ч</span>}
            </div>
            {last ? (
              <>
                <p className="mt-4 text-[13px] text-white/70">
                  {last.bedtime} → {last.wakeTime} ·{" "}
                  {last.awakenings ? `${last.awakenings} ${pluralRu(last.awakenings, ["пробуждение", "пробуждения", "пробуждений"])}` : "без пробуждений"}
                </p>
                <div className="mt-auto pt-7">
                  <Hypnogram night={last} compact />
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
        </Card>
      </motion.div>

      <motion.div {...riseIn(1)} className="mt-3 grid grid-cols-2 gap-3">
        <Tile
          title="Состояние"
          label="Состояние. Сделать чек-ин"
          icon={<Plus />}
          note={mood ? getValenceLabel(mood.valence) : "Сделайте чек-ин"}
          tone={!mood ? "ink" : mood.valence < -0.12 ? "dusk" : mood.valence < 0.3 ? "cobalt" : "moss"}
          onClick={() => openSheet("mood")}
        >
          {mood ? <Dots value={`${moodPct(mood.valence)}%`} className="text-[34px]" /> : <span className="text-[34px] leading-none">—</span>}
        </Tile>
        <Tile
          title="Неделя"
          label="Индекс недели. Открыть итоги"
          icon={<ArrowUpRight />}
          note={sum.week.length ? `${indexLabel(sum.index)}${sum.indexDelta ? ` · ${sum.indexDelta > 0 ? "+" : ""}${sum.indexDelta}` : ""}` : "Пока нет данных"}
          tone="ember"
          onClick={() => openSheet("recap")}
        >
          {sum.week.length ? <Dots value={sum.index} shape="square" className="text-[34px]" /> : <span className="text-[34px] leading-none">—</span>}
        </Tile>
      </motion.div>

      <motion.div {...riseIn(2)} className="mt-10">
        <DayPlan />
      </motion.div>

      <motion.section {...riseIn(3)} className="mt-10" aria-label="Почитать">
        <SectionHead title="Почитать" hint={`${article.tag} · ${article.min} мин`} />
        <Card tone={article.tone} className="mt-4">
          <button
            type="button"
            aria-label={`Читать: ${article.title}`}
            onClick={() => openSheet("article", article.id)}
            className="press flex min-h-[148px] w-full flex-col p-5 text-left"
          >
            <span className="grid size-9 place-items-center self-end rounded-full bg-white/16">
              <ArrowUpRight className="size-4" />
            </span>
            <span className="mt-auto block pr-6 text-[21px] font-semibold leading-[1.1] tracking-[-0.04em]">{article.title}</span>
          </button>
        </Card>
      </motion.section>

      <motion.section {...riseIn(4)} className="mt-10" aria-label="Виджеты">
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
