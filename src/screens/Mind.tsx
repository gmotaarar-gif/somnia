import * as React from "react"
import { motion } from "framer-motion"
import { Plus, Smile } from "lucide-react"
import { cn } from "@/lib/cn"
import { buildInsights, emotionCounts, factorImpacts, moodPct, sleepMoodLink } from "@/lib/metrics"
import { riseIn } from "@/lib/motion"
import { clockOf, dateKey, daysAgo, pluralRu, relativeDay, weekdayShort } from "@/lib/time"
import { getValenceLabel, sampleValencePalette } from "@/lib/valence"
import { useSummary } from "@/store/derived"
import { useStore } from "@/store/store"
import { TopBar } from "@/shell/TopBar"
import { Card, CardTitle, type CardTone } from "@/ui/Card"
import { Wave } from "@/ui/charts"
import { Button, IconButton, SectionHead, Slider } from "@/ui/controls"
import { Dots } from "@/ui/Dots"

const rgb = (c: number[]) => `rgb(${c.join(" ")})`

export function MindScreen() {
  const { moods, nights, bedGoal, wakeGoal, spectrum, setSpectrum, openSheet } = useStore()
  const sum = useSummary()
  const last = sum.lastMood

  const days = React.useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = daysAgo(13 - i)
        const key = dateKey(d)
        const entries = moods.filter((m) => dateKey(new Date(m.at)) === key)
        return {
          key,
          label: weekdayShort(d),
          value: entries.length ? entries.reduce((s, m) => s + m.valence, 0) / entries.length : null,
        }
      }),
    [moods]
  )
  const trail = React.useMemo(() => {
    let prev = days.find((d) => d.value != null)?.value ?? 0
    return days.map((d) => (prev = d.value ?? prev))
  }, [days])

  const emotions = React.useMemo(() => emotionCounts(moods).slice(0, 9), [moods])
  const factors = React.useMemo(() => factorImpacts(moods).filter((f) => f.count >= 2).slice(0, 6), [moods])
  const insights = React.useMemo(() => buildInsights(nights, moods, bedGoal, wakeGoal), [nights, moods, bedGoal, wakeGoal])
  const link = React.useMemo(() => sleepMoodLink(nights, moods), [nights, moods])
  const maxDelta = Math.max(1, ...factors.map((f) => Math.abs(f.delta)))
  const topCount = emotions[0]?.count ?? 1
  const weekCheckins = moods.filter((m) => new Date(m.at) >= daysAgo(6)).length

  return (
    <>
      <TopBar
        title="Состояние"
        sub={`${weekCheckins} ${pluralRu(weekCheckins, ["чек-ин", "чек-ина", "чек-инов"])} за неделю`}
        action={
          <IconButton label="Чек-ин состояния" onClick={() => openSheet("mood")}>
            <Plus />
          </IconButton>
        }
      />

      <div className="grid gap-3">
        <motion.div {...riseIn(0)} className="">
          <Card tone="mint" r="lg" className="h-full min-h-[340px]">
            <div className="flex h-full flex-col p-6">
              <div className="flex items-start justify-between">
                <CardTitle sub={last ? `${relativeDay(dateKey(new Date(last.at)))}, ${clockOf(last.at)}` : "Нет записей"}>Сейчас</CardTitle>
                <span className="glass-inset grid size-9 place-items-center rounded-full">
                  <Smile className="size-4" />
                </span>
              </div>
              <div className="mt-8 flex flex-col items-center">
                <Dots value={last ? `${moodPct(last.valence)}%` : "--"} className="text-[62px]" />
                <div className="mt-4 text-[19px] font-semibold tracking-[-0.02em]">
                  {last ? getValenceLabel(last.valence) : "Сделайте первый чек-ин"}
                </div>
                {last && last.emotions.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {last.emotions.map((e) => (
                      <span key={e} className="glass-inset rounded-full px-3 py-1.5 text-[12px]">{e}</span>
                    ))}
                  </div>
                )}
              </div>
              <Button className="mt-auto w-full" onClick={() => openSheet("mood")}>
                <Plus /> Чек-ин
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div {...riseIn(1)} className="">
          <Card tone="moss" r="lg" className="h-full">
            <div className="flex h-full flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <CardTitle sub="Среднее по дням, 14 дней">Волна настроения</CardTitle>
                <div className="flex items-end gap-1.5">
                  <Dots value={sum.moodAvg != null ? `${sum.moodAvg}%` : "--"} className="text-[24px]" />
                  <span className="text-[11px] leading-none text-ink-2">за неделю</span>
                </div>
              </div>
              <Wave values={trail} color="#d9f24a" height={92} fill className="mt-auto pt-8" />
              <div className="mt-3 flex justify-between">
                {days.map((d, i) => (
                  <span key={d.key} className={cn("w-0 flex-1 text-center text-[10px]", d.value == null ? "text-ink-3/50" : "text-ink-3", i % 2 && "invisible")}>
                    {d.label}
                  </span>
                ))}
              </div>
              {link > 3 && (
                <p className="mt-5 text-[13px] leading-relaxed text-ink-2">
                  После ночей от 7 часов настроение в среднем выше на <span className="font-semibold text-lime">{link} {pluralRu(link, ["пункт", "пункта", "пунктов"])}</span>.
                </p>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div {...riseIn(2)} className="mt-3 grid gap-3">
        <Card tone="dusk" className="">
          <div className="p-5">
            <CardTitle sub="Передвиньте, чтобы уточнить">Спектр дня</CardTitle>
            <div className="mt-4 space-y-3">
              {spectrum.map((a) => (
                <div key={a.id}>
                  <div className="flex justify-between text-[12px]">
                    <span className={a.value < 0.5 ? "text-ink" : "text-ink-3"}>{a.left}</span>
                    <span className={a.value >= 0.5 ? "text-ink" : "text-ink-3"}>{a.right}</span>
                  </div>
                  <Slider
                    label={`${a.left} — ${a.right}`}
                    value={Math.round(a.value * 100)}
                    onChange={(v) => setSpectrum(a.id, v / 100)}
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card tone="ink" className="">
          <div className="flex h-full flex-col p-5">
            <CardTitle sub="Чем больше, тем чаще отмечаете">Эмоции</CardTitle>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {emotions.length === 0 && <span className="text-[13px] text-ink-3">Появятся после первых чек-инов.</span>}
              {emotions.map((e) => {
                const k = e.count / topCount
                return (
                  <span
                    key={e.name}
                    className="glass-inset inline-flex items-center gap-2 rounded-full"
                    style={{ fontSize: 12 + k * 6, padding: `${6 + k * 5}px ${12 + k * 8}px` }}
                  >
                    {e.name}
                    <span className="text-[11px] text-ink-3">{e.count}</span>
                  </span>
                )
              })}
            </div>
            <div className="mt-auto pt-6">
              <div className="text-[12px] text-ink-3">Что влияет на баланс</div>
              <ul className="mt-3 space-y-2.5">
                {factors.map((f) => (
                  <li key={f.name} className="flex items-center gap-3 text-[13px]">
                    <span className="w-[76px] shrink-0 truncate text-ink-2">{f.name}</span>
                    <span className="relative h-[6px] flex-1 rounded-full bg-white/10">
                      <span className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
                      <span
                        className={cn("absolute inset-y-0 rounded-full", f.delta >= 0 ? "left-1/2 bg-lime" : "right-1/2 bg-[#ff7d8e]")}
                        style={{ width: `${(Math.abs(f.delta) / maxDelta) * 50}%` }}
                      />
                    </span>
                    <span className={cn("w-9 shrink-0 text-right font-semibold tabular-nums", f.delta >= 0 ? "text-lime" : "text-[#ff9aa7]")}>
                      {f.delta > 0 ? "+" : ""}
                      {f.delta}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>

      {insights.length > 0 && (
        <motion.section {...riseIn(3)} className="mt-8">
          <SectionHead title="Наблюдения" hint="Связи между сном и настроением по вашим записям" />
          <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4">
            {insights.slice(0, 4).map((x) => (
              <Card key={x.id} tone={x.tone as CardTone} className="w-[240px] shrink-0 snap-start">
                <div className="flex h-[220px] flex-col p-5">
                  <Dots value={x.metric} shape="square" className="text-[30px]" />
                  <div className="mt-auto text-[16px] font-semibold leading-snug tracking-[-0.01em]">{x.title}</div>
                  <p className="mt-2 text-[13px] leading-snug text-ink-2">{x.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section {...riseIn(4)} className="mt-8">
        <SectionHead title="Дневник" />
        <ul className="mt-4 grid gap-2">
          {[...moods]
            .reverse()
            .slice(0, 10)
            .map((m) => {
              const pal = sampleValencePalette(m.valence)
              return (
                <li key={m.id} className="glass flex items-center gap-4 rounded-[26px] p-3 pl-4">
                  <span
                    className="size-11 shrink-0 rounded-full"
                    style={{ background: `radial-gradient(circle at 36% 30%, ${rgb(pal.core)}, ${rgb(pal.mid)} 48%, ${rgb(pal.outer)})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[15px] font-medium">{getValenceLabel(m.valence)}</span>
                      <span className="shrink-0 text-[12px] text-ink-3">
                        {relativeDay(dateKey(new Date(m.at)))}, {clockOf(m.at)}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-ink-2">
                      {[...m.emotions, ...m.factors].join(" · ") || m.note || "Без уточнений"}
                    </div>
                  </div>
                  <span className="shrink-0 pr-2 text-[13px] font-semibold tabular-nums text-ink-2">{moodPct(m.valence)}%</span>
                </li>
              )
            })}
        </ul>
      </motion.section>
    </>
  )
}
