import * as React from "react"
import {
  setSoundVolume,
  startSound,
  stopSound,
  type SoundMode,
} from "@/lib/audioEngine"
import { toLocalDateKey } from "@/lib/sleepTime"

export type GlowTheme =
  | "emerald-lime"
  | "plum-violet"
  | "burnt-copper"
  | "crimson-rose"
  | "cobalt-indigo"
  | "rose-quartz"
  | "obsidian-neon"

export type TabId = "home" | "sleep" | "analytics" | "practices"
export type BentoPeriod = "7D" | "30D" | "90D"
export type DockMode = "soft"

export interface SleepNight {
  id: string
  date: string
  dateKey?: string
  dayShort: string
  bedtime: string
  wakeTime: string
  durationMin: number
  /** Субъективная оценка бодрости утром (0..100%) */
  quality: number
  /** Замеченные пробуждения за ночь (0..3) */
  awakenings: number
  note?: string
}

export interface MoodEntry {
  id: string
  timestamp: string
  dateKey?: string
  valence: number // -1 to +1
  label: string
  emotions: string[]
  factors: string[]
  note?: string
}

export type WidgetSize = "1x1" | "2x1"

export type WidgetKind =
  | "bio-stream"
  | "sleep-phases"
  | "mood-waves"
  | "weekly-capsules"
  | "sleep-quality"
  | "daily-streak"
  | "evening-detox"
  | "breath-volume"
  | "morning-energy"
  | "water-balance"
  | "body-report"
  | "custom"

export interface BentoWidgetItem {
  id: string
  kind: WidgetKind
  title: string
  subtitle?: string
  size: WidgetSize
  theme: GlowTheme
  visible: boolean
  customUnit?: string
  customValue?: number
  customTarget?: number
  customStep?: number
}

export interface SpectrumAxis {
  id: string
  leftLabel: string
  rightLabel: string
  baseline: number // 0..1
  current: number // 0..1
}

export interface StressTimerState {
  running: boolean
  remainingSec: number
  totalSec: number
  intensity: number
  technique: "stress" | "478" | "box"
  sound: SoundMode
}

export interface SomnaTimerStore {
  stressTimer: StressTimerState
  setStressTimer: React.Dispatch<React.SetStateAction<StressTimerState>>
}

