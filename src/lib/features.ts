import type { MoodEntry, PracticeSession, SleepNight, WellbeingResult } from "@/store/store"
import { computeStreak } from "@/lib/metrics"
import { dateKey, minutesToTime, spanMinutes, timeToMinutes } from "@/lib/time"

/** One sleep cycle and the average time it takes to fall asleep, minutes. */
export const CYCLE_MIN = 90
export const FALL_ASLEEP_MIN = 14

export interface CycleOption {
  cycles: number
  time: string
  sleepMin: number
  /** 5 cycles is the usual sweet spot for adults */
  best: boolean
}

/** Wake-up times that land between cycles if the user goes to bed at `bed` (HH:MM). */
export function wakeOptions(bed: string): CycleOption[] {
  const start = timeToMinutes(bed) + FALL_ASLEEP_MIN
  return [4, 5, 6].map((cycles) => ({
    cycles,
    time: minutesToTime(start + cycles * CYCLE_MIN),
    sleepMin: cycles * CYCLE_MIN,
    best: cycles === 5,
  }))
}

/** Bedtimes that land between cycles for a fixed wake-up time. */
export function bedOptions(wake: string): CycleOption[] {
  const end = timeToMinutes(wake)
  return [6, 5, 4].map((cycles) => ({
    cycles,
    time: minutesToTime(end - cycles * CYCLE_MIN - FALL_ASLEEP_MIN),
    sleepMin: cycles * CYCLE_MIN,
    best: cycles === 5,
  }))
}

export type Stage = "awake" | "rem" | "light" | "deep"
export interface StageSegment {
  stage: Stage
  min: number
}

export const STAGE_META: Record<Stage, { label: string; color: string; level: number }> = {
  awake: { label: "Бодрствование", color: "#ffd17a", level: 0 },
  rem: { label: "Быстрый сон", color: "#6ce3e6", level: 1 },
  light: { label: "Лёгкий сон", color: "#84a3ff", level: 2 },
  deep: { label: "Глубокий сон", color: "#b5a0ff", level: 3 },
}

/**
 * Estimated sleep architecture. There is no sensor, so this models a typical night
 * (deep sleep early, REM growing towards morning) and adjusts it by the user's
 * morning rating and number of awakenings.
 */
export function hypnogram(n: SleepNight): StageSegment[] {
  const total = Math.max(60, spanMinutes(n.bedtime, n.wakeTime))
  const cycles = Math.max(1, Math.round(total / CYCLE_MIN))
  const per = total / cycles
  const q = n.quality / 100
  const out: StageSegment[] = [{ stage: "awake", min: Math.round(FALL_ASLEEP_MIN * (1.5 - q)) }]
  const wakeAt = new Set(Array.from({ length: n.awakenings }, (_, i) => Math.round(((i + 1) * cycles) / (n.awakenings + 1))))
  for (let c = 0; c < cycles; c++) {
    const late = c / Math.max(1, cycles - 1)
    const deep = per * (0.34 - 0.26 * late) * (0.6 + 0.6 * q)
    const rem = per * (0.12 + 0.2 * late)
    const light = Math.max(8, per - deep - rem)
    out.push({ stage: "light", min: light * 0.55 })
    if (deep > 4) out.push({ stage: "deep", min: deep })
    out.push({ stage: "light", min: light * 0.45 })
    out.push({ stage: "rem", min: rem })
    if (wakeAt.has(c + 1) && c < cycles - 1) out.push({ stage: "awake", min: 8 })
  }
  const sum = out.reduce((a, s) => a + s.min, 0)
  return out.map((s) => ({ stage: s.stage, min: (s.min / sum) * total }))
}

export function stageTotals(segs: StageSegment[]): Record<Stage, number> {
  const t: Record<Stage, number> = { awake: 0, rem: 0, light: 0, deep: 0 }
  for (const s of segs) t[s.stage] += s.min
  return t
}

export interface Award {
  id: string
  title: string
  about: string
  /** 0..1 */
  progress: number
  done: boolean
  tone: "lime" | "plum" | "cobalt" | "ember" | "moss" | "rose"
}

