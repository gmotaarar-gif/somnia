import * as React from "react"
import { Smartphone } from "lucide-react"
import { FinanceBento, type FinanceBentoData } from "@/components/ui/finance-bento"
import {
  SLActivityTimelineCard,
  SLScheduleComparisonCard,
  SLSleepHeatmapCard,
  SLWeeklySeriesChart,
} from "@/components/ui/sl-data-display"
import { Button } from "@/components/ui/button"
import {
  getBedtimeDeviationMin,
  getTargetDurationMin,
  useSomna,
  type MoodEntry,
  type SleepNight,
} from "@/store/useSomnaStore"

function normalizeDayKey(raw?: string): string {
  if (!raw) return ""
  const clean = raw.split("·")[0]?.trim().toLowerCase() ?? ""
  const commaIdx = clean.indexOf(",")
  return commaIdx >= 0 ? clean.slice(commaIdx + 1).trim() : clean
}

function matchMoodPctsForNights(nights: SleepNight[], moodHistory: MoodEntry[]): number[] {
  const byExact = new Map<string, number[]>()
  const byTail = new Map<string, number[]>()

  for (const m of moodHistory) {
    const pct = Math.round((m.valence + 1) * 50)
    const explicitDate = m.dateKey ?? (m as MoodEntry & { date?: string }).date
    const rawDate = (explicitDate ?? m.timestamp.split("·")[0] ?? "").trim().toLowerCase()
    const tail = normalizeDayKey(rawDate)
    if (rawDate) byExact.set(rawDate, [...(byExact.get(rawDate) ?? []), pct])
    if (tail) byTail.set(tail, [...(byTail.get(tail) ?? []), pct])
  }

  const avg = (arr: number[]) =>
    Math.round(arr.reduce((s, v) => s + v, 0) / Math.max(1, arr.length))

  const baseline =
    moodHistory.length > 0
      ? avg(moodHistory.map((m) => Math.round((m.valence + 1) * 50)))
      : 60

  let lastKnown = baseline

  return nights.map((n, idx) => {
    const dateKey = n.dateKey?.trim().toLowerCase()
    const exactKey = n.date.trim().toLowerCase()
    const tailKey = normalizeDayKey(n.date)
    const isLast = idx === nights.length - 1
    const matched =
      (dateKey ? byExact.get(dateKey) : undefined) ??
      byExact.get(exactKey) ??
      (tailKey ? byTail.get(tailKey) : undefined) ??
      (exactKey === "сегодня" || isLast ? byExact.get("сегодня") : undefined)

    if (matched && matched.length > 0) {
      lastKnown = avg(matched)
      return lastKnown
    }
    return lastKnown
  })
}