const DEFAULT_SLEEP_HISTORY: SleepNight[] = [
  {
    id: "s-1",
    date: "Пн, 4 ноя",
    dateKey: "2026-11-04",
    dayShort: "Пн",
    bedtime: "00:25",
    wakeTime: "07:15",
    durationMin: 410,
    quality: 66,
    awakenings: 2,
    note: "Поздний рабочий созвон",
  },
  {
    id: "s-2",
    date: "Вт, 5 ноя",
    dateKey: "2026-11-05",
    dayShort: "Вт",
    bedtime: "23:55",
    wakeTime: "07:20",
    durationMin: 445,
    quality: 76,
    awakenings: 1,
  },
  {
    id: "s-3",
    date: "Ср, 6 ноя",
    dateKey: "2026-11-06",
    dayShort: "Ср",
    bedtime: "00:40",
    wakeTime: "07:10",
    durationMin: 390,
    quality: 62,
    awakenings: 2,
  },
  {
    id: "s-4",
    date: "Чт, 7 ноя",
    dateKey: "2026-11-07",
    dayShort: "Чт",
    bedtime: "23:40",
    wakeTime: "07:25",
    durationMin: 465,
    quality: 81,
    awakenings: 0,
  },
  {
    id: "s-5",
    date: "Пт, 8 ноя",
    dateKey: "2026-11-08",
    dayShort: "Пт",
    bedtime: "23:20",
    wakeTime: "07:35",
    durationMin: 495,
    quality: 87,
    awakenings: 0,
    note: "Вечерняя прогулка перед сном",
  },
  {
    id: "s-6",
    date: "Сб, 9 ноя",
    dateKey: "2026-11-09",
    dayShort: "Сб",
    bedtime: "00:10",
    wakeTime: "08:30",
    durationMin: 500,
    quality: 88,
    awakenings: 1,
  },
  {
    id: "s-7",
    date: "Вс, 10 ноя",
    dateKey: "2026-11-10",
    dayShort: "Вс",
    bedtime: "23:45",
    wakeTime: "07:40",
    durationMin: 475,
    quality: 83,
    awakenings: 0,
  },
  {
    id: "s-8",
    date: "Пн, 11 ноя",
    dateKey: "2026-11-11",
    dayShort: "Пн",
    bedtime: "00:05",
    wakeTime: "07:20",
    durationMin: 435,
    quality: 74,
    awakenings: 1,
  },
  {
    id: "s-9",
    date: "Вт, 12 ноя",
    dateKey: "2026-11-12",
    dayShort: "Вт",
    bedtime: "23:45",
    wakeTime: "07:25",
    durationMin: 460,
    quality: 82,
    awakenings: 0,
  },
  {
    id: "s-10",
    date: "Ср, 13 ноя",
    dateKey: "2026-11-13",
    dayShort: "Ср",
    bedtime: "00:30",
    wakeTime: "07:10",
    durationMin: 400,
    quality: 68,
    awakenings: 2,
  },
  {
    id: "s-11",
    date: "Чт, 14 ноя",
    dateKey: "2026-11-14",
    dayShort: "Чт",
    bedtime: "23:30",
    wakeTime: "07:20",
    durationMin: 470,
    quality: 86,
    awakenings: 0,
  },
  {
    id: "s-12",
    date: "Пт, 15 ноя",
    dateKey: "2026-11-15",
    dayShort: "Пт",
    bedtime: "23:25",
    wakeTime: "07:35",
    durationMin: 490,
    quality: 91,
    awakenings: 0,
  },
  {
    id: "s-13",
    date: "Сб, 16 ноя",
    dateKey: "2026-11-16",
    dayShort: "Сб",
    bedtime: "23:50",
    wakeTime: "08:05",
    durationMin: 495,
    quality: 89,
    awakenings: 1,
  },
  {
    id: "s-14",
    date: "Сегодня",
    dateKey: "2026-11-17",
    dayShort: "Вс",
    bedtime: "23:38",
    wakeTime: "07:20",
    durationMin: 462,
    quality: 85,
    awakenings: 0,
    note: "Лёгкое засыпание после 4 минут медленного дыхания",
  },
]

