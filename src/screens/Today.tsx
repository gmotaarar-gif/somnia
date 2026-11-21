import * as React from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, Plus } from "lucide-react"
import { indexLabel, moodPct, qualityLabel } from "@/lib/metrics"
import { riseIn } from "@/lib/motion"
import { dayMonth, greeting, hm, pluralRu, weekdayShort } from "@/lib/time"
import { getValenceLabel } from "@/lib/valence"
import { useNow, useSummary } from "@/store/derived"
import { useStore } from "@/store/store"
import { DayPlan } from "@/screens/TodayExtras"
import { TopBar } from "@/shell/TopBar"
import { Card } from "@/ui/Card"
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
    <Card role="button" tabIndex={0} aria-label={label} onClick={onClick} onKeyDown={onKey(onClick)} className="cursor-pointer">
      <div className="flex h-[156px] flex-col p-5">
        <div className="flex items-center justify-between text-ink-2">
          <span className="text-[13px] font-medium">{title}</span>
          <span className="[&_svg]:size-4">{icon}</span>
        </div>
        <div className="mt-auto">{children}</div>
        <div className="mt-3 truncate text-[12px] text-ink-2">{note}</div>
      </div>
    </Card>
  )
}

export function TodayScreen() {
  const { userName, widgets, setTab, openSheet, editing, setEditing } = useStore()
  const sum = useSummary()
  const now = useNow(60_000)
  const last = sum.last
  const mood = sum.lastMood
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
          className="sleep-hero cursor-pointer"
        >
          <div className="flex min-h-[316px] flex-col p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] font-medium text-white/80">Прошлая ночь</span>
              {last && <span className="rounded-full bg-white/16 px-3 py-1.5 text-[12px] font-medium">{qualityLabel(last.quality)}</span>}
            </div>
            <div className="mt-7 flex items-end gap-2">
              <span className="text-[68px] font-medium leading-[0.9] tracking-[-0.06em] tabular-nums">{last ? hm(last.durationMin) : "0:00"}</span>
              <span className="pb-1 text-[17px] text-white/65">ч</span>
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
          onClick={() => openSheet("mood")}
        >
          <Dots value={mood ? `${moodPct(mood.valence)}%` : "--"} className="text-[34px]" />
        </Tile>
        <Tile
          title="Неделя"
          label="Индекс недели. Открыть итоги"
          icon={<ArrowUpRight />}
          note={`${indexLabel(sum.index)}${sum.indexDelta ? ` · ${sum.indexDelta > 0 ? "+" : ""}${sum.indexDelta}` : ""}`}
          onClick={() => openSheet("recap")}
        >
          <Dots value={sum.index} shape="square" className="text-[34px]" />
        </Tile>
      </motion.div>

      <motion.div {...riseIn(2)} className="mt-10">
        <DayPlan />
      </motion.div>

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
