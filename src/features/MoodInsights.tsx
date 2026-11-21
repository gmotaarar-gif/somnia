import * as React from "react"
import { ArrowUpRight, ArrowLeft, Activity, Plus, Check } from "lucide-react"
import { emotionCounts } from "@/lib/metrics"
import { insightDays, observationPath, saveDailySignal, type InsightDay } from "@/lib/wellness"
import { dateKey, dayMonthShort, durationRu, parseKey, pluralRu, relativeDay, weekdayShort } from "@/lib/time"
import { useStore } from "@/store/store"
import { useNow } from "@/store/derived"
import { Card } from "@/ui/Card"
import { Button, Segmented, Slider } from "@/ui/controls"
import { Sheet } from "@/ui/Sheet"

const LIME = "#b6e34c"
const ORANGE = "#ff875c"
const moodColor = (v: number) => `hsl(${265 - v * 2.4} 72% 64%)`
const position = (i: number, count: number) => count > 1 ? i / (count - 1) * 288 : 144

function Trend({ days, kind, selected, onSelect }: { days: InsightDay[]; kind: "mood" | "signals"; selected: string | null; onSelect: (key: string) => void }) {
  const id = React.useId()
  const series = kind === "mood"
    ? [{ key: "mood" as const, color: `url(#${id})`, multiplier: 1 }]
    : [{ key: "energy" as const, color: LIME, multiplier: 10 }, { key: "stress" as const, color: ORANGE, multiplier: 10 }]
  const hasValues = days.some((d) => series.some((s) => d[s.key] != null))
  const chosen = days.find((d) => d.key === selected)
  return <>
    {kind === "signals" && <div className="mt-4 flex gap-5 text-[12px] text-ink-2"><span><span style={{ color: LIME }}>●</span> Энергия</span><span><span style={{ color: ORANGE }}>●</span> Стресс</span></div>}
    <div className="relative mt-5">
      <svg viewBox="0 0 340 160" className="w-full" role="img" aria-label={kind === "mood" ? "Среднее настроение по дням, от 0 до 100" : "Энергия и стресс по дням, от 0 до 10"}>
        <defs><linearGradient id={id}><stop stopColor="#8c65f6" /><stop offset="0.5" stopColor="#51bdbd" /><stop offset="1" stopColor="#d6e855" /></linearGradient></defs>
        {[0, 50, 100].map((v) => <g key={v}><text x="0" y={134 - v * 1.2} fill="#a3a2ad" fontSize="10">{kind === "signals" ? v / 10 : v}</text><line x1="32" x2="320" y1={130 - v * 1.2} y2={130 - v * 1.2} stroke="white" strokeOpacity="0.08" strokeDasharray="2 5" /></g>)}
        <g transform="translate(32 10)">
          {chosen && <line x1={position(days.indexOf(chosen), days.length)} x2={position(days.indexOf(chosen), days.length)} y1="0" y2="120" stroke="white" strokeOpacity="0.25" />}
          {series.map((s) => <g key={s.key}>
            <path d={observationPath(days.map((d) => d[s.key] == null ? null : d[s.key]! * s.multiplier))} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {days.map((d, i) => d[s.key] != null && <circle key={d.key} cx={position(i, days.length)} cy={120 - d[s.key]! * s.multiplier * 1.2} r={d.key === selected ? 5 : 3} fill={kind === "mood" ? moodColor(d.mood!) : s.color} />)}
          </g>)}
        </g>
        {[0, Math.floor((days.length - 1) / 2), days.length - 1].map((i) => <text key={i} x={32 + position(i, days.length)} y="155" textAnchor="middle" fill="#a3a2ad" fontSize="10">{dayMonthShort(parseKey(days[i].key))}</text>)}
      </svg>
      {!hasValues && <div className="absolute inset-0 grid place-items-center bg-[#111218]/80 px-8 text-center text-[13px] text-ink-2">{kind === "signals" ? "Отметьте энергию и стресс — здесь появится история" : "Пока нет чек-инов за этот период"}</div>}
    </div>
    <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Выбрать день графика">
      {days.map((d) => <button key={d.key} type="button" aria-pressed={d.key === selected} onClick={() => onSelect(d.key)} className={`shrink-0 rounded-full px-2.5 py-2 text-[11px] ${d.key === selected ? "bg-white text-black" : "bg-white/5 text-ink-2"}`} aria-label={relativeDay(d.key)}>{weekdayShort(parseKey(d.key))} {parseKey(d.key).getDate()}</button>)}
    </div>
    <p className="mt-3 min-h-10 text-[12px] leading-relaxed text-ink-2" aria-live="polite">{chosen ? `${relativeDay(chosen.key)} · ${kind === "mood" ? chosen.mood != null ? `${Math.round(chosen.mood)} из 100 · ${chosen.count} ${pluralRu(chosen.count, ["чек-ин", "чек-ина", "чек-инов"])}` : "Нет чек-инов" : chosen.energy != null && chosen.stress != null ? `Энергия ${chosen.energy}/10 · стресс ${chosen.stress}/10` : "Нет отметки энергии и стресса"}` : "Выберите день, чтобы увидеть подробности"}</p>
  </>
}

