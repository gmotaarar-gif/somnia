import * as React from "react"
import "@/components/sl-ui/bar-display/buttons.css"
import "@/components/sl-ui/series-legend/buttons.css"
import "@/components/sl-ui/heatmap-display/buttons.css"
import "@/components/sl-ui/comparison-display/buttons.css"
import "@/components/sl-ui/timeline-display/buttons.css"
import {
  getBedtimeDeviationMin,
  getTargetDurationMin,
  useSomna,
  type MoodEntry,
  type SleepNight,
} from "@/store/useSomnaStore"
import { TextSwapSoft } from "@/components/ui/t-motion"

function normalizeDayKey(raw?: string): string {
  if (!raw) return ""
  const clean = raw.split("·")[0]?.trim().toLowerCase() ?? ""
  const commaIdx = clean.indexOf(",")
  return commaIdx >= 0 ? clean.slice(commaIdx + 1).trim() : clean
}

function getMoodNightMatchPcts(nights: SleepNight[], moodHistory: MoodEntry[]): number[] {
  const byExact = new Map<string, number[]>()
  const byDateTail = new Map<string, number[]>()

  for (const m of moodHistory) {
    const pct = Math.round((m.valence + 1) * 50)
    const explicitDate = m.dateKey ?? (m as MoodEntry & { date?: string }).date
    const rawDate = (explicitDate ?? m.timestamp.split("·")[0] ?? "").trim().toLowerCase()
    const tail = normalizeDayKey(rawDate)
    if (rawDate) {
      byExact.set(rawDate, [...(byExact.get(rawDate) ?? []), pct])
    }
    if (tail) {
      byDateTail.set(tail, [...(byDateTail.get(tail) ?? []), pct])
    }
  }

  const avg = (arr: number[]) =>
    Math.round(arr.reduce((s, v) => s + v, 0) / Math.max(1, arr.length))

  const fallbackBaseline =
    moodHistory.length > 0
      ? avg(moodHistory.map((m) => Math.round((m.valence + 1) * 50)))
      : 60

  let lastKnown = fallbackBaseline

  return nights.map((n, idx) => {
    const dateKey = n.dateKey?.trim().toLowerCase()
    const exactKey = n.date.trim().toLowerCase()
    const tailKey = normalizeDayKey(n.date)
    const isLast = idx === nights.length - 1

    const keyMatches = dateKey ? byExact.get(dateKey) : undefined
    const exactMatches = byExact.get(exactKey)
    const tailMatches = tailKey ? byDateTail.get(tailKey) : undefined
    const todayMatches =
      exactKey === "сегодня" || isLast ? byExact.get("сегодня") : undefined

    const matched =
      keyMatches ??
      exactMatches ??
      tailMatches ??
      (exactKey === "сегодня" ? todayMatches : undefined)

    if (matched && matched.length > 0) {
      lastKnown = avg(matched)
      return lastKnown
    }
    if (isLast && todayMatches && todayMatches.length > 0) {
      lastKnown = avg(todayMatches)
      return lastKnown
    }
    return lastKnown
  })
}

/**
 * Source-faithful React integration of SL UI Library (`https://sltowl.com/docs/`)
 * Data Display components:
 * - `matte-bar-display` (`bar-display`)
 * - `matte-donut-display` (`donut-display`)
 * - `matte-metric-display` (`metric-display`)
 * - `matte-data-display-series-legend-v11` (`data-display-series-legend-v11`)
 * - `matte-data-display-heatmap-v11` (`data-display-heatmap-v11`)
 * - `matte-data-display-comparison-v11` (`data-display-comparison-v11`)
 * - `matte-timeline-display` (`timeline-display`)
 *
 * Every widget preserves the exact `.dd-demo` / `.sl-component` class structure, inline SVG geometry,
 * `data-*` action/selection hooks, keyboard handlers, CSS transitions and `aria-live` semantics,
 * connected directly to Somna's self-tracked sleep & mood journal.
 */

