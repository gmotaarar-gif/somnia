import * as React from "react"
import { motion } from "framer-motion"
import { Lightbulb, MoonStar, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/cn"
import type { SoundMode } from "@/lib/audio"
import { SLEEP_TIPS, nightScore, qualityLabel } from "@/lib/metrics"
import { riseIn } from "@/lib/motion"
import { dayMonthShort, durationRu, hm, parseKey, pluralRu, relativeDay, timeToMinutes, weekdayShort } from "@/lib/time"
import { useSummary } from "@/store/derived"
import { useStore, type SleepNight } from "@/store/store"
import { TopBar } from "@/shell/TopBar"
import { Card, CardTitle } from "@/ui/Card"
import { Bars } from "@/ui/charts"
import { Button, Chip, IconButton, SectionHead, Segmented } from "@/ui/controls"
import { Dots } from "@/ui/Dots"

export const SOUNDS: { id: SoundMode; label: string }[] = [
  { id: "off", label: "Тишина" },
  { id: "pink", label: "Розовый шум" },
  { id: "rain", label: "Дождь" },
  { id: "drone", label: "Дрон" },
]

const AXIS_START = 21 * 60
const AXIS_SPAN = 14 * 60
const axisPos = (hhmm: string) => (((timeToMinutes(hhmm) - AXIS_START + 1440) % 1440) / AXIS_SPAN) * 100

/** Bedtime-to-wake span for every night on a 21:00–11:00 axis. */
function SleepWindows({ nights, bedGoal, wakeGoal }: { nights: SleepNight[]; bedGoal: string; wakeGoal: string }) {
  return (
    <div className="relative flex h-full gap-[5px] pl-9">
      {[
        [bedGoal, axisPos(bedGoal)],
        [wakeGoal, axisPos(wakeGoal)],
      ].map(([label, top]) => (
        <div key={label} className="pointer-events-none absolute inset-x-0" style={{ top: `${top}%` }}>
          <span className="absolute -top-[6px] left-0 text-[10px] leading-none text-ink-3">{label}</span>
          <div className="ml-9 border-t border-dashed border-white/25" />
        </div>
      ))}
      {nights.map((n, i) => {
        const top = axisPos(n.bedtime)
        const bottom = axisPos(n.wakeTime)
        return (
          <div key={n.id} className="relative min-w-0 flex-1">
            <div
              title={`${relativeDay(n.dateKey)}: ${n.bedtime} → ${n.wakeTime}`}
              className={cn(
                "absolute inset-x-0 mx-auto max-w-[22px] rounded-full",
                i === nights.length - 1 ? "bg-lime shadow-[0_0_22px_-4px_rgb(217_242_74/0.8)]" : "bg-white/24"
              )}
              style={{ top: `${top}%`, height: `${Math.max(4, bottom - top)}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

function Stat({ label, value, unit, note }: { label: string; value: string | number; unit?: string; note: string }) {
  return (
    <Card r="sm" className="p-4">
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className="mt-4 flex items-end gap-1.5">
        <Dots value={value} shape="square" className="text-[26px]" />
        {unit && <span className="text-[11px] leading-none text-ink-2">{unit}</span>}
      </div>
      <div className="mt-2.5 truncate text-[12px] text-ink-2">{note}</div>
    </Card>
  )
}

export function SleepScreen() {
  const { nights, bedGoal, wakeGoal, openSheet, removeNight, nightSound, setNightSound, startNight } = useStore()
  const [period, setPeriod] = React.useState<"7" | "14" | "30">("7")
  const sum = useSummary(Number(period))
  const last = sum.last
  const shown = sum.week
  const tip = SLEEP_TIPS[new Date().getDate() % SLEEP_TIPS.length]
  const labelEvery = shown.length > 14 ? 5 : shown.length > 7 ? 2 : 1

  return (
    <>
      <TopBar
        title="Сон"
        sub={`Цель ${bedGoal} → ${wakeGoal} · ${durationRu(sum.target)}`}
        action={
          <IconButton label="Записать сон" onClick={() => openSheet("sleep")}>
            <Plus />
          </IconButton>
        }
      />

      <div className="grid gap-3">
        <motion.div {...riseIn(0)} className="">
          <Card tone="night" r="lg" className="h-full min-h-[340px]">
            <div className="flex h-full flex-col p-6">
              <div className="flex items-start justify-between">
                <CardTitle sub={last ? relativeDay(last.dateKey) : "Нет записей"}>Прошлая ночь</CardTitle>
                <span className="glass-inset grid size-9 place-items-center rounded-full">
                  <MoonStar className="size-4" />
                </span>
              </div>
              <div className="mt-8 flex items-end gap-3">
                <Dots value={last ? hm(last.durationMin) : "0:00"} shape="square" className="text-[64px]" />
                <span className="pb-1 text-[14px] text-ink-2">ч</span>
              </div>
              {last ? (
                <>
                  <div className="mt-auto pt-8">
                    <div className="flex justify-between text-[12px] text-ink-2">
                      <span>Отбой {last.bedtime}</span>
                      <span>Подъём {last.wakeTime}</span>
                    </div>
                    <div className="relative mt-3 h-4">
                      <div className="absolute inset-x-0 top-1/2 border-t-2 border-dotted border-white/30" />
                      <div
                        className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#8ea0ff] to-lime"
                        style={{ left: `${axisPos(last.bedtime)}%`, right: `${100 - axisPos(last.wakeTime)}%` }}
                      />
                      <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${axisPos(last.bedtime)}%` }} />
                      <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${axisPos(last.wakeTime)}%` }} />
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="glass-inset rounded-full px-3 py-1.5 text-[12px]">{qualityLabel(last.quality)} · {last.quality}</span>
                    <span className="glass-inset rounded-full px-3 py-1.5 text-[12px]">
                      {last.awakenings
                        ? `${last.awakenings} ${pluralRu(last.awakenings, ["пробуждение", "пробуждения", "пробуждений"])}`
                        : "Без пробуждений"}
                    </span>
                    {last.tags.map((t) => (
                      <span key={t} className="glass-inset rounded-full px-3 py-1.5 text-[12px] text-ink-2">{t}</span>
                    ))}
                  </div>
                </>
              ) : (
                <Button className="mt-auto self-start" onClick={() => openSheet("sleep")}>
                  <Plus /> Записать сон
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div {...riseIn(1)} className="">
          <Card tone="cobalt" r="lg" className="h-full">
            <div className="flex h-full flex-col p-6">
              <CardTitle sub={`Тёмный экран, шум и подъём в ${wakeGoal}`}>Ночной режим</CardTitle>
              <div className="mt-6 flex flex-wrap gap-2">
                {SOUNDS.map((s) => (
                  <Chip key={s.id} active={nightSound === s.id} onClick={() => setNightSound(s.id)}>
                    {s.label}
                  </Chip>
                ))}
              </div>
              <p className="mb-6 mt-5 text-[13px] leading-relaxed text-ink-2">
                Утром нажмите «Я проснулся»: время отбоя и подъёма подставится в запись автоматически.
              </p>
              <Button className="mt-auto w-full" onClick={startNight}>
                <MoonStar /> Начать ночь
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.section {...riseIn(2)} className="mt-8">
        <SectionHead title="Динамика" hint={`${shown.length} ${pluralRu(shown.length, ["ночь", "ночи", "ночей"])}`}>
          <Segmented
            id="sleep-period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "7", label: "7 дн" },
              { value: "14", label: "14 дн" },
              { value: "30", label: "30 дн" },
            ]}
          />
        </SectionHead>

        <div className="mt-4 grid gap-3">
          <Card tone="forest" className="">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <CardTitle sub={`Пунктир: цель ${durationRu(sum.target)}`}>Длительность</CardTitle>
                <div className="flex items-end gap-1.5">
                  <Dots value={hm(sum.avgDuration)} className="text-[24px]" />
                  <span className="text-[11px] leading-none text-ink-2">в среднем</span>
                </div>
              </div>
              <div className="mt-6 h-[170px]">
                <Bars
                  values={shown.map((n) => n.durationMin)}
                  labels={shown.map((n, i) => ((shown.length - 1 - i) % labelEvery === 0 ? weekdayShort(parseKey(n.dateKey)) : ""))}
                  goal={sum.target}
                  max={Math.max(sum.target * 1.15, ...shown.map((n) => n.durationMin))}
                  format={durationRu}
                />
              </div>
            </div>
          </Card>

          <Card tone="dusk" className="">
            <div className="p-5">
              <CardTitle sub={`${sum.accuracy}% ночей в пределах ±30 мин`}>Окно сна</CardTitle>
              <div className="mt-6 h-[170px]">
                <SleepWindows nights={shown} bedGoal={bedGoal} wakeGoal={wakeGoal} />
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="Индекс сна" value={sum.index} unit="/ 100" note={sum.indexDelta ? `${sum.indexDelta > 0 ? "+" : ""}${sum.indexDelta} к прошлому периоду` : "без изменений"} />
          <Stat label="Точность отбоя" value={`${sum.accuracy}%`} note={`разброс ±${sum.bedSd} мин`} />
          <Stat label="Долг сна" value={hm(sum.debt)} unit="ч" note={sum.debt > 90 ? "ложитесь на 20 мин раньше" : "в пределах нормы"} />
          <Stat label="Спокойные ночи" value={`${sum.calmNights}/${shown.length}`} note="без пробуждений" />
        </div>
      </motion.section>

      <motion.div {...riseIn(3)} className="mt-3">
        <Card tone="ember">
          <div className="flex gap-4 p-5">
            <span className="glass-inset grid size-11 shrink-0 place-items-center rounded-full">
              <Lightbulb className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-2">{tip.tag}</div>
              <div className="mt-1.5 text-[17px] font-semibold tracking-[-0.01em]">{tip.title}</div>
              <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-2">{tip.body}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.section {...riseIn(4)} className="mt-8">
        <SectionHead title="Журнал">
          <Chip onClick={() => openSheet("sleep")}>
            <Plus className="size-4" /> Запись
          </Chip>
        </SectionHead>
        <ul className="mt-4 grid gap-2">
          {[...nights]
            .reverse()
            .slice(0, 14)
            .map((n) => (
              <li key={n.id} className="glass group flex items-center gap-4 rounded-[26px] p-3 pl-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-black/40">
                  <Dots value={nightScore(n, bedGoal, wakeGoal)} still className="text-[15px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-medium">{relativeDay(n.dateKey)}</span>
                    <span className="truncate text-[12px] text-ink-3">{dayMonthShort(parseKey(n.dateKey))}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[13px] text-ink-2">
                    {n.bedtime} → {n.wakeTime} · {durationRu(n.durationMin)}
                    {n.note ? ` · ${n.note}` : ""}
                  </div>
                </div>
                <IconButton
                  label={`Удалить запись: ${relativeDay(n.dateKey)}`}
                  size="sm"
                  className="bg-transparent text-ink-3 shadow-none backdrop-blur-none hover:text-[#ff8f8f]"
                  onClick={() => removeNight(n.id)}
                >
                  <Trash2 />
                </IconButton>
              </li>
            ))}
        </ul>
      </motion.section>
    </>
  )
}