function SleepMood({ days }: { days: InsightDay[] }) {
  const pairs = days.filter((d) => d.sleep != null && d.mood != null)
  const [selected, setSelected] = React.useState<string | null>(null)
  const chosen = pairs.find((d) => d.key === selected)
  const lower = Math.min(240, ...pairs.map((d) => Math.floor(d.sleep! / 60) * 60))
  const upper = Math.max(600, ...pairs.map((d) => Math.ceil(d.sleep! / 60) * 60))
  const x = (sleep: number) => 42 + (sleep - lower) / (upper - lower) * 258
  return <Card tone="ink" className="p-5">
    <h3 className="text-[19px] font-semibold tracking-tight">Сон × настроение</h3>
    <p className="mt-2 text-[12px] leading-relaxed text-ink-3">Каждая точка — день. Правее — больше сна, выше — приятнее настроение. Нажмите на точку.</p>
    <svg viewBox="0 0 330 205" className="mt-4 w-full" aria-label="Сон и настроение по совпадающим датам" role="group">
      {[0, 50, 100].map((v) => <g key={v}><text x="0" y={169 - v * 1.45} fill="#a3a2ad" fontSize="10">{v}</text><line x1="42" x2="300" y1={165 - v * 1.45} y2={165 - v * 1.45} stroke="white" strokeOpacity="0.08" strokeDasharray="2 5" /></g>)}
      {[lower, (lower + upper) / 2, upper].map((v) => <text key={v} x={x(v)} y="194" fill="#a3a2ad" fontSize="10" textAnchor="middle">{Math.round(v / 6) / 10} ч</text>)}
      {pairs.map((d) => <circle key={d.key} cx={x(d.sleep!)} cy={165 - d.mood! * 1.45} r={selected === d.key ? 7 : 5} fill={moodColor(d.mood!)} stroke={selected === d.key ? "white" : "transparent"} strokeWidth="2" tabIndex={0} role="button" aria-label={`${relativeDay(d.key)}: ${durationRu(d.sleep!)}, настроение ${Math.round(d.mood!)} из 100`} onClick={() => setSelected(d.key)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(d.key) } }}><title>{`${dayMonthShort(parseKey(d.key))}: ${durationRu(d.sleep!)} · ${Math.round(d.mood!)}/100`}</title></circle>)}
    </svg>
    <p className="min-h-10 text-[12px] leading-relaxed text-ink-2" aria-live="polite">{chosen ? `${relativeDay(chosen.key)} · ${durationRu(chosen.sleep!)} · настроение ${Math.round(chosen.mood!)}/100` : pairs.length ? `${pairs.length} ${pluralRu(pairs.length, ["день", "дня", "дней"])} с записью сна и настроения. Связь не доказывает причину.` : "Запишите сон и настроение в один день — появится первая точка."}</p>
  </Card>
}

function SignalForm({ onBack }: { onBack: () => void }) {
  const { signals, patch } = useStore()
  const today = dateKey(new Date())
  const saved = signals.find((s) => s.dateKey === today)
  const [energy, setEnergy] = React.useState(saved?.energy ?? 5)
  const [stress, setStress] = React.useState(saved?.stress ?? 5)
  const [done, setDone] = React.useState(false)
  return <div className="space-y-6">
    <button type="button" onClick={onBack} className="flex items-center gap-2 text-[13px] text-ink-2"><ArrowLeft className="size-4" /> К графикам</button>
    <Card tone="dusk" className="p-6">
      <div className="text-[11px] uppercase tracking-widest text-ink-2">Сегодня · самооценка</div>
      <h3 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">Какой у вас запас сил?</h3>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">Одна отметка в день. Повторная запись обновит сегодняшнюю, а не добавит лишнюю точку.</p>
      <label className="mt-8 flex justify-between text-[15px]">Энергия <span>{energy}/10</span></label>
      <Slider label="Энергия" min={0} max={10} value={energy} onChange={(v) => { setEnergy(v); setDone(false) }} />
      <div className="flex justify-between text-[11px] text-ink-3"><span>Нет сил</span><span>Полон сил</span></div>
      <label className="mt-8 flex justify-between text-[15px]">Стресс <span>{stress}/10</span></label>
      <Slider label="Стресс" min={0} max={10} value={stress} onChange={(v) => { setStress(v); setDone(false) }} />
      <div className="flex justify-between text-[11px] text-ink-3"><span>Спокойно</span><span>Очень напряжённо</span></div>
      <Button className="mt-8 w-full" onClick={() => { patch({ signals: saveDailySignal(signals, { dateKey: dateKey(new Date()), energy, stress }) }); setDone(true) }}>{done ? <><Check /> Сохранено</> : saved ? "Обновить отметку" : "Сохранить отметку"}</Button>
      <p role="status" className="mt-3 text-center text-[12px] text-ink-2">{done ? "Отметка уже на графике. Можно вернуться к истории." : "Сохраняется только на этом устройстве"}</p>
    </Card>
  </div>
}