const DEFAULT_MOODS: MoodEntry[] = [
  {
    id: "m-1",
    timestamp: "Ср, 6 ноя · 22:30",
    dateKey: "2026-11-06",
    valence: -0.22,
    label: "Слегка неприятно",
    emotions: ["Усталость", "Напряжение"],
    factors: ["Работа", "Кофеин"],
  },
  {
    id: "m-2",
    timestamp: "Пт, 8 ноя · 20:15",
    dateKey: "2026-11-08",
    valence: 0.44,
    label: "Слегка приятно",
    emotions: ["Спокойствие", "Лёгкость"],
    factors: ["Прогулка", "Отдых"],
  },
  {
    id: "m-3",
    timestamp: "Вс, 10 ноя · 18:40",
    dateKey: "2026-11-10",
    valence: 0.52,
    label: "Приятно",
    emotions: ["Умиротворение", "Уют"],
    factors: ["Отдых", "Семья"],
  },
  {
    id: "m-4",
    timestamp: "Пн, 11 ноя · 21:20",
    dateKey: "2026-11-11",
    valence: 0.08,
    label: "Нейтрально",
    emotions: ["Рассеянность", "Спокойствие"],
    factors: ["Работа"],
  },
  {
    id: "m-5",
    timestamp: "Вт, 12 ноя · 21:50",
    dateKey: "2026-11-12",
    valence: 0.36,
    label: "Слегка приятно",
    emotions: ["Спокойствие", "Тепло"],
    factors: ["Сон", "Отдых"],
  },
  {
    id: "m-6",
    timestamp: "Ср, 13 ноя · 22:10",
    dateKey: "2026-11-13",
    valence: -0.14,
    label: "Слегка неприятно",
    emotions: ["Усталость", "Тревога"],
    factors: ["Работа", "Кофеин"],
  },
  {
    id: "m-7",
    timestamp: "Чт, 14 ноя · 09:30",
    dateKey: "2026-11-14",
    valence: 0.56,
    label: "Приятно",
    emotions: ["Ясность", "Уверенность"],
    factors: ["Сон", "Прогулка"],
  },
  {
    id: "m-8",
    timestamp: "Пт, 15 ноя · 21:40",
    dateKey: "2026-11-15",
    valence: 0.64,
    label: "Приятно",
    emotions: ["Умиротворение", "Лёгкость", "Благодарность"],
    factors: ["Отдых", "Спорт"],
  },
  {
    id: "m-9",
    timestamp: "Сб, 16 ноя · 10:15",
    dateKey: "2026-11-16",
    valence: 0.72,
    label: "Приятно",
    emotions: ["Ясность", "Уверенность", "Вдохновение"],
    factors: ["Сон", "Прогулка"],
  },
  {
    id: "m-10",
    timestamp: "Сегодня · 19:53",
    dateKey: "2026-11-17",
    valence: 0.42,
    label: "Слегка приятно",
    emotions: ["Умиротворение", "Лёгкость"],
    factors: ["Сон", "Отдых"],
    note: "Ровный вечер перед сном",
  },
]

const DEFAULT_SPECTRUM: SpectrumAxis[] = [
  { id: "calm", leftLabel: "ТРЕВОГА", rightLabel: "СПОКОЙСТВИЕ", baseline: 0.36, current: 0.74 },
  { id: "energy", leftLabel: "УСТАЛОСТЬ", rightLabel: "БОДРОСТЬ", baseline: 0.42, current: 0.82 },
  { id: "sleep", leftLabel: "НЕДОВЫСЫП", rightLabel: "ВЫСПАЛСЯ", baseline: 0.34, current: 0.72 },
  { id: "focus", leftLabel: "РАССЕЯННО", rightLabel: "ЯСНОСТЬ", baseline: 0.3, current: 0.65 },
  { id: "balance", leftLabel: "ПЕРЕГРУЗ", rightLabel: "БАЛАНС", baseline: 0.45, current: 0.78 },
]

const DEFAULT_WIDGETS: BentoWidgetItem[] = [
  {
    id: "w-bio-stream",
    kind: "bio-stream",
    title: "Индекс восстановления",
    subtitle: "Сон · бодрость · точность отбоя",
    size: "2x1",
    theme: "cobalt-indigo",
    visible: true,
  },
  {
    id: "w-capsules",
    kind: "weekly-capsules",
    title: "Часы сна",
    subtitle: "Выполнение цели по ночам",
    size: "1x1",
    theme: "emerald-lime",
    visible: true,
  },
  {
    id: "w-morning",
    kind: "morning-energy",
    title: "Утренняя бодрость",
    subtitle: "Сравнение утра со средним",
    size: "1x1",
    theme: "burnt-copper",
    visible: true,
  },
  {
    id: "w-phases",
    kind: "sleep-phases",
    title: "Точность режима",
    subtitle: "Отбой ±30 мин и критерии сна",
    size: "2x1",
    theme: "obsidian-neon",
    visible: true,
  },
  {
    id: "w-waves",
    kind: "mood-waves",
    title: "Эмоции и факторы",
    subtitle: "Баланс состояния и частые теги",
    size: "2x1",
    theme: "crimson-rose",
    visible: true,
  },
  {
    id: "w-streak",
    kind: "daily-streak",
    title: "Серия журнала",
    subtitle: "Дней подряд и объём записей",
    size: "1x1",
    theme: "obsidian-neon",
    visible: true,
  },
  {
    id: "w-water",
    kind: "water-balance",
    title: "Водный баланс",
    subtitle: "Стаканы и норма 2000 мл",
    size: "1x1",
    theme: "emerald-lime",
    visible: true,
  },
  {
    id: "w-detox",
    kind: "evening-detox",
    title: "Вечерний режим",
    subtitle: "Напоминание и цель отбоя",
    size: "2x1",
    theme: "cobalt-indigo",
    visible: true,
  },
  {
    id: "w-sleep",
    kind: "sleep-quality",
    title: "Последняя ночь",
    subtitle: "Длительность, отбой и бодрость",
    size: "1x1",
    theme: "plum-violet",
    visible: true,
  },
  {
    id: "w-breath",
    kind: "breath-volume",
    title: "Практика дыхания",
    subtitle: "Минуты анти-стресса и схема дня",
    size: "1x1",
    theme: "rose-quartz",
    visible: true,
  },
  {
    id: "w-report",
    kind: "body-report",
    title: "Сводка ритма",
    subtitle: "Выполнение цели и стабильность",
    size: "2x1",
    theme: "obsidian-neon",
    visible: true,
  },
]

