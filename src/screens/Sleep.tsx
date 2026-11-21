import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlarmClock, ChevronDown, ChevronRight, MoonStar, Plus } from "lucide-react"
import { hypnogram, wakeOptions } from "@/lib/features"
import { NightLine } from "@/ui/NightLine"
import { Hypnogram, StageLegend } from "@/ui/SleepStages"
import { cn } from "@/lib/cn"
import type { SoundMode } from "@/lib/audio"
import { nightScore, qualityLabel } from "@/lib/metrics"
import { DUR, EASE_OUT } from "@/lib/motion"
import { useRiseIn } from "@/ui/MotionProvider"
import { dateKey, dayMonthShort, daysAgo, deviationMinutes, durationRu, hm, parseKey, pluralRu, relativeDay, spanMinutes, timeToMinutes, weekdayShort } from "@/lib/time"
import { useSummary } from "@/store/derived"
import { useStore, type SleepNight } from "@/store/store"
import { TopBar } from "@/shell/TopBar"
import { Card } from "@/ui/Card"
import { Bars, Ruler } from "@/ui/charts"
import { Button, Chip, SectionHead, Segmented } from "@/ui/controls"
import { Dots } from "@/ui/Dots"
import { Mascot } from "@/ui/Mascot"
import { SwipeToDelete } from "@/ui/dissolve/swipe-to-delete"

export const SOUNDS: { id: SoundMode; label: string }[] = [
  { id: "off", label: "Тишина" },
  { id: "pink", label: "Розовый шум" },
  { id: "rain", label: "Дождь" },
  { id: "drone", label: "Дрон" },
]

const AXIS_START = -3 * 60
const AXIS_END = 11 * 60
const MIN_BAR_HEIGHT = 4

/** Endpoints in minutes relative to midnight on the wake date. */
function sleepWindow(bedtime: string, wakeTime: string) {
  const wake = timeToMinutes(wakeTime)
  return { bed: wake - (bedtime === wakeTime ? 0 : spanMinutes(bedtime, wakeTime)), wake }
}