function InsightsContent() {
  const { moods, nights, signals } = useStore()
  const today = dateKey(useNow(60_000))
  const [period, setPeriod] = React.useState("7")
  const [form, setForm] = React.useState(false)
  const [selected, setSelected] = React.useState<string | null>(dateKey(new Date()))
  const days = React.useMemo(() => insightDays(moods, nights, signals, Number(period)), [moods, nights, signals, period, today])
  const counts = React.useMemo(() => {
    const start = days[0].key
    const end = days[days.length - 1].key
    return emotionCounts(moods.filter((m) => { const key = dateKey(new Date(m.at)); return key >= start && key <= end && new Date(m.at) <= new Date() })).slice(0, 5)
  }, [moods, days])
  const total = days.reduce((n, d) => n + d.count, 0)
  if (form) return <SignalForm onBack={() => setForm(false)} />
  return <div className="space-y-4">
    <Segmented id="mood-insights-period" className="w-full" value={period} onChange={(v) => { setPeriod(v); setSelected(null) }} options={[{ value: "7", label: "7 дней" }, { value: "14", label: "14 дней" }, { value: "30", label: "30 дней" }]} />
    <Card tone="sunset" className="overflow-hidden p-6">
      <div className="text-[11px] uppercase tracking-widest text-white/70">{dayMonthShort(parseKey(days[0].key))} — {dayMonthShort(parseKey(days[days.length - 1].key))}</div>
      <h3 className="mb-5 mt-8 text-[12px] font-medium uppercase tracking-widest text-white/70">Чаще всего вы чувствовали</h3>
      {counts.length ? counts.map((e, i) => <div key={e.name} className="flex items-baseline justify-between gap-2 py-1" style={{ opacity: 1 - i * 0.13 }}><span className="min-w-0 break-words font-semibold leading-[1.12] tracking-[-0.045em]" style={{ fontSize: Math.max(20, 34 - i * 3) }}>{e.name}</span><span className="shrink-0 text-[13px]">×{e.count}</span></div>) : <p className="text-[22px] font-semibold leading-snug">Эмоции появятся после чек-ина</p>}
      <p className="mt-7 text-[12px] text-white/70">{total} {pluralRu(total, ["чек-ин", "чек-ина", "чек-инов"])} за период · все чувства уместны</p>
    </Card>
    <Card tone="ink" className="p-5"><h3 className="text-[19px] font-semibold tracking-tight">Настроение во времени</h3><p className="mt-2 text-[12px] text-ink-3">0 — неприятно · 50 — нейтрально · 100 — приятно</p><Trend days={days} kind="mood" selected={selected} onSelect={setSelected} /></Card>
    <Card tone="ink" className="p-5"><h3 className="text-[19px] font-semibold tracking-tight">Энергия и стресс</h3><Trend days={days} kind="signals" selected={selected} onSelect={setSelected} /><Button variant="glass" className="mt-2 w-full" onClick={() => setForm(true)}><Plus /> Отметить сегодня</Button></Card>
    <SleepMood key={period} days={days} />
    <p className="px-1 pb-2 text-[11px] leading-relaxed text-ink-3">Графики используют записи дневника. Пропуски не заполняются; сон сопоставляется с настроением в день пробуждения.</p>
  </div>
}

export function MoodInsights() {
  const [open, setOpen] = React.useState(false)
  return <>
    <button type="button" onClick={() => setOpen(true)} className="press mb-4 flex w-full items-center gap-4 rounded-[26px] bg-gradient-to-br from-[#333a27] to-[#171e23] p-5 text-left ring-1 ring-inset ring-white/10">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10"><Activity className="size-5 text-[#c6e788]" /></span><span className="min-w-0 flex-1"><span className="block text-[16px] font-semibold">Ваша картина состояния</span><span className="mt-1 block text-[12px] text-ink-2">Эмоции, энергия, стресс и связь со сном</span></span><ArrowUpRight className="size-5 shrink-0 text-ink-2" />
    </button>
    <Sheet open={open} onClose={() => setOpen(false)} title="Картина состояния" description="Замечайте свои закономерности"><InsightsContent /></Sheet>
  </>
}