export function WideBioBentoView({ onBackToPhone }: { onBackToPhone: () => void }) {
  const {
    sleepHistory,
    moodHistory,
    userName,
    waterMl,
    streakDays,
    breathMinutes,
    bedtimeGoal,
    wakeGoal,
    eveningDetox,
  } = useSomna()

  const bioData = React.useMemo<FinanceBentoData>(() => {
    const targetDurMin = getTargetDurationMin(bedtimeGoal, wakeGoal)
    const matchedMoodsAll = matchMoodPctsForNights(sleepHistory, moodHistory)

    const history = sleepHistory.map((n, i) => {
      const dev = Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal))
      const durPts = Math.min(40, Math.round((n.durationMin / targetDurMin) * 40))
      const feelPts = Math.round(n.quality * 0.4)
      const moodBonus = Math.round((matchedMoodsAll[i] ?? 60) * 0.1)
      const schedPts = Math.max(2, Math.round(14 - dev / 6) + Math.round(moodBonus * 0.6))
      return {
        date: new Date(2026, 10, 11 + i).toISOString(),
        label: n.date,
        fiat: durPts,
        stocks: feelPts,
        crypto: schedPts,
      }
    })

    const last6 = sleepHistory.slice(-6)
    const last5 = sleepHistory.slice(-5)
    const last5Moods = matchedMoodsAll.slice(-5)
    const nCount = Math.max(1, sleepHistory.length)
    const avgQuality = Math.round(
      sleepHistory.reduce((s, n) => s + n.quality, 0) / nCount
    )
    const onTimeRatio =
      sleepHistory.filter((n) => Math.abs(getBedtimeDeviationMin(n.bedtime, bedtimeGoal)) <= 30)
        .length / nCount
    const durRatio =
      sleepHistory.filter((n) => n.durationMin >= 420).length / nCount
    const stabilityOutOf10 = +Math.min(
      10,
      Math.max(1, onTimeRatio * 6 + durRatio * 4)
    ).toFixed(1)

    return {
      history,
      payments: [
        {
          name: eveningDetox ? "Вечерний детокс (вкл)" : "Вечерний детокс (выкл)",
          date: bedtimeGoal,
          amount: eveningDetox ? 60 : 0,
        },
        {
          name: "Дыхательная практика",
          date: "Сегодня",
          amount: Math.round(breathMinutes),
        },
        {
          name: "Записей состояния",
          date: "Журнал",
          amount: moodHistory.length,
        },
      ],
      goals: [
        { name: "Дней в журнале", progress: Math.min(1, streakDays / 30), target: 30 },
        { name: "Водный баланс дня", progress: Math.min(1, waterMl / 2000), target: 2000 },
      ],
      cashflow: {
        months: last6.map((n) => n.dayShort),
        income: [
          last6.map((n) => +(n.quality / 15).toFixed(1)),
          last6.map((n) => +(n.quality / 18).toFixed(1)),
          last6.map((n) => +(n.quality / 22).toFixed(1)),
        ],
        spending: [
          last6.map((n) => +(1.5 + n.awakenings * 0.9).toFixed(1)),
          last6.map((n) => +(1.2 + n.awakenings * 0.7).toFixed(1)),
          last6.map((n) => +(0.9 + n.awakenings * 0.5).toFixed(1)),
        ],
      },
      crypto: [
        {
          name: "Бодрость утром (%)",
          symbol: "AM",
          share: 0.45,
          change: `${last5[last5.length - 1]?.quality ?? 85}%`,
          ohlc: last5.map((n) => [n.quality - 3, n.quality + 2, n.quality - 5, n.quality]),
        },
        {
          name: "Длительность сна",
          symbol: "HRS",
          share: 0.35,
          change: `${((last5[last5.length - 1]?.durationMin ?? 460) / 60).toFixed(1)}ч`,
          ohlc: last5.map((n) => {
            const h = +(n.durationMin / 60).toFixed(1)
            return [h - 0.3, h + 0.2, h - 0.5, h]
          }),
        },
        {
          name: "Настроение",
          symbol: "MOOD",
          share: 0.2,
          change: moodHistory[moodHistory.length - 1]?.label ?? "Ровно",
          ohlc: last5.map((_, i) => {
            const p = last5Moods[i] ?? 60
            return [p - 4, p + 4, p - 6, p]
          }),
        },
      ],
      stocks: {
        days: last5.map((n) => n.dayShort),
        values: last5.map((n) => +(n.durationMin / 60).toFixed(1)),
      },
      summary: {
        avgQuality,
        stabilityOutOf10,
        nightsLabel: `${sleepHistory.length} н.`,
      },
    }
  }, [
    sleepHistory,
    moodHistory,
    waterMl,
    streakDays,
    breathMinutes,
    bedtimeGoal,
    wakeGoal,
    eveningDetox,
  ])

  return (
    <div className="min-h-screen w-full bg-black px-4 py-5 sm:px-6">
      <div className="mx-auto mb-3 flex max-w-[1320px] items-center justify-between">
        <span className="text-xs font-medium text-white/50">
          Somna Wide Bento · Сводка только по реальным записям
        </span>
        <Button size="sm" variant="soft" onClick={onBackToPhone} className="rounded-full">
          <Smartphone className="h-3.5 w-3.5" />
          <span>Вернуться к макету iPhone 16 Pro</span>
        </Button>
      </div>
      <FinanceBento
        className="mx-auto max-w-[1320px]"
        data={bioData}
        title={`Somna · ${userName}`}
        subtitle="Дневник сна, настроения и привычек"
        credit={false}
      />

      {/* SL UI Library Interactive Data Display Row */}
      <div className="mx-auto mt-4 grid max-w-[1320px] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SLWeeklySeriesChart />
        <SLSleepHeatmapCard />
        <SLScheduleComparisonCard />
        <SLActivityTimelineCard />
      </div>
    </div>
  )
}