export interface WeeklyGoalItem {
  id: string
  text: string
  setAt: string
}

export interface SomnaStore {
  onboarded: boolean
  setOnboarded: (v: boolean) => void
  activeTab: TabId
  setActiveTab: (t: TabId) => void
  bentoPeriod: BentoPeriod
  setBentoPeriod: (p: BentoPeriod) => void
  dockMode: DockMode
  setDockMode: (m: DockMode) => void
  anyOverlayOpen: boolean
  userName: string
  setUserName: (n: string) => void
  chronotype: "early" | "balanced" | "night"
  setChronotype: (c: "early" | "balanced" | "night") => void
  bedtimeGoal: string
  wakeGoal: string
  setSleepSchedule: (bed: string, wake: string) => void
  reminderEnabled: boolean
  setReminderEnabled: (v: boolean) => void
  reminderTime: string
  setReminderTime: (t: string) => void
  reminderDays: number[]
  setReminderDays: (days: number[]) => void
  focusGoals: string[]
  setFocusGoals: (goals: string[]) => void
  ritualDoneIds: string[]
  setRitualDoneIds: (ids: string[]) => void
  soundVolume: number
  setSoundVolumePct: (pct: number) => void
  eveningDetox: boolean
  setEveningDetox: (v: boolean) => void
  waterMl: number
  addWater: (ml: number) => void
  breathMinutes: number
  addBreathMinutes: (min: number) => void
  streakDays: number
  sleepHistory: SleepNight[]
  addSleepNight: (night: Omit<SleepNight, "id">) => void
  sleepModeActive: boolean
  setSleepModeActive: (v: boolean) => void
  moodHistory: MoodEntry[]
  addMoodEntry: (entry: Omit<MoodEntry, "id" | "timestamp">) => void
  spectrum: SpectrumAxis[]
  updateSpectrumAxis: (id: string, val: number, asBaseline?: boolean) => void
  widgets: BentoWidgetItem[]
  setWidgets: React.Dispatch<React.SetStateAction<BentoWidgetItem[]>>
  toggleWidgetSize: (id: string) => void
  removeWidget: (id: string) => void
  restoreWidget: (id: string) => void
  addCustomWidget: (cfg: {
    title: string
    unit: string
    target: number
    step?: number
    size: WidgetSize
    theme: GlowTheme
  }) => void
  incrementCustomWidget: (id: string) => void
  resetWidgets: () => void
  resetDemoData: () => void
  editWidgetsMode: boolean
  setEditWidgetsMode: (v: boolean) => void
  moodDrawerOpen: boolean
  setMoodDrawerOpen: (v: boolean) => void
  widgetGalleryOpen: boolean
  setWidgetGalleryOpen: (v: boolean) => void
  weeklyRecapOpen: boolean
  setWeeklyRecapOpen: (v: boolean) => void
  weeklyGoal: WeeklyGoalItem | null
  setWeeklyGoal: (goal: { id: string; text: string } | null) => void
  sleepLogOpen: boolean
  setSleepLogOpen: (v: boolean) => void
  profileOpen: boolean
  setProfileOpen: (v: boolean) => void
}