export function buildAwards(a: {
  nights: SleepNight[]
  moods: MoodEntry[]
  sessions: PracticeSession[]
  wellbeing: WellbeingResult[]
  bedGoal: string
  wakeGoal: string
  customWidgets: number
}): Award[] {
  const streak = computeStreak(a.nights)
  const target = spanMinutes(a.bedGoal, a.wakeGoal)
  const goalNights = a.nights.filter((n) => n.durationMin >= target * 0.93).length
  const minutes = a.sessions.reduce((s, x) => s + x.min, 0)
  const calm = a.nights.filter((n) => n.awakenings === 0).length
  const make = (id: string, title: string, about: string, have: number, need: number, tone: Award["tone"]): Award => ({
    id,
    title,
    about,
    progress: Math.min(1, have / need),
    done: have >= need,
    tone,
  })
  return [
    make("week", "Первая неделя", "7 дней подряд с записью сна", streak, 7, "lime"),
    make("fortnight", "Две недели", "14 дней подряд с записью сна", streak, 14, "plum"),
    make("month", "Месяц ритма", "30 дней подряд с записью сна", streak, 30, "cobalt"),
    make("goal10", "В цель", "10 ночей с выполненной целью сна", goalNights, 10, "moss"),
    make("calm5", "Тихие ночи", "5 ночей без пробуждений", calm, 5, "cobalt"),
    make("mood10", "Наблюдатель", "10 чек-инов состояния", a.moods.length, 10, "ember"),
    make("mood30", "Знаю себя", "30 чек-инов состояния", a.moods.length, 30, "rose"),
    make("breath30", "Ровное дыхание", "30 минут практик", minutes, 30, "lime"),
    make("breath120", "Мастер паузы", "2 часа практик", minutes, 120, "plum"),
    make("who5", "Честный взгляд", "Пройден тест благополучия", a.wellbeing.length, 1, "moss"),
    make("custom", "Свой экран", "Создан собственный виджет", a.customWidgets, 1, "ember"),
  ]
}

export interface PlanItem {
  id: "sleep" | "mood" | "breath" | "water" | "ritual"
  label: string
  hint: string
  done: boolean
}

export function dayPlan(a: {
  nights: SleepNight[]
  moods: MoodEntry[]
  breathMin: number
  waterMl: number
  waterGoal: number
  ritualDone: number
}): PlanItem[] {
  const today = dateKey(new Date())
  return [
    { id: "sleep", label: "Записать сон", hint: "минута утром", done: a.nights.some((n) => n.dateKey === today) },
    { id: "mood", label: "Чек-ин состояния", hint: "20 секунд", done: a.moods.some((m) => dateKey(new Date(m.at)) === today) },
    { id: "breath", label: "3 минуты дыхания", hint: `${a.breathMin.toFixed(1)} из 3 мин`, done: a.breathMin >= 3 },
    { id: "water", label: "Норма воды", hint: `${a.waterMl} из ${a.waterGoal} мл`, done: a.waterMl >= a.waterGoal },
    { id: "ritual", label: "Вечерний ритуал", hint: `${a.ritualDone} из 3 шагов`, done: a.ritualDone >= 3 },
  ]
}

/** WHO-5 Well-Being Index: five statements rated 0..5 for the last two weeks. */
export const WHO5 = [
  "Я чувствовал себя бодрым и в хорошем настроении",
  "Я чувствовал себя спокойным и расслабленным",
  "Я чувствовал себя активным и энергичным",
  "Я просыпался свежим и отдохнувшим",
  "Моя повседневная жизнь была наполнена интересными вещами",
]
export const WHO5_SCALE = ["Никогда", "Иногда", "Меньше половины", "Больше половины", "Почти всегда", "Всё время"]

export function who5Label(score: number): string {
  if (score >= 70) return "Высокое благополучие"
  if (score >= 52) return "Хорошее самочувствие"
  if (score >= 29) return "Сниженный ресурс"
  return "Низкий ресурс"
}
