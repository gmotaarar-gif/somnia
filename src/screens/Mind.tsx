import * as React from "react"
import { Mascot } from "@/ui/Mascot"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, ChevronRight, HeartPulse, Plus } from "lucide-react"
import { who5Label } from "@/lib/features"
import { cn } from "@/lib/cn"
import { buildInsights, emotionCounts, factorImpacts, moodPct, sleepMoodLink } from "@/lib/metrics"
import { DUR, EASE_OUT } from "@/lib/motion"
import { useRiseIn } from "@/ui/MotionProvider"
import { clockOf, dateKey, daysAgo, pluralRu, relativeDay, weekdayShort } from "@/lib/time"
import { getValenceLabel, sampleValencePalette } from "@/lib/valence"
import { useNow, useSummary } from "@/store/derived"
import { useStore, type MoodEntry } from "@/store/store"
import { TopBar } from "@/shell/TopBar"
import { Card, type CardTone } from "@/ui/Card"
import { Ring } from "@/ui/charts"
import { MoodOrb } from "@/ui/MoodOrb"
import { MoodTrend } from "@/ui/MoodTrend"
import { Button, SectionHead, Segmented } from "@/ui/controls"
import { Dots } from "@/ui/Dots"

const rgb = (c: number[]) => `rgb(${c.join(" ")})`

const dayAverage = (moods: MoodEntry[], key: string) => {
  const entries = moods.filter((m) => dateKey(new Date(m.at)) === key)
  return entries.length ? entries.reduce((s, m) => s + m.valence, 0) / entries.length : null
}

/** One check-in: a compact row that opens to the full tags and note. */
function DiaryEntry({ entry: m }: { entry: MoodEntry }) {
  const [open, setOpen] = React.useState(false)
  const pal = sampleValencePalette(m.valence)
  const tags = [...m.emotions, ...m.factors].join(" · ")
  const note = m.note?.trim()
  const more = !!tags || !!note
  const body = (
    <>
      <span className="size-11 shrink-0 rounded-full" style={{ background: `radial-gradient(circle at 36% 30%, ${rgb(pal.core)}, ${rgb(pal.mid)} 48%, ${rgb(pal.outer)})` }} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-medium leading-snug">{getValenceLabel(m.valence)}</span>
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-2">{moodPct(m.valence)}%</span>
        </span>
        <span className="mt-0.5 block text-[12px] text-ink-3">
          {relativeDay(dateKey(new Date(m.at)))}, {clockOf(m.at)}
        </span>
        {tags && <span className={cn("mt-1.5 block text-[13px] leading-snug text-ink-2", !open && "truncate")}>{tags}</span>}
        {note && <span className={cn("mt-1.5 block break-words text-[13px] leading-snug text-ink-2", !open && "truncate")}>«{note}»</span>}
      </span>
      {more && <ChevronDown className={cn("size-4 shrink-0 self-center text-ink-3 transition-transform duration-250", open && "rotate-180")} />}
    </>
  )
  const row = "glass flex w-full items-start gap-4 rounded-[26px] p-3 pl-4 pr-4 text-left"
  return (
    <li>
      {more ? (
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cn("press", row)}>
          {body}
        </button>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  )
}

function MonthHeat({ moods, today }: { moods: MoodEntry[]; today: string }) {
  const month = React.useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const key = dateKey(daysAgo(27 - i))
        return { key, value: dayAverage(moods, key) }
      }),
    [moods, today]
  )
  return (
    <>
      <div className="grid grid-cols-7 gap-1.5">
        {month.map((d, i) => (
          <motion.span
            key={d.key}
            title={d.value != null ? `${relativeDay(d.key)}: ${moodPct(d.value)}%` : relativeDay(d.key)}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DUR.medium, ease: EASE_OUT, delay: i * 0.012 }}
            className="aspect-square rounded-[10px]"
            style={{ background: d.value != null ? rgb(sampleValencePalette(d.value).mid) : "var(--glass-inset)" }}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-ink-3">
        Неприятно
        <span className="h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${[-1, -0.5, 0, 0.5, 1].map((v) => rgb(sampleValencePalette(v).mid)).join(",")})` }} />
        Приятно
      </div>
    </>
  )
}