const STORAGE_KEY = "somna-app-state-v5"

const SomnaContext = React.createContext<SomnaStore | null>(null)
const SomnaTimerContext = React.createContext<SomnaTimerStore | null>(null)

export function SomnaProvider({ children }: { children: React.ReactNode }) {
  const saved = React.useMemo(() => {
    if (typeof window === "undefined") return null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const [onboarded, setOnboarded] = React.useState<boolean>(saved?.onboarded ?? true)
  const [activeTab, setActiveTab] = React.useState<TabId>("home")
  const [bentoPeriod, setBentoPeriod] = React.useState<BentoPeriod>(saved?.bentoPeriod ?? "7D")
  const dockMode: DockMode = "soft"
  const setDockMode = React.useCallback((_v: DockMode) => {}, [])
  const [userName, setUserName] = React.useState<string>(saved?.userName ?? "Алексей")
  const [chronotype, setChronotype] = React.useState<"early" | "balanced" | "night">(
    saved?.chronotype ?? "balanced"
  )
  const [bedtimeGoal, setBedtimeGoal] = React.useState<string>(saved?.bedtimeGoal ?? "23:30")
  const [wakeGoal, setWakeGoal] = React.useState<string>(saved?.wakeGoal ?? "07:30")
  const [reminderEnabled, setReminderEnabled] = React.useState<boolean>(saved?.reminderEnabled ?? true)
  const [reminderTime, setReminderTime] = React.useState<string>(saved?.reminderTime ?? "22:30")
  const [reminderDays, setReminderDays] = React.useState<number[]>(
    Array.isArray(saved?.reminderDays) ? saved.reminderDays : [0, 1, 2, 3, 4]
  )
  const [focusGoals, setFocusGoals] = React.useState<string[]>(
    Array.isArray(saved?.focusGoals)
      ? saved.focusGoals
      : ["Стабильный подъём", "Снять вечерний стресс"]
  )
  const [ritualDoneIds, setRitualDoneIds] = React.useState<string[]>(
    Array.isArray(saved?.ritualDoneIds) ? saved.ritualDoneIds : ["dim-lights"]
  )
  const [soundVolume, setSoundVolumePct] = React.useState<number>(
    typeof saved?.soundVolume === "number" ? saved.soundVolume : 64
  )
  const [eveningDetox, setEveningDetox] = React.useState<boolean>(saved?.eveningDetox ?? true)
  const [waterMl, setWaterMl] = React.useState<number>(saved?.waterMl ?? 1500)
  const [breathMinutes, setBreathMinutes] = React.useState<number>(saved?.breathMinutes ?? 6)
  const [sleepHistory, setSleepHistory] = React.useState<SleepNight[]>(
    saved?.sleepHistory ?? DEFAULT_SLEEP_HISTORY
  )
  const [streakDays, setStreakDays] = React.useState<number>(
    saved?.streakDays ?? DEFAULT_SLEEP_HISTORY.length
  )
  const [sleepModeActive, setSleepModeActive] = React.useState<boolean>(false)
  const [moodHistory, setMoodHistory] = React.useState<MoodEntry[]>(
    saved?.moodHistory ?? DEFAULT_MOODS
  )
  const [spectrum, setSpectrum] = React.useState<SpectrumAxis[]>(
    saved?.spectrum ?? DEFAULT_SPECTRUM
  )
  const [widgets, setWidgets] = React.useState<BentoWidgetItem[]>(() => {
    const rawList: BentoWidgetItem[] | undefined = saved?.widgets
    if (!Array.isArray(rawList) || rawList.length === 0) return DEFAULT_WIDGETS
    const defaultsById = new Map(DEFAULT_WIDGETS.map((d) => [d.id, d]))
    return rawList.map((w) => {
      const def = defaultsById.get(w.id)
      return def ? { ...w, title: def.title, subtitle: def.subtitle } : w
    })
  })

  const [editWidgetsMode, setEditWidgetsMode] = React.useState(false)
  const [moodDrawerOpen, setMoodDrawerOpen] = React.useState(false)
  const [widgetGalleryOpen, setWidgetGalleryOpen] = React.useState(false)
  const [weeklyRecapOpen, setWeeklyRecapOpen] = React.useState(false)
  const [weeklyGoal, setWeeklyGoalState] = React.useState<WeeklyGoalItem | null>(
    saved?.weeklyGoal ?? null
  )
  const [sleepLogOpen, setSleepLogOpen] = React.useState(false)
  const [profileOpen, setProfileOpen] = React.useState(false)

  const anyOverlayOpen =
    moodDrawerOpen ||
    widgetGalleryOpen ||
    weeklyRecapOpen ||
    sleepLogOpen ||
    profileOpen

  const [stressTimer, setStressTimer] = React.useState<StressTimerState>({
    running: false,
    remainingSec: 240,
    totalSec: 240,
    intensity: 5,
    technique: "stress",
    sound: "off",
  })

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          onboarded,
          bentoPeriod,
          dockMode,
          userName,
          chronotype,
          bedtimeGoal,
          wakeGoal,
          reminderEnabled,
          reminderTime,
          reminderDays,
          focusGoals,
          ritualDoneIds,
          soundVolume,
          eveningDetox,
          waterMl,
          breathMinutes,
          streakDays,
          sleepHistory,
          moodHistory,
          spectrum,
          widgets,
          weeklyGoal,
        })
      )
    } catch {
      // ignore quota errors
    }
  }, [
    onboarded,
    bentoPeriod,
    dockMode,
    userName,
    chronotype,
    bedtimeGoal,
    wakeGoal,
    reminderEnabled,
    reminderTime,
    reminderDays,
    focusGoals,
    ritualDoneIds,
    soundVolume,
    eveningDetox,
    waterMl,
    breathMinutes,
    streakDays,
    sleepHistory,
    moodHistory,
    spectrum,
    widgets,
    weeklyGoal,
  ])

  React.useEffect(() => {
    if (!stressTimer.running) return
    const id = window.setInterval(() => {
      setStressTimer((prev) => {
        if (!prev.running) return prev
        if (prev.remainingSec <= 1) {
          return { ...prev, running: false, remainingSec: 0 }
        }
        return { ...prev, remainingSec: prev.remainingSec - 1 }
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [stressTimer.running])

  // Pure completion side-effect separated from state updater (StrictMode-safe)
  React.useEffect(() => {
    if (stressTimer.remainingSec !== 0) return
    setBreathMinutes((m) => +(m + stressTimer.totalSec / 60).toFixed(1))
    setStressTimer((prev) =>
      prev.remainingSec === 0
        ? { ...prev, running: false, remainingSec: prev.totalSec }
        : prev
    )
  }, [stressTimer.remainingSec, stressTimer.totalSec])

  React.useEffect(() => {
    const volScale = Math.max(0, Math.min(1, soundVolume / 100))
    if (stressTimer.running && stressTimer.sound !== "off") {
      setSoundVolume(volScale * (0.28 + stressTimer.intensity * 0.045))
      startSound(stressTimer.sound)
    } else if (sleepModeActive) {
      const mode = stressTimer.sound !== "off" ? stressTimer.sound : "pink"
      setSoundVolume(volScale * 0.42)
      startSound(mode)
    } else {
      stopSound()
    }
    return () => {
      stopSound()
    }
  }, [stressTimer.running, stressTimer.sound, stressTimer.intensity, sleepModeActive, soundVolume])

  const setSleepSchedule = React.useCallback((bed: string, wake: string) => {
    setBedtimeGoal(bed)
    setWakeGoal(wake)
  }, [])

  const addWater = React.useCallback((ml: number) => {
    setWaterMl((prev) => Math.max(0, Math.min(4000, prev + ml)))
  }, [])

  const addBreathMinutes = React.useCallback((min: number) => {
    setBreathMinutes((prev) => +(prev + min).toFixed(1))
  }, [])

  const addSleepNight = React.useCallback((night: Omit<SleepNight, "id">) => {
    const newNight: SleepNight = {
      ...night,
      dateKey: night.dateKey ?? toLocalDateKey(new Date()),
      id: `s-${Date.now()}`,
    }
    setSleepHistory((prev) => [...prev.slice(-89), newNight])
    setStreakDays((d) => d + 1)
  }, [])

  const addMoodEntry = React.useCallback(
    (entry: Omit<MoodEntry, "id" | "timestamp">) => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, "0")
      const mm = String(now.getMinutes()).padStart(2, "0")
      const newItem: MoodEntry = {
        ...entry,
        dateKey: entry.dateKey ?? toLocalDateKey(now),
        id: `m-${Date.now()}`,
        timestamp: `Сегодня · ${hh}:${mm}`,
      }
      setMoodHistory((prev) => [...prev, newItem])
    },
    []
  )

  const updateSpectrumAxis = React.useCallback(
    (id: string, val: number, asBaseline = false) => {
      const clamped = Math.max(0.05, Math.min(0.95, val))
      setSpectrum((prev) =>
        prev.map((a) =>
          a.id === id
            ? asBaseline
              ? { ...a, baseline: Math.max(0.08, clamped - 0.16), current: clamped }
              : { ...a, current: clamped }
            : a
        )
      )
    },
    []
  )

  const toggleWidgetSize = React.useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, size: w.size === "1x1" ? "2x1" : "1x1" } : w
      )
    )
  }, [])

  const removeWidget = React.useCallback((id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, visible: false } : w)))
  }, [])

  const restoreWidget = React.useCallback((id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, visible: true } : w)))
  }, [])

  const addCustomWidget = React.useCallback(
    (cfg: {
      title: string
      unit: string
      target: number
      step?: number
      size: WidgetSize
      theme: GlowTheme
    }) => {
      const step = cfg.step ?? (cfg.target >= 500 ? 100 : cfg.target >= 20 ? 5 : 1)
      const item: BentoWidgetItem = {
        id: `w-custom-${Date.now()}`,
        kind: "custom",
        title: cfg.title.trim() || "Новая привычка",
        subtitle: `Цель ${cfg.target} ${cfg.unit}`,
        size: cfg.size,
        theme: cfg.theme,
        visible: true,
        customUnit: cfg.unit,
        customValue: 0,
        customTarget: cfg.target,
        customStep: step,
      }
      setWidgets((prev) => [item, ...prev])
    },
    []
  )

  const incrementCustomWidget = React.useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w
        const step = w.customStep ?? 1
        const nextVal = (w.customValue ?? 0) + step
        return { ...w, customValue: nextVal }
      })
    )
  }, [])

  const resetWidgets = React.useCallback(() => {
    setWidgets(DEFAULT_WIDGETS)
  }, [])

  const setWeeklyGoal = React.useCallback(
    (goal: { id: string; text: string } | null) => {
      setWeeklyGoalState(
        goal ? { id: goal.id, text: goal.text, setAt: toLocalDateKey(new Date()) } : null
      )
    },
    []
  )

  const resetDemoData = React.useCallback(() => {
    setSleepHistory(DEFAULT_SLEEP_HISTORY)
    setMoodHistory(DEFAULT_MOODS)
    setSpectrum(DEFAULT_SPECTRUM)
    setWidgets(DEFAULT_WIDGETS)
    setWaterMl(1500)
    setBreathMinutes(6)
    setStreakDays(DEFAULT_SLEEP_HISTORY.length)
    setEveningDetox(true)
    setReminderEnabled(true)
    setReminderTime("22:30")
    setReminderDays([0, 1, 2, 3, 4])
    setFocusGoals(["Стабильный подъём", "Снять вечерний стресс"])
    setRitualDoneIds(["dim-lights"])
    setSoundVolumePct(64)
    setChronotype("balanced")
    setBedtimeGoal("23:30")
    setWakeGoal("07:30")
    setWeeklyGoalState(null)
  }, [])

  const value = React.useMemo<SomnaStore>(
    () => ({
      onboarded,
      setOnboarded,
      activeTab,
      setActiveTab,
      bentoPeriod,
      setBentoPeriod,
      dockMode,
      setDockMode,
      anyOverlayOpen,
      userName,
      setUserName,
      chronotype,
      setChronotype,
      bedtimeGoal,
      wakeGoal,
      setSleepSchedule,
      reminderEnabled,
      setReminderEnabled,
      reminderTime,
      setReminderTime,
      reminderDays,
      setReminderDays,
      focusGoals,
      setFocusGoals,
      ritualDoneIds,
      setRitualDoneIds,
      soundVolume,
      setSoundVolumePct,
      eveningDetox,
      setEveningDetox,
      waterMl,
      addWater,
      breathMinutes,
      addBreathMinutes,
      streakDays,
      sleepHistory,
      addSleepNight,
      sleepModeActive,
      setSleepModeActive,
      moodHistory,
      addMoodEntry,
      spectrum,
      updateSpectrumAxis,
      widgets,
      setWidgets,
      toggleWidgetSize,
      removeWidget,
      restoreWidget,
      addCustomWidget,
      incrementCustomWidget,
      resetWidgets,
      resetDemoData,
      editWidgetsMode,
      setEditWidgetsMode,
      moodDrawerOpen,
      setMoodDrawerOpen,
      widgetGalleryOpen,
      setWidgetGalleryOpen,
      weeklyRecapOpen,
      setWeeklyRecapOpen,
      weeklyGoal,
      setWeeklyGoal,
      sleepLogOpen,
      setSleepLogOpen,
      profileOpen,
      setProfileOpen,
    }),
    [
      onboarded,
      activeTab,
      bentoPeriod,
      dockMode,
      setDockMode,
      anyOverlayOpen,
      userName,
      chronotype,
      bedtimeGoal,
      wakeGoal,
      setSleepSchedule,
      reminderEnabled,
      reminderTime,
      reminderDays,
      focusGoals,
      ritualDoneIds,
      soundVolume,
      eveningDetox,
      waterMl,
      addWater,
      breathMinutes,
      addBreathMinutes,
      streakDays,
      sleepHistory,
      addSleepNight,
      sleepModeActive,
      moodHistory,
      addMoodEntry,
      spectrum,
      updateSpectrumAxis,
      widgets,
      toggleWidgetSize,
      removeWidget,
      restoreWidget,
      addCustomWidget,
      incrementCustomWidget,
      resetWidgets,
      resetDemoData,
      editWidgetsMode,
      moodDrawerOpen,
      widgetGalleryOpen,
      weeklyRecapOpen,
      weeklyGoal,
      setWeeklyGoal,
      sleepLogOpen,
      profileOpen,
    ]
  )

  const timerValue = React.useMemo<SomnaTimerStore>(
    () => ({
      stressTimer,
      setStressTimer,
    }),
    [stressTimer]
  )

  return (
    <SomnaContext.Provider value={value}>
      <SomnaTimerContext.Provider value={timerValue}>
        {children}
      </SomnaTimerContext.Provider>
    </SomnaContext.Provider>
  )
}

export function useSomna(): SomnaStore {
  const ctx = React.useContext(SomnaContext)
  if (!ctx) {
    throw new Error("useSomna must be used within SomnaProvider")
  }
  return ctx
}

export function useStressTimer(): SomnaTimerStore {
  const ctx = React.useContext(SomnaTimerContext)
  if (!ctx) {
    throw new Error("useStressTimer must be used within SomnaProvider")
  }
  return ctx
}