function SleepWindows({ nights, bedGoal, wakeGoal }: { nights: SleepNight[]; bedGoal: string; wakeGoal: string }) {
  const goal = sleepWindow(bedGoal, wakeGoal)
  const windows = nights.map((night) => ({ night, ...sleepWindow(night.bedtime, night.wakeTime) }))
  const start = Math.min(AXIS_START, goal.bed, ...windows.map(({ bed }) => bed))
  const end = Math.max(AXIS_END, goal.wake, ...windows.map(({ wake }) => wake))
  const latestBed = Math.max(...windows.map(({ bed }) => bed))
  const span = Math.max(end - start, (latestBed - start) / (1 - MIN_BAR_HEIGHT / 100))
  const axisPos = (minutes: number) => ((minutes - start) / span) * 100

  return (
    <div className="relative flex h-full gap-[5px] pl-9">
      {[
        [bedGoal, axisPos(goal.bed)],
        [wakeGoal, axisPos(goal.wake)],
      ].map(([label, top]) => (
        <div key={label} className="pointer-events-none absolute inset-x-0" style={{ top: `${top}%` }}>
          <span className="absolute -top-[6px] left-0 text-[10px] leading-none text-ink-3">{label}</span>
          <div className="ml-9 border-t border-dashed border-white/25" />
        </div>
      ))}
      {windows.map(({ night: n, bed, wake }, i) => {
        const top = axisPos(bed)
        const bottom = axisPos(wake)
        return (
          <div key={n.id} className="relative min-w-0 flex-1">
            <div
              title={`${relativeDay(n.dateKey)}: ${n.bedtime} → ${n.wakeTime}`}
              className={cn(
                "absolute inset-x-0 mx-auto max-w-[8px] rounded-full",
                i === nights.length - 1 ? "bg-lime shadow-[0_0_14px_-2px_rgb(217_242_74/0.7)]" : "bg-white/85"
              )}
              style={{ top: `${top}%`, height: `${Math.max(MIN_BAR_HEIGHT, bottom - top)}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className="mt-2 text-[22px] font-medium leading-none tracking-[-0.03em] tabular-nums">{value}</div>
      <div className="mt-1.5 text-[11px] leading-tight text-ink-3">{note}</div>
    </div>
  )
}

function HeroStat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="tile squircle min-w-0 px-3.5 py-3">
      <div className="text-[12px] text-white/70">{label}</div>
      <div className="mt-1.5 text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums">{value}</div>
      <div className="mt-1.5 truncate text-[11px] text-white/60">{note}</div>
    </div>
  )
}

const planNote = (minutes: number) => (minutes === 0 ? "по плану" : `${minutes > 0 ? "+" : "−"}${Math.abs(minutes)} мин`)

/** Last five weeks as a calendar; each night is tinted by its score. */
function MonthGrid() {
  const { nights, bedGoal, wakeGoal, openSheet } = useStore()
  const byKey = new Map(nights.map((n) => [n.dateKey, n]))
  const today = new Date()
  const offset = (today.getDay() + 6) % 7
  const days = Array.from({ length: 35 }, (_, i) => daysAgo(34 - i - (6 - offset)))
  return (
    <div className="card mt-4 p-5">
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-ink-3">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const key = dateKey(d)
          const n = byKey.get(key)
          const future = key > dateKey(today)
          const score = n ? nightScore(n, bedGoal, wakeGoal) : 0
          return (
            <motion.button
              key={key}
              type="button"
              disabled={!n}
              aria-label={n ? `${relativeDay(key)}: оценка ${score}` : dayMonthShort(d)}
              onClick={() => n && openSheet("night", n.id)}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: future ? 0.25 : 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.012 }}
              className={cn(
                "grid aspect-square place-items-center rounded-full text-[11px] font-medium tabular-nums",
                n ? "text-lime-ink" : "bg-white/7 text-ink-3",
                key === dateKey(today) && "ring-1 ring-white/70 ring-offset-2 ring-offset-black"
              )}
              style={n ? {
                background: `rgb(217 242 74 / ${0.25 + (score / 100) * 0.75})`,
                boxShadow: score >= 80 ? "0 0 14px -2px rgb(217 242 74 / 0.5)" : undefined,
              } : undefined}
            >
              {d.getDate()}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export function SleepScreen() {
  const riseIn = useRiseIn()
  const { nights, bedGoal, wakeGoal, openSheet, nightSound, setNightSound, startNight, soundTimer, patch, removeNight } = useStore()
  // A row that was dragged sideways is being swiped away, not opened.
  const pressX = React.useRef(0)
  const best = wakeOptions(bedGoal).find((o) => o.best)
  const [period, setPeriod] = React.useState<"7" | "14" | "30">("7")
  const [chart, setChart] = React.useState<"hours" | "window">("hours")
  const [tune, setTune] = React.useState(false)
  const [allNights, setAllNights] = React.useState(false)
  const sum = useSummary(Number(period))
  const last = sum.last
  const shown = sum.week
  const labelEvery = shown.length > 14 ? 5 : shown.length > 7 ? 2 : 1
  const journal = [...nights].reverse().slice(0, allNights ? undefined : 3)
  const soundLabel = SOUNDS.find((s) => s.id === nightSound)?.label ?? "Тишина"

  return (
    <>
      <TopBar
        title="Сон"
        sub={`Цель ${bedGoal} → ${wakeGoal} · ${durationRu(sum.target)}`}
      />

      <motion.div {...riseIn(0)}>
        <Card tone="nightfall" r="lg" grain>
          <div className="flex min-h-[292px] flex-col p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[17px] font-medium leading-tight tracking-[-0.02em]">Прошлая ночь</span>
              {last && <span className="rounded-full bg-white/14 px-3 py-1.5 text-[12px]">{qualityLabel(last.quality)}</span>}
            </div>
            <div className="mt-7 flex items-end gap-3">
              {last ? <Dots value={hm(last.durationMin)} shape="square" className="text-[64px]" /> : <Mascot size={80} />}
              {last && <span className="pb-0.5 text-[17px] text-white/65">ч</span>}
            </div>
            {last ? (
              <>
                <p className="mt-4 text-[13px] text-white/70">
                  {last.awakenings ? `${last.awakenings} ${pluralRu(last.awakenings, ["пробуждение", "пробуждения", "пробуждений"])}` : "Без пробуждений"} за ночь
                </p>
                <div className="mt-auto pt-8">
                  <button
                    type="button"
                    aria-label="Подробности ночи"
                    onClick={() => openSheet("night", last.id)}
                    className="press -mx-1 block w-[calc(100%+8px)] rounded-[16px] p-1 text-left"
                  >
                    {hypnogram(last).length ? <Hypnogram night={last} /> : <NightLine bedtime={last.bedtime} wakeTime={last.wakeTime} goal={{ bed: bedGoal, wake: wakeGoal }} />}
                  </button>
                </div>
                <StageLegend night={last} />
              </>
            ) : (
              <>
                <p className="mt-4 text-[13px] text-white/70">Запишите первую ночь: это займёт минуту.</p>
                <Button className="mt-auto self-start" onClick={() => openSheet("sleep")}>
                  <Plus /> Записать сон
                </Button>
              </>
            )}
          </div>
          {last && (
            <div className="grid grid-cols-3 gap-2 px-2.5 pb-2.5">
              <HeroStat label="Отбой" value={last.bedtime} note={planNote(deviationMinutes(last.bedtime, bedGoal))} />
              <HeroStat label="Подъём" value={last.wakeTime} note={planNote(deviationMinutes(last.wakeTime, wakeGoal))} />
              <HeroStat label="Оценка" value={nightScore(last, bedGoal, wakeGoal)} note="из 100" />
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div {...riseIn(1)} className="mt-3">
        <Card tone="cobalt">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-medium leading-tight tracking-[-0.02em]">Ночной режим</div>
                <button
                  type="button"
                  aria-expanded={tune}
                  onClick={() => setTune((v) => !v)}
                  className="mt-1.5 flex max-w-full items-center gap-1 text-left text-[13px] text-ink-2 hover:text-ink"
                >
                  <span className="truncate">{soundLabel} · {soundTimer ? `${soundTimer} мин` : "без таймера"}</span>
                  <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-250", tune && "rotate-180")} />
                </button>
              </div>
              <Button className="shrink-0 px-5" onClick={startNight}>
                <MoonStar /> Начать
              </Button>
            </div>
            <AnimatePresence initial={false}>
              {tune && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: DUR.fast, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 pt-5">
                    {SOUNDS.map((s) => (
                      <Chip key={s.id} active={nightSound === s.id} onClick={() => setNightSound(s.id)}>
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-[13px] text-ink-2">Таймер звука, мин</span>
                    <Segmented
                      id="sound-timer"
                      label="Таймер звука"
                      value={String(soundTimer)}
                      onChange={(v) => patch({ soundTimer: Number(v) })}
                      options={[
                        { value: "15", label: "15" },
                        { value: "30", label: "30" },
                        { value: "60", label: "60" },
                        { value: "0", label: "∞" },
                      ]}
                    />
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-ink-3">Утром нажмите «Я проснулся»: отбой и подъём подставятся в запись сами.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>

      {best && (
        <motion.button
          {...riseIn(2)}
          type="button"
          aria-label="Калькулятор циклов сна"
          onClick={() => openSheet("cycles")}
          className="press glass mt-3 flex w-full items-center gap-4 rounded-[30px] p-3 pr-4 text-left"
        >
          <span className="glass-inset grid size-11 shrink-0 place-items-center rounded-full">
            <AlarmClock className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Циклы сна</span>
            <span className="mt-0.5 block truncate text-[13px] text-ink-2">Лучший подъём в {best.time}, если лечь в {bedGoal}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-3" />
        </motion.button>
      )}

      <motion.section {...riseIn(3)} className="mt-10">
        <SectionHead title="Динамика">
          <Segmented
            id="sleep-period"
            label="Период динамики сна"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "7", label: "7 дн" },
              { value: "14", label: "14 дн" },
              { value: "30", label: "30 дн" },
            ]}
          />
        </SectionHead>

        <Card className="mt-4">
          <div className="p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="flex items-end gap-1.5">
                  {shown.length ? <Dots value={chart === "hours" ? hm(sum.avgDuration) : `${sum.accuracy}%`} className="text-[28px]" /> : <span className="text-[28px] leading-none">—</span>}
                </div>
                <div className="mt-2.5 text-[12px] text-ink-2">
                  {chart === "hours" ? `в среднем · цель ${durationRu(sum.target)}` : "ночей в пределах ±30 мин"}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Chip active={chart === "hours"} onClick={() => setChart("hours")}>Часы</Chip>
                <Chip active={chart === "window"} onClick={() => setChart("window")}>Режим</Chip>
              </div>
            </div>
            <div className="mt-6 h-[160px]">
              {!shown.length ? <p className="text-[14px] text-ink-2">Пока нет данных. Запишите первую ночь.</p> : chart === "hours" ? (
                <Bars
                  values={shown.map((n) => n.durationMin)}
                  labels={shown.map((n, i) => ((shown.length - 1 - i) % labelEvery === 0 ? weekdayShort(parseKey(n.dateKey)) : ""))}
                  goal={sum.target}
                  max={Math.max(sum.target * 1.15, ...shown.map((n) => n.durationMin))}
                  format={durationRu}
                />
              ) : (
                <SleepWindows nights={shown} bedGoal={bedGoal} wakeGoal={wakeGoal} />
              )}
            </div>
            {shown.length > 0 && <Ruler value={sum.index / 100} labels={["Режим сбит", "Ровный режим", "Отличный ритм"]} className="mt-6" />}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <Stat label="Индекс" value={shown.length ? sum.index : "—"} note={!shown.length ? "Пока нет данных" : sum.indexDelta ? `${sum.indexDelta > 0 ? "+" : ""}${sum.indexDelta} к прошлому` : "без изменений"} />
              <Stat label="Долг сна" value={shown.length ? hm(sum.debt) : "—"} note={!shown.length ? "Пока нет данных" : sum.debt > 90 ? "лягте раньше" : "в норме"} />
              <Stat label="Спокойных" value={shown.length ? `${sum.calmNights}/${shown.length}` : "—"} note="без пробуждений" />
            </div>
          </div>
        </Card>
      </motion.section>

      <motion.section {...riseIn(4)} className="mt-10">
        <SectionHead title="История" hint="Чем ярче день, тем выше оценка ночи" />
        <MonthGrid />
        {!nights.length && <p className="mt-3 text-[14px] text-ink-2">Здесь появятся ваши записи сна.</p>}
        {nights.length > 0 && <p className="mt-3 px-1 text-[12px] text-ink-3">Смахните ночь влево, чтобы удалить её</p>}
        <ul className="mt-3">
          {journal.map((n) => (
            <li key={n.id}>
              <SwipeToDelete className="mb-2" rowClassName="rounded-[26px]" threshold={0.5} onDelete={() => removeNight(n.id)}>
                <button
                  type="button"
                  onPointerDown={(e) => { pressX.current = e.clientX }}
                  onClick={(e) => { if (e.detail === 0 || Math.abs(e.clientX - pressX.current) < 12) openSheet("night", n.id) }}
                  className="press glass-solid flex w-full items-center gap-4 rounded-[26px] p-3 pl-4 text-left"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-black/45">
                    <Dots value={nightScore(n, bedGoal, wakeGoal)} still className="text-[14px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[15px] font-medium">{relativeDay(n.dateKey)}</span>
                      {n.dateKey >= dateKey(daysAgo(1)) && <span className="truncate text-[12px] text-ink-3">{dayMonthShort(parseKey(n.dateKey))}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-ink-2">
                      {n.bedtime} → {n.wakeTime} · {durationRu(n.durationMin)}
                    </span>
                  </span>
                  <ChevronRight className="mr-1 size-5 shrink-0 text-ink-3" />
                </button>
              </SwipeToDelete>
            </li>
          ))}
        </ul>
        {nights.length > 3 && (
          <Button variant="ghost" className="mt-2 w-full" aria-expanded={allNights} onClick={() => setAllNights((v) => !v)}>
            {allNights ? "Свернуть" : "Показать все ночи"}
          </Button>
        )}
      </motion.section>
    </>
  )
}