export function SLWeeklyBarChart({ className }: { className?: string }) {
  const { sleepHistory, bedtimeGoal, wakeGoal } = useSomna()
  const targetHrs = +(getTargetDurationMin(bedtimeGoal, wakeGoal) / 60).toFixed(1)

  const nights = React.useMemo(() => sleepHistory.slice(-7), [sleepHistory])
  const [period, setPeriod] = React.useState<"current" | "previous">("current")
  const [selectedIdx, setSelectedIdx] = React.useState<number>(Math.max(0, nights.length - 1))

  React.useEffect(() => {
    setSelectedIdx(Math.max(0, nights.length - 1))
  }, [nights.length])

  const selectedNight = nights[selectedIdx] ?? nights[nights.length - 1]
  const actualHrs = +(selectedNight.durationMin / 60).toFixed(1)
  const devMin = getBedtimeDeviationMin(selectedNight.bedtime, bedtimeGoal)
  const devText =
    devMin === 0 ? "ровно в цель" : devMin > 0 ? `+${devMin} мин к отбою` : `${devMin} мин к отбою`

  const liveAnnouncement =
    period === "current"
      ? `${selectedNight.date}: ${actualHrs} ч сна, бодрость ${selectedNight.quality}%`
      : `Цель режима: ${targetHrs} ч (${bedtimeGoal}–${wakeGoal})`

  return (
    <div className={`somna-sl ${className ?? ""}`}>
      <div className="dd-demo" data-display="bar" tabIndex={-1}>
        <div className="dd-scene">
          <section className="dd-card dd-card--bar" aria-label="Часы сна за неделю">
            <div className="dd-head">
              <h3>Записанный сон по дням</h3>
              <span className="dd-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5" />
                </svg>
              </span>
            </div>

            <div className="dd-segments" role="group" aria-label="Режим графика">
              <button
                type="button"
                data-action="period"
                data-value="current"
                aria-pressed={period === "current"}
                onClick={() => setPeriod("current")}
              >
                Факт ({nights.length}д)
              </button>
              <button
                type="button"
                data-action="period"
                data-value="previous"
                aria-pressed={period === "previous"}
                onClick={() => setPeriod("previous")}
              >
                Цель ({targetHrs}ч)
              </button>
            </div>

            <div className="dd-bar-chart">
              <div className="dd-axis" aria-hidden="true">
                <span>10ч</span>
                <span>5ч</span>
                <span>0ч</span>
              </div>
              <div className="dd-bars" role="group" aria-label="Сон по дням недели от 0 до 10 часов">
                {nights.map((n, idx) => {
                  const hrs = period === "current" ? n.durationMin / 60 : targetHrs
                  const scale = Math.max(0.08, Math.min(1, hrs / 10))
                  const isSel = selectedIdx === idx
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className="dd-bar"
                      data-action="bar"
                      data-value={String(idx)}
                      aria-label={`${n.date}: ${hrs.toFixed(1)} ч`}
                      aria-pressed={isSel}
                      onClick={() => setSelectedIdx(idx)}
                    >
                      <span className="dd-bar-track">
                        <i
                          data-bar-fill
                          style={{ transform: `scaleY(${scale.toFixed(2)})` }}
                        />
                      </span>
                      <span>{n.dayShort}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="dd-selection" data-bar-summary>
              {period === "current"
                ? `${selectedNight.date} · ${actualHrs} ч (${selectedNight.bedtime}–${selectedNight.wakeTime}) · бодрость ${selectedNight.quality}%`
                : `Цель ${targetHrs} ч (${bedtimeGoal}–${wakeGoal}) · в этот день: ${devText}`}
            </p>
          </section>
        </div>
        <p className="dd-caption">Нажмите на столбец дня, чтобы сверить время отбоя и подъёма.</p>
        <span className="dd-sr" data-live role="status" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </span>
      </div>
    </div>
  )
}

export function SLWeeklyDonutChart({ className }: { className?: string }) {
  const { sleepHistory, moodHistory, bedtimeGoal, waterMl, breathMinutes } = useSomna()

  const nights = React.useMemo(() => sleepHistory.slice(-7), [sleepHistory])
  const [selected, setSelected] = React.useState<number | null>(null)

  const stats = React.useMemo(() => {
    const totalNights = Math.max(1, nights.length)
    const durationMet = nights.filter((n) => n.durationMin >= 420).length
    const scheduleMet = nights.filter(
      (n) => Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal)) <= 30
    ).length
    const goodMorning = nights.filter((n) => n.quality >= 80).length

    const pctDur = Math.round((durationMet / totalNights) * 100)
    const pctSched = Math.round((scheduleMet / totalNights) * 100)
    const pctMood = Math.round((goodMorning / totalNights) * 100)
    const habitPct = Math.round(
      Math.min(100, (waterMl / 2000) * 50 + Math.min(1, breathMinutes / 10) * 50)
    )

    const raw = [
      durationMet,
      scheduleMet,
      goodMorning,
      Math.max(1, totalNights - Math.round((durationMet + scheduleMet + goodMorning) / 3)),
    ]
    const rawSum = Math.max(1, raw[0] + raw[1] + raw[2] + raw[3])
    const s0 = Math.round((raw[0] / rawSum) * 100)
    const s1 = Math.round((raw[1] / rawSum) * 100)
    const s2 = Math.round((raw[2] / rawSum) * 100)
    const s3 = Math.max(0, 100 - s0 - s1 - s2)
    const overallAdherence = Math.round((pctDur + pctSched + pctMood) / 3)

    return {
      overallAdherence,
      segments: [
        { label: "Сон ≥ 7ч", metricText: `${durationMet} из ${totalNights} н.`, arc: s0, valPct: pctDur },
        { label: "Отбой вовремя", metricText: `${scheduleMet} из ${totalNights} н.`, arc: s1, valPct: pctSched },
        { label: "Бодрость ≥ 80%", metricText: `${goodMorning} из ${totalNights} н.`, arc: s2, valPct: pctMood },
        { label: "Привычки дня", metricText: `${moodHistory.length} чек-инов · ${habitPct}%`, arc: s3, valPct: habitPct },
      ],
    }
  }, [nights, bedtimeGoal, waterMl, breathMinutes, moodHistory.length])

  const seg0 = stats.segments[0].arc
  const seg1 = stats.segments[1].arc
  const seg2 = stats.segments[2].arc
  const activeSeg = selected !== null ? stats.segments[selected] : null

  return (
    <div className={`somna-sl ${className ?? ""}`}>
      <div className="dd-demo" data-display="donut" tabIndex={-1}>
        <div className="dd-scene">
          <section className="dd-card dd-card--donut" aria-label="Сводка дисциплины недели">
            <div className="dd-head">
              <h3>Выполнение целей недели</h3>
              <span className="dd-pill">{nights.length} ночей</span>
            </div>

            <div className="dd-donut-layout">
              <div className="dd-donut">
                <svg
                  viewBox="0 0 120 120"
                  role="img"
                  aria-label={`Выполнение целей: ${stats.overallAdherence}%`}
                >
                  <circle
                    className="dd-donut-track"
                    cx="60"
                    cy="60"
                    r="46"
                    style={{ opacity: selected === null || selected === 3 ? 1 : 0.4 }}
                  />
                  <g transform="rotate(-90 60 60)">
                    <circle
                      className="dd-donut-arc dd-series-0"
                      data-arc="0"
                      cx="60"
                      cy="60"
                      r="46"
                      pathLength={100}
                      strokeDasharray={`${seg0} ${100 - seg0}`}
                      strokeDashoffset={0}
                      style={{ opacity: selected === null || selected === 0 ? 1 : 0.25 }}
                    />
                    <circle
                      className="dd-donut-arc dd-series-1"
                      data-arc="1"
                      cx="60"
                      cy="60"
                      r="46"
                      pathLength={100}
                      strokeDasharray={`${seg1} ${100 - seg1}`}
                      strokeDashoffset={-seg0}
                      style={{ opacity: selected === null || selected === 1 ? 1 : 0.25 }}
                    />
                    <circle
                      className="dd-donut-arc dd-series-2"
                      data-arc="2"
                      cx="60"
                      cy="60"
                      r="46"
                      pathLength={100}
                      strokeDasharray={`${seg2} ${100 - seg2}`}
                      strokeDashoffset={-(seg0 + seg1)}
                      style={{ opacity: selected === null || selected === 2 ? 1 : 0.25 }}
                    />
                  </g>
                </svg>

                <div className="dd-donut-value">
                  <strong data-storage-number>
                    <TextSwapSoft
                      value={activeSeg ? `${activeSeg.valPct}%` : `${stats.overallAdherence}%`}
                    />
                  </strong>
                  <span data-storage-label>
                    <TextSwapSoft value={activeSeg ? activeSeg.label : "режим сна"} />
                  </span>
                </div>
              </div>

              <div className="dd-legend" role="group" aria-label="Критерии недели">
                {stats.segments.map((seg, idx) => (
                  <button
                    key={seg.label}
                    type="button"
                    data-action="segment"
                    data-value={String(idx)}
                    aria-pressed={selected === idx}
                    onClick={() => setSelected((prev) => (prev === idx ? null : idx))}
                  >
                    <i className={`dd-series-${idx}`} />
                    <span>{seg.label}</span>
                    <strong>{seg.metricText}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="dd-bottom">
              <button
                className="dd-button"
                type="button"
                data-action="total"
                aria-pressed={selected === null}
                onClick={() => setSelected(null)}
              >
                {selected === null ? "Показан общий индекс" : "Вернуть общий индекс"}
              </button>
            </div>
          </section>
        </div>
        <p className="dd-caption">Нажмите на категорию справа для детальной доли выполнения.</p>
        <span className="dd-sr" data-live role="status" aria-live="polite" aria-atomic="true">
          {activeSeg
            ? `${activeSeg.label}: ${activeSeg.metricText}`
            : `Общее выполнение целей: ${stats.overallAdherence}%`}
        </span>
      </div>
    </div>
  )
}

export function SLWeeklyMetricCard({ className }: { className?: string }) {
  const { sleepHistory } = useSomna()
  const [period, setPeriod] = React.useState<"week" | "all">("week")
  const gradId = React.useId().replace(/[^a-zA-Z0-9]/g, "")

  const subset = period === "week" ? sleepHistory.slice(-7) : sleepHistory

  const avgQuality = Math.round(
    subset.reduce((acc, n) => acc + n.quality, 0) / Math.max(1, subset.length)
  )

  const half = Math.max(1, Math.floor(subset.length / 2))
  const firstAvg =
    subset.slice(0, half).reduce((s, n) => s + n.quality, 0) / half
  const secondAvg =
    subset.slice(-half).reduce((s, n) => s + n.quality, 0) / half
  const diff = +(secondAvg - firstAvg).toFixed(1)
  const trendText = `${diff >= 0 ? "+" : ""}${diff}%`

  const { points, coords } = React.useMemo(() => {
    const vals = subset.map((n) => n.quality)
    if (vals.length === 1) {
      return {
        points: "0,32 260,32",
        coords: [
          [0, 32],
          [260, 32],
        ] as [number, number][],
      }
    }
    const lo = Math.max(0, Math.min(...vals) - 6)
    const hi = Math.min(100, Math.max(...vals) + 6)
    const span = Math.max(10, hi - lo)
    const list: [number, number][] = vals.map((v, i) => [
      +((i / (vals.length - 1)) * 260).toFixed(0),
      +(56 - ((v - lo) / span) * 48).toFixed(0),
    ])
    return {
      points: list.map(([x, y]) => `${x},${y}`).join(" "),
      coords: list,
    }
  }, [subset])

  const areaPoints = React.useMemo(() => {
    if (!coords.length) return ""
    const firstX = coords[0][0]
    const lastX = coords[coords.length - 1][0]
    return `${firstX},64 ${points} ${lastX},64`
  }, [coords, points])

  const lastPt = coords[coords.length - 1] ?? [260, 32]

  return (
    <div className={`somna-sl ${className ?? ""}`}>
      <div className="dd-demo" data-display="metric" tabIndex={-1}>
        <div className="dd-scene">
          <section className="dd-card dd-card--metric" aria-label="Утренняя бодрость">
            <div className="dd-head">
              <h3>Утренняя бодрость (самооценка)</h3>
              <span className="dd-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 16 10 10l4 4 6-6M14 8h6v6" />
                </svg>
              </span>
            </div>

            <div className="dd-segments" role="group" aria-label="Период оценки">
              <button
                type="button"
                data-action="period"
                data-value="week"
                aria-pressed={period === "week"}
                onClick={() => setPeriod("week")}
              >
                7 ночей
              </button>
              <button
                type="button"
                data-action="period"
                data-value="month"
                aria-pressed={period === "all"}
                onClick={() => setPeriod("all")}
              >
                Весь журнал ({sleepHistory.length})
              </button>
            </div>

            <div className="dd-metric">
              <span data-value aria-hidden="true">
                <TextSwapSoft value={`${avgQuality}%`} />
              </span>
              <span className="dd-sr" data-number>
                {avgQuality}% средняя утренняя бодрость
              </span>
              <span className="dd-trend" data-trend>
                <TextSwapSoft value={trendText} />
              </span>
            </div>

            <p className="dd-muted" data-comparison>
              Среднее по {subset.length} утренним оценкам в журнале
            </p>

            <svg
              className="dd-spark"
              viewBox="0 0 260 64"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Динамика утренней бодрости за ${subset.length} ночей`}
            >
              <defs>
                <linearGradient id={`slm-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8ff1f" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#e8ff1f" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="dd-spark-guide" d="M0 62h260M0 32h260" />
              <polygon points={areaPoints} fill={`url(#slm-${gradId})`} stroke="none" />
              <polyline data-spark points={points} />
              <circle cx={lastPt[0]} cy={lastPt[1]} r="3.5" fill="#e8ff1f" stroke="#0d0e16" strokeWidth="1.5" />
            </svg>

            <div className="dd-foot">
              <span data-start>{subset[0]?.date ?? "Начало"}</span>
              <span>{subset[subset.length - 1]?.date ?? "Сегодня"}</span>
            </div>
          </section>
        </div>
        <span className="dd-sr" data-live role="status" aria-live="polite" aria-atomic="true">
          {avgQuality}% средняя бодрость, изменение {trendText}
        </span>
      </div>
    </div>
  )
}

/**
 * SL UI Library Component #4: `matte-data-display-series-legend-v11` (`data-display-series-legend-v11`)
 * Compares 3 tracked sleep & wellness dimensions (0–100% scale) with soft toggleable legend rows.
 */
export function SLWeeklySeriesChart({ className }: { className?: string }) {
  const { sleepHistory, moodHistory, bedtimeGoal, wakeGoal } = useSomna()
  const [visible, setVisible] = React.useState<[boolean, boolean, boolean]>([true, true, true])
  const gradId = React.useId().replace(/[^a-zA-Z0-9]/g, "")

  const nights = React.useMemo(() => sleepHistory.slice(-5), [sleepHistory])
  const targetDurMin = getTargetDurationMin(bedtimeGoal, wakeGoal)

  const chartData = React.useMemo(() => {
    const count = Math.max(1, nights.length)
    const xPos = (i: number) => (count === 1 ? 120 : (i / (count - 1)) * 240)
    const yPos = (pct: number) => +(100 - Math.max(0, Math.min(100, pct))).toFixed(1)

    // Series 0: Sleep duration fulfillment (%)
    const s0Vals = nights.map((n) => Math.min(100, Math.round((n.durationMin / targetDurMin) * 100)))
    // Series 1: Morning readiness (%)
    const s1Vals = nights.map((n) => n.quality)
    // Series 2: Mood valence matched by date (aggregating same-day check-ins)
    const s2Vals = getMoodNightMatchPcts(nights, moodHistory)

    const toPts = (vals: number[]) => vals.map((v, i) => `${xPos(i).toFixed(0)},${yPos(v)}`).join(" ")
    const avg = (vals: number[]) => Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length))

    return {
      pts0: toPts(s0Vals),
      pts1: toPts(s1Vals),
      pts2: toPts(s2Vals),
      avgHrs: (nights.reduce((a, n) => a + n.durationMin, 0) / count / 60).toFixed(1),
      avg0: avg(s0Vals),
      avg1: avg(s1Vals),
      avg2: avg(s2Vals),
    }
  }, [nights, moodHistory, targetDurMin])

  const seriesMeta = [
    { id: 0, label: "Выполнение нормы сна", displayVal: `${chartData.avgHrs}ч (${chartData.avg0}%)` },
    { id: 1, label: "Утренняя бодрость", displayVal: `${chartData.avg1}%` },
    { id: 2, label: "Эмоциональный фон", displayVal: `${chartData.avg2}%` },
  ] as const

  const toggleSeries = (idx: 0 | 1 | 2) => {
    setVisible((prev) => {
      const activeCount = prev.filter(Boolean).length
      if (prev[idx] && activeCount <= 1) return prev
      const next: [boolean, boolean, boolean] = [...prev] as [boolean, boolean, boolean]
      next[idx] = !next[idx]
      return next
    })
  }

  const activeCount = visible.filter(Boolean).length

  return (
    <div className={`somna-sl ${className ?? ""}`}>
      <section
        className="sl-component"
        data-kind="data-display-series-legend-v11"
        aria-label="Сравнение показателей недели"
      >
        <div className="dd-head">
          <h2>Ритм недели по сериям</h2>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 17 8 10l5 3 8-9M3 5l5 3 5-2 8 11" />
          </svg>
        </div>
        <p className="dd-subtitle">
          {nights.length} последних ночей · шкала 0–100% от цели
        </p>

        <div className="dd-line-chart">
          <div className="dd-y" aria-hidden="true">
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
          <svg
            className="dd-lines"
            preserveAspectRatio="none"
            viewBox="0 0 240 100"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`sls-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8ff1f" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#e8ff1f" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="dd-guide" d="M0 0h240M0 50h240M0 100h240" />
            {visible[0] ? (
              <polygon
                points={`0,100 ${chartData.pts0} 240,100`}
                fill={`url(#sls-${gradId})`}
                stroke="none"
              />
            ) : null}
            <polyline
              data-series="0"
              className="dd-series dd-series-0"
              points={chartData.pts0}
              style={{ opacity: visible[0] ? 1 : 0 }}
            />
            <polyline
              data-series="1"
              className="dd-series dd-series-1"
              points={chartData.pts1}
              style={{ opacity: visible[1] ? 1 : 0 }}
            />
            <polyline
              data-series="2"
              className="dd-series dd-series-2"
              points={chartData.pts2}
              style={{ opacity: visible[2] ? 1 : 0 }}
            />
          </svg>
        </div>

        <div className="dd-scale dd-week-scale">
          {nights.map((n) => (
            <span key={n.id}>{n.dayShort}</span>
          ))}
        </div>

        <div className="dd-legend" role="group" aria-label="Переключение линий графика">
          {seriesMeta.map((s) => {
            const on = visible[s.id]
            const lockedLast = on && activeCount === 1
            return (
              <button
                key={s.id}
                type="button"
                data-toggle={s.id}
                aria-pressed={on}
                disabled={lockedLast}
                onClick={() => toggleSeries(s.id)}
              >
                <svg className={`dd-swatch dd-series-${s.id}`} viewBox="0 0 24 8" aria-hidden="true">
                  <path d="M1 4h22" />
                </svg>
                <span>{s.label}</span>
                <strong>{s.displayVal}</strong>
                <span data-check aria-hidden="true">
                  {on ? "✓" : "−"}
                </span>
              </button>
            )
          })}
        </div>

        <p className="dd-summary" data-summary role="status" aria-live="polite" aria-atomic="true">
          Активно линий: {activeCount} из 3 · средн. сон {chartData.avgHrs} ч · бодрость {chartData.avg1}%
        </p>
        <p className="dd-hint">Минимум одна линия остаётся видимой.</p>
      </section>
    </div>
  )
}

/**
 * SL UI Library Component #5: `matte-data-display-heatmap-v11` (`data-display-heatmap-v11`)
 * 5 nights × 3 sleep criteria heatmap with full keyboard & tap cell inspection.
 */
export function SLSleepHeatmapCard({ className }: { className?: string }) {
  const { sleepHistory, bedtimeGoal } = useSomna()
  const nights = React.useMemo(() => sleepHistory.slice(-5), [sleepHistory])
  const [selected, setSelected] = React.useState<number>(Math.max(0, nights.length - 1))
  const gridRef = React.useRef<HTMLDivElement | null>(null)

  const rows = React.useMemo(() => {
    // Row 0: Hours slept, Row 1: Morning readiness %, Row 2: Bedtime closeness (min dev)
    return [
      {
        label: "Часы",
        cells: nights.map((n) => {
          const hrs = +(n.durationMin / 60).toFixed(1)
          return {
            shortVal: `${hrs}`,
            intensity: Math.max(0.18, Math.min(1, hrs / 9)),
            detail: `${n.dayShort} (${n.date}) · Сон ${hrs} ч (${n.bedtime}–${n.wakeTime})`,
          }
        }),
      },
      {
        label: "Бодр.",
        cells: nights.map((n) => ({
          shortVal: `${n.quality}`,
          intensity: Math.max(0.18, Math.min(1, n.quality / 100)),
          detail: `${n.dayShort} (${n.date}) · Бодрость утром ${n.quality}%`,
        })),
      },
      {
        label: "Отбой",
        cells: nights.map((n) => {
          const absDev = Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal))
          const score = Math.max(0.15, Math.min(1, 1 - absDev / 90))
          return {
            shortVal: absDev === 0 ? "0м" : `±${absDev}`,
            intensity: score,
            detail: `${n.dayShort} (${n.date}) · Отбой ${n.bedtime} (откл. ${absDev} мин от ${bedtimeGoal})`,
          }
        }),
      },
    ]
  }, [nights, bedtimeGoal])

  const flatCells = React.useMemo(() => rows.flatMap((r) => r.cells), [rows])
  const safeSel = Math.max(0, Math.min(flatCells.length - 1, selected))
  const cols = Math.max(1, nights.length)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement | null)?.closest?.("[data-select]")
    if (!btn) return
    const index = Number(btn.getAttribute("data-select"))
    const count = flatCells.length
    let next = index
    if (e.key === "ArrowRight") next = index % cols === cols - 1 ? index : index + 1
    else if (e.key === "ArrowLeft") next = index % cols === 0 ? index : index - 1
    else if (e.key === "ArrowDown") next = index + cols < count ? index + cols : index
    else if (e.key === "ArrowUp") next = index - cols >= 0 ? index - cols : index
    else if (e.key === "Home") next = e.ctrlKey ? 0 : Math.floor(index / cols) * cols
    else if (e.key === "End")
      next = e.ctrlKey ? count - 1 : Math.min(count - 1, Math.floor(index / cols) * cols + cols - 1)
    else return
    e.preventDefault()
    setSelected(next)
    const targetBtn = gridRef.current?.querySelector(`[data-select="${next}"]`) as HTMLElement | null
    targetBtn?.focus({ preventScroll: true })
  }

  return (
    <div className={`somna-sl ${className ?? ""}`}>
      <section
        className="sl-component"
        data-kind="data-display-heatmap-v11"
        aria-label="Тепловая карта сна"
      >
        <div className="dd-head">
          <h2>Матрица ночей и режима</h2>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 5h16M4 12h16M4 19h16M8 3v18m8-18v18" />
          </svg>
        </div>
        <p className="dd-subtitle">
          {nights.length} последних ночей · цель отбоя {bedtimeGoal}
        </p>

        <div
          ref={gridRef}
          className="dd-heat"
          role="group"
          aria-label="Показатели по дням недели"
          onKeyDown={handleKeyDown}
        >
          <span />
          {nights.map((n) => (
            <span key={n.id} className="dd-axis">
              {n.dayShort}
            </span>
          ))}

          {rows.map((row, rIdx) => (
            <React.Fragment key={row.label}>
              <span className="dd-axis">{row.label}</span>
              {row.cells.map((cell, cIdx) => {
                const idx = rIdx * cols + cIdx
                const isSel = idx === safeSel
                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    type="button"
                    data-select={idx}
                    aria-pressed={isSel}
                    className="dd-cell"
                    tabIndex={isSel ? 0 : -1}
                    aria-label={cell.detail}
                    style={{ "--intensity": cell.intensity } as React.CSSProperties}
                    onClick={() => setSelected(idx)}
                  >
                    {cell.shortVal}
                  </button>
                )
              })}
            </React.Fragment>
          ))}
        </div>

        <div className="dd-scale">
          <span>Ниже цели</span>
          <span className="dd-ramp" aria-hidden="true" />
          <span>В норме</span>
        </div>

        <p className="dd-summary" data-summary role="status" aria-live="polite" aria-atomic="true">
          {flatCells[safeSel]?.detail ?? ""}
        </p>
        <p className="dd-hint">Нажимайте на ячейки или клавиши стрелок.</p>
      </section>
    </div>
  )
}