function Factors({ moods }: { moods: MoodEntry[] }) {
  const factors = React.useMemo(() => factorImpacts(moods).filter((f) => f.count >= 2).slice(0, 5), [moods])
  const maxDelta = Math.max(1, ...factors.map((f) => Math.abs(f.delta)))
  if (factors.length === 0) return <p className="text-[14px] leading-relaxed text-ink-3">Отмечайте в чек-инах, что повлияло на день. После нескольких записей здесь появится, что помогает, а что мешает.</p>
  return (
    <ul className="space-y-4">
      {factors.map((f) => (
        <li key={f.name} className="flex items-center gap-3 text-[14px]">
          <span className="w-[84px] shrink-0 truncate">{f.name}</span>
          <span className="relative h-1.5 flex-1 rounded-full bg-white/8">
            <span className="absolute inset-y-[-3px] left-1/2 w-px bg-white/25" />
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${(Math.abs(f.delta) / maxDelta) * 50}%` }}
              transition={{ duration: DUR.slow, ease: EASE_OUT }}
              className={cn("absolute inset-y-0 rounded-full", f.delta >= 0 ? "left-1/2 bg-lime" : "right-1/2 bg-[#ff7d8e]")}
            />
          </span>
          <span className={cn("w-9 shrink-0 text-right font-semibold tabular-nums", f.delta >= 0 ? "text-lime" : "text-[#ff9aa7]")}>
            {f.delta > 0 ? "+" : ""}
            {f.delta}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Emotions({ moods }: { moods: MoodEntry[] }) {
  const emotions = React.useMemo(() => emotionCounts(moods).slice(0, 8), [moods])
  const top = emotions[0]?.count ?? 1
  if (emotions.length === 0) return <p className="text-[14px] leading-relaxed text-ink-3">Появятся после первых чек-инов.</p>
  return (
    <div className="flex flex-wrap items-center gap-2">
      {emotions.map((e) => {
        const k = e.count / top
        return (
          <span key={e.name} className="glass-inset inline-flex items-center gap-2 rounded-full" style={{ fontSize: 13 + k * 4, padding: `${7 + k * 4}px ${13 + k * 6}px` }}>
            {e.name}
            <span className="text-[11px] text-ink-3">{e.count}</span>
          </span>
        )
      })}
    </div>
  )
}

function swap(key: string, children: React.ReactNode) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: DUR.quick, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function MindScreen() {
  const riseIn = useRiseIn()
  const { moods, nights, bedGoal, wakeGoal, openSheet, wellbeing } = useStore()
  const who = wellbeing[wellbeing.length - 1]
  const whoPrev = wellbeing[wellbeing.length - 2]
  const sum = useSummary()
  const today = dateKey(useNow(60_000))
  const last = sum.lastMood
  const [view, setView] = React.useState<"trend" | "month">("trend")
  const [pattern, setPattern] = React.useState<"factors" | "emotions">("factors")
  const [insightAt, setInsightAt] = React.useState(0)
  const [allEntries, setAllEntries] = React.useState(false)

  const days = React.useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = daysAgo(13 - i)
        return { key: dateKey(d), label: weekdayShort(d), value: dayAverage(moods, dateKey(d)) }
      }),
    [moods, today]
  )
  const insights = React.useMemo(() => buildInsights(nights, moods, bedGoal, wakeGoal), [nights, moods, bedGoal, wakeGoal])
  const link = React.useMemo(() => sleepMoodLink(nights, moods), [nights, moods])
  const weekCheckins = moods.filter((m) => dateKey(new Date(m.at)) >= dateKey(daysAgo(6))).length
  const insight = insights.length ? insights[insightAt % insights.length] : null
  const diary = [...moods].reverse().slice(0, allEntries ? undefined : 3)

  return (
    <>
      <TopBar
        title="Состояние"
        sub={`${weekCheckins} ${pluralRu(weekCheckins, ["чек-ин", "чек-ина", "чек-инов"])} за неделю`}
      />

      <motion.div {...riseIn(0)}>
        <Card tone="mint" r="lg">
          <div className="flex min-h-[316px] flex-col p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] font-medium text-white/80">Сейчас</span>
              <span className="text-[12px] text-white/60">{last ? `${relativeDay(dateKey(new Date(last.at)))}, ${clockOf(last.at)}` : "нет записей"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="-ml-4 shrink-0 [&_svg]:size-[150px]">
                <MoodOrb valence={last?.valence ?? 0} />
              </div>
              <div className="min-w-0 flex-1">
                <Dots value={last ? `${moodPct(last.valence)}%` : "--"} className="text-[40px]" />
                <div className="mt-4 text-[20px] font-semibold leading-tight tracking-[-0.03em]">{last ? getValenceLabel(last.valence) : "Как вы сейчас?"}</div>
                <div className="mt-1.5 text-[13px] leading-snug text-white/65 [overflow-wrap:anywhere]">
                  {last ? last.emotions.slice(0, 3).join(" · ") || "без уточнений" : "Первый чек-ин займёт полминуты"}
                </div>
              </div>
            </div>
            <Button className="mt-auto w-full" onClick={() => openSheet("mood")}>
              <Plus /> Чек-ин
            </Button>
          </div>
        </Card>
      </motion.div>

      <motion.div {...riseIn(1)} className="mt-3">
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[17px] font-semibold leading-tight tracking-[-0.025em]">Настроение</div>
                <div className="mt-1 text-[13px] text-ink-3">{view === "trend" ? "последние 14 дней" : "последние 28 дней"}</div>
              </div>
              <Segmented
                id="mood-view"
                label="Вид графика настроения"
                value={view}
                onChange={setView}
                options={[
                  { value: "trend", label: "График" },
                  { value: "month", label: "Месяц" },
                ]}
              />
            </div>
            <div className="mt-6">{swap(view, view === "trend" ? <MoodTrend days={days} /> : <MonthHeat moods={moods} today={today} />)}</div>
            {link > 3 && (
              <p className="mt-5 border-t border-white/8 pt-4 text-[13px] leading-relaxed text-ink-2">
                После ночей от 7 часов настроение выше в среднем на <span className="font-semibold text-lime">{link} {pluralRu(link, ["пункт", "пункта", "пунктов"])}</span>.
              </p>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.section {...riseIn(2)} className="mt-10">
        <SectionHead title="Закономерности">
          <Segmented
            id="mood-pattern"
            label="Вид закономерностей"
            value={pattern}
            onChange={setPattern}
            options={[
              { value: "factors", label: "Влияние" },
              { value: "emotions", label: "Эмоции" },
            ]}
          />
        </SectionHead>
        <Card className="mt-4">
          <div className="p-5">
            <p className="mb-5 text-[13px] text-ink-3">{pattern === "factors" ? "На сколько пунктов меняется баланс с отметкой" : "Чем крупнее, тем чаще отмечаете"}</p>
            {swap(pattern, pattern === "factors" ? <Factors moods={moods} /> : <Emotions moods={moods} />)}
          </div>
        </Card>

        {insight && (
          <Card tone={insight.tone as CardTone} className="mt-3">
            <div className="flex min-h-[176px] flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-white/75">Наблюдение</span>
                {insights.length > 1 && (
                  <button
                    type="button"
                    aria-label="Следующее наблюдение"
                    onClick={() => setInsightAt((i) => (i + 1) % insights.length)}
                    className="press -mr-1 flex h-8 items-center gap-1 rounded-full bg-black/20 pl-3 pr-2 text-[12px] font-medium tabular-nums"
                  >
                    {(insightAt % insights.length) + 1} / {insights.length}
                    <ChevronRight className="size-4" />
                  </button>
                )}
              </div>
              {swap(
                insight.id,
                <div className="mt-6 flex items-start gap-4">
                  <Dots value={insight.metric} still shape="square" className="mt-1 shrink-0 text-[26px]" />
                  <div className="min-w-0">
                    <div className="text-[17px] font-semibold leading-snug tracking-[-0.02em]">{insight.title}</div>
                    <p className="mt-1.5 text-[13px] leading-relaxed opacity-75">{insight.body}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        <button
          type="button"
          aria-label="Пройти тест благополучия"
          onClick={() => openSheet("wellbeing")}
          className="press glass mt-3 flex w-full items-center gap-4 rounded-[30px] p-3 pr-4 text-left"
        >
          {who ? (
            <Ring value={who.score / 100} size={44} stroke={3}>
              <span className="text-[13px] font-semibold tabular-nums">{who.score}</span>
            </Ring>
          ) : (
            <span className="glass-inset grid size-11 shrink-0 place-items-center rounded-full">
              <HeartPulse className="size-[18px]" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Индекс благополучия WHO-5</span>
            <span className="mt-0.5 block truncate text-[13px] text-ink-2">
              {who
                ? `${who5Label(who.score)}${whoPrev ? ` · ${who.score - whoPrev.score >= 0 ? "+" : ""}${who.score - whoPrev.score} к прошлому` : ""}`
                : "5 вопросов, одна минута"}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-3" />
        </button>
      </motion.section>

      <motion.section {...riseIn(3)} className="mt-10">
        <SectionHead title="Дневник" />
        {diary.length === 0 ? (
          <div className="glass mt-4 flex items-center gap-3 rounded-[26px] p-5 text-[14px] leading-relaxed text-ink-2"><Mascot /><p className="min-w-0">Здесь появятся ваши чек-ины.</p></div>
        ) : (
          <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2">
            {diary.map((m) => <DiaryEntry key={m.id} entry={m} />)}
          </ul>
        )}
        {moods.length > 3 && (
          <Button variant="ghost" className="mt-2 w-full" aria-expanded={allEntries} onClick={() => setAllEntries((v) => !v)}>
            {allEntries ? "Свернуть" : "Показать все записи"}
          </Button>
        )}
      </motion.section>
    </>
  )
}