/**
 * SL UI Library Component #6: `matte-data-display-comparison-v11` (`data-display-comparison-v11`)
 * Compares Target vs Actual weekly averages with Units vs % Delta toggle.
 */
export function SLScheduleComparisonCard({ className }: { className?: string }) {
  const { sleepHistory, bedtimeGoal, wakeGoal } = useSomna()
  const [selected, setSelected] = React.useState(0)
  const [mode, setMode] = React.useState<"count" | "percent">("count")

  const nights = React.useMemo(() => sleepHistory.slice(-7), [sleepHistory])
  const targetHrs = +(getTargetDurationMin(bedtimeGoal, wakeGoal) / 60).toFixed(1)

  const records = React.useMemo(() => {
    const count = Math.max(1, nights.length)
    const avgHrs = +(nights.reduce((s, n) => s + n.durationMin, 0) / count / 60).toFixed(1)
    const avgQual = Math.round(nights.reduce((s, n) => s + n.quality, 0) / count)
    const calmPct = Math.round((nights.filter((n) => n.awakenings <= 1).length / count) * 100)

    const diffHrs = +(avgHrs - targetHrs).toFixed(1)
    const pctHrs = Math.round(((avgHrs - targetHrs) / Math.max(1, targetHrs)) * 100)

    const qualTarget = 85
    const diffQual = avgQual - qualTarget
    const pctQual = Math.round(((avgQual - qualTarget) / qualTarget) * 100)

    const calmTarget = 90
    const diffCalm = calmPct - calmTarget
    const pctCalm = Math.round(((calmPct - calmTarget) / calmTarget) * 100)

    return [
      {
        title: "Длительность сна",
        goalLabel: `${targetHrs}ч`,
        factLabel: `${avgHrs}ч`,
        goalScale: Math.min(1, targetHrs / 10),
        factScale: Math.min(1, avgHrs / 10),
        deltaCount: `${diffHrs >= 0 ? "+" : ""}${diffHrs} ч`,
        deltaPct: `${pctHrs >= 0 ? "+" : ""}${pctHrs}%`,
        summary: `Сон: план ${targetHrs} ч → факт ${avgHrs} ч (${diffHrs >= 0 ? "+" : ""}${diffHrs} ч)`,
      },
      {
        title: "Утренняя бодрость",
        goalLabel: `${qualTarget}%`,
        factLabel: `${avgQual}%`,
        goalScale: qualTarget / 100,
        factScale: avgQual / 100,
        deltaCount: `${diffQual >= 0 ? "+" : ""}${diffQual} пт`,
        deltaPct: `${pctQual >= 0 ? "+" : ""}${pctQual}%`,
        summary: `Бодрость: ориентир ${qualTarget}% → факт ${avgQual}% (${diffQual >= 0 ? "+" : ""}${diffQual} пт)`,
      },
      {
        title: "Спокойный сон",
        goalLabel: `${calmTarget}%`,
        factLabel: `${calmPct}%`,
        goalScale: calmTarget / 100,
        factScale: calmPct / 100,
        deltaCount: `${diffCalm >= 0 ? "+" : ""}${diffCalm} пт`,
        deltaPct: `${pctCalm >= 0 ? "+" : ""}${pctCalm}%`,
        summary: `До 1 пробуждения: ориентир ${calmTarget}% → факт ${calmPct}% (${nights.length} н.)`,
      },
    ]
  }, [nights, targetHrs])

  const active = records[selected] ?? records[0]

  return (
    <div className={`somna-sl ${className ?? ""}`}>
      <section
        className="sl-component"
        data-kind="data-display-comparison-v11"
        aria-label="Сравнение плана и факта"
      >
        <div className="dd-head">
          <h2>План и факт за 7 ночей</h2>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 6h16M4 18h16M8 3v6m8 6v6M6 12h12" />
          </svg>
        </div>
        <p className="dd-subtitle">Расписание {bedtimeGoal}–{wakeGoal} против реального журнала</p>

        <div className="dd-modes" role="group" aria-label="Формат отклонения">
          <button
            type="button"
            data-mode="count"
            aria-pressed={mode === "count"}
            onClick={() => setMode("count")}
          >
            Отклонение
          </button>
          <button
            type="button"
            data-mode="percent"
            aria-pressed={mode === "percent"}
            onClick={() => setMode("percent")}
          >
            В процентах %
          </button>
        </div>

        <div className="dd-compare" role="group" aria-label="Сравнение метрик сна">
          {records.map((rec, i) => (
            <button
              key={rec.title}
              type="button"
              data-select={i}
              aria-pressed={selected === i}
              className="dd-compare-row"
              onClick={() => setSelected(i)}
            >
              <span className="dd-row-head">
                <span>{rec.title}</span>
                <strong data-delta>
                  <TextSwapSoft
                    value={mode === "count" ? rec.deltaCount : rec.deltaPct}
                    align="end"
                  />
                </strong>
              </span>
              <span className="dd-cycle">
                <span>Цель</span>
                <span className="dd-cycle-track" aria-hidden="true">
                  <i style={{ transform: `scaleX(${rec.goalScale.toFixed(2)})` }} />
                </span>
                <strong>{rec.goalLabel}</strong>
              </span>
              <span className="dd-cycle dd-cycle-current">
                <span>Факт</span>
                <span className="dd-cycle-track" aria-hidden="true">
                  <i style={{ transform: `scaleX(${rec.factScale.toFixed(2)})` }} />
                </span>
                <strong>{rec.factLabel}</strong>
              </span>
            </button>
          ))}
        </div>

        <p className="dd-summary" data-summary role="status" aria-live="polite" aria-atomic="true">
          {active.summary}
        </p>
        <p className="dd-hint">Нажмите на строку для сводки показателя.</p>
      </section>
    </div>
  )
}

/**
 * SL UI Library Component #7: `matte-timeline-display` (`timeline-display`)
 * Chronological timeline of recorded sleep sessions & mood check-ins with smooth expand/collapse.
 */
export function SLActivityTimelineCard({ className }: { className?: string }) {
  const { sleepHistory, moodHistory, bedtimeGoal, wakeGoal } = useSomna()
  const [expanded, setExpanded] = React.useState(false)

  const events = React.useMemo(() => {
    const recentMoods = [...moodHistory].slice(-2).reverse()
    const recentNights = [...sleepHistory].slice(-2).reverse()

    const list: {
      id: string
      icon: "check" | "layers" | "brief" | "folder"
      title: string
      time: string
    }[] = []

    if (recentMoods[0]) {
      const m = recentMoods[0]
      list.push({
        id: `m-${m.id}`,
        icon: "check",
        title: `${m.label} (${m.emotions.slice(0, 2).join(", ") || "чек-ин"})`,
        time: m.timestamp,
      })
    }
    if (recentNights[0]) {
      const n = recentNights[0]
      list.push({
        id: `n-${n.id}`,
        icon: "layers",
        title: `Сон ${(n.durationMin / 60).toFixed(1)} ч · бодрость ${n.quality}%`,
        time: `${n.date}, ${n.bedtime} – ${n.wakeTime}`,
      })
    }
    if (recentMoods[1]) {
      const m = recentMoods[1]
      list.push({
        id: `m-${m.id}`,
        icon: "check",
        title: `${m.label} (${m.emotions.slice(0, 2).join(", ") || "чек-ин"})`,
        time: m.timestamp,
      })
    }
    if (recentNights[1]) {
      const n = recentNights[1]
      list.push({
        id: `n-${n.id}`,
        icon: "brief",
        title: n.note
          ? `${n.date}: ${n.note}`
          : `Сон ${(n.durationMin / 60).toFixed(1)} ч · пробужд. ${n.awakenings}`,
        time: `${n.date}, ${n.bedtime} – ${n.wakeTime}`,
      })
    }
    list.push({
      id: "summary-archive",
      icon: "folder",
      title: `В журнале ${sleepHistory.length} ночей · план ${bedtimeGoal}–${wakeGoal}`,
      time: `Всего отметок настроения: ${moodHistory.length}`,
    })

    return list
  }, [sleepHistory, moodHistory, bedtimeGoal, wakeGoal])

  const primary = events.slice(0, 3)
  const earlier = events.slice(3)

  const renderIcon = (icon: "check" | "layers" | "brief" | "folder") => {
    if (icon === "layers") {
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5" />
        </svg>
      )
    }
    if (icon === "brief") {
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h5" />
        </svg>
      )
    }
    if (icon === "folder") {
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 7V5h7l3 3h8v12H3Z" />
        </svg>
      )
    }
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m5 12 4 4L19 6" />
      </svg>
    )
  }

  return (
    <div className={`somna-sl ${className ?? ""}`}>
      <div
        className="dd-demo"
        data-display="timeline"
        data-expanded={String(expanded)}
        tabIndex={-1}
      >
        <div className="dd-scene">
          <section className="dd-card dd-card--timeline" aria-label="Лента записей Somna">
            <div className="dd-head">
              <h3>Лента журнала</h3>
              <span className="dd-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </span>
            </div>

            <ol className="dd-timeline">
              {primary.map((ev) => (
                <li key={ev.id}>
                  <span className="dd-icon">{renderIcon(ev.icon)}</span>
                  <div>
                    <strong>{ev.title}</strong>
                    <time>{ev.time}</time>
                  </div>
                </li>
              ))}
            </ol>

            {earlier.length > 0 ? (
              <>
                <div
                  className="dd-collapse"
                  data-expanded={String(expanded)}
                  data-extra
                  aria-hidden={!expanded}
                >
                  <div>
                    <ol className="dd-timeline dd-timeline--earlier">
                      {earlier.map((ev) => (
                        <li key={ev.id}>
                          <span className="dd-icon">{renderIcon(ev.icon)}</span>
                          <div>
                            <strong>{ev.title}</strong>
                            <time>{ev.time}</time>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="dd-bottom">
                  <button
                    className="dd-button"
                    type="button"
                    data-action="toggle"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? "Скрыть ранние записи" : "Показать ранние записи"}
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </div>
        <span className="dd-sr" data-live role="status" aria-live="polite" aria-atomic="true">
          {expanded ? "Показаны ранние записи" : "Показаны последние записи"}
        </span>
      </div>
    </div>
  )
}
