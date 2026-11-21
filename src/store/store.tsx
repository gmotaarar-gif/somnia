import * as React from "react"
import { setSoundVolume, startSound, stopSound, type SoundMode } from "@/lib/audio"
import { dateKey, daysAgo, spanMinutes } from "@/lib/time"

export type TabId = "today" | "sleep" | "mind" | "practices"
export type Tone =
  | "plum"
  | "lime"
  | "ember"
  | "forest"
  | "moss"
  | "rose"
  | "dusk"
  | "cobalt"
  | "coral"
  | "ink"
  | "violet"
export type Chronotype = "early" | "balanced" | "night"
export type WidgetSize = "1x1" | "2x1"
export type WidgetKind =
  | "streak"
  | "sleep"
  | "water"
  | "mood"
  | "evening"
  | "breath"
  | "week"
  | "energy"
  | "rhythm"
  | "debt"
  | "custom"
export type SheetId = "mood" | "sleep" | "profile" | "gallery" | "recap" | null
export type Technique = "calm" | "478" | "box"

export interface SleepNight {
  id: string
  /** Morning the night ended on, YYYY-MM-DD */
  dateKey: string
  bedtime: string
  wakeTime: string
  durationMin: number
  /** Self-rated morning energy, 0..100 */
  quality: number
  awakenings: number
  tags: string[]
  note?: string
}

export interface MoodEntry {
  id: string
  at: string
  /** -1 (very unpleasant) .. +1 (very pleasant) */
  valence: number
  emotions: string[]
  factors: string[]
  note?: string
}

export interface Widget {
  id: string
  kind: WidgetKind
  size: WidgetSize
  tone: Tone
  visible: boolean
  title?: string
  unit?: string
  target?: number
  step?: number
  value?: number
  /** Day the custom counter belongs to; it resets on a new day */
  day?: string
}

export interface SpectrumAxis {
  id: string
  left: string
  right: string
  value: number
}

export interface BreathState {
  running: boolean
  remainingSec: number
  totalSec: number
  technique: Technique
  sound: SoundMode
}

const uid = () => Math.random().toString(36).slice(2, 10)

const DEMO_NIGHTS: [string, string, number, number, string[], string?][] = [
  ["00:25", "07:15", 66, 2, ["Поздний экран"], "Поздний рабочий созвон"],
  ["23:55", "07:20", 76, 1, []],
  ["00:40", "07:10", 62, 2, ["Кофеин", "Стресс"]],
  ["23:40", "07:25", 81, 0, ["Быстро уснул"]],
  ["23:20", "07:35", 87, 0, ["Глубокий сон"], "Вечерняя прогулка перед сном"],
  ["00:10", "08:30", 88, 1, ["Проснулся сам"]],
  ["23:45", "07:40", 83, 0, []],
  ["00:05", "07:20", 74, 1, ["Поздний экран"]],
  ["23:45", "07:25", 82, 0, ["Прохладно"]],
  ["00:50", "07:05", 58, 2, ["Стресс", "Кофеин"]],
  ["23:35", "07:30", 84, 0, ["Быстро уснул"]],
  ["23:25", "07:30", 89, 0, ["Глубокий сон"]],
  ["23:50", "08:10", 86, 1, ["Яркие сны"]],
  ["23:38", "07:20", 85, 0, ["Проснулся сам"], "Лёгкое засыпание после дыхания"],
]

function demoNights(): SleepNight[] {
  return DEMO_NIGHTS.map(([bedtime, wakeTime, quality, awakenings, tags, note], i) => ({
    id: `demo-n-${i}`,
    dateKey: dateKey(daysAgo(DEMO_NIGHTS.length - 1 - i)),
    bedtime,
    wakeTime,
    durationMin: spanMinutes(bedtime, wakeTime) - awakenings * 8,
    quality,
    awakenings,
    tags,
    note,
  }))
}

const DEMO_MOODS: [number, string, number, string[], string[]][] = [
  [11, "22:30", -0.22, ["Усталость", "Напряжение"], ["Работа", "Кофеин"]],
  [9, "20:15", 0.44, ["Спокойствие", "Лёгкость"], ["Прогулка", "Отдых"]],
  [7, "18:40", 0.52, ["Умиротворение"], ["Отдых", "Семья"]],
  [6, "21:20", 0.08, ["Рассеянность", "Спокойствие"], ["Работа"]],
  [5, "21:50", 0.36, ["Спокойствие"], ["Сон", "Отдых"]],
  [4, "22:10", -0.34, ["Усталость", "Тревога"], ["Работа", "Кофеин"]],
  [3, "09:30", 0.56, ["Ясность", "Уверенность"], ["Сон", "Прогулка"]],
  [2, "21:40", 0.64, ["Умиротворение", "Лёгкость", "Благодарность"], ["Отдых", "Спорт"]],
  [1, "10:15", 0.72, ["Ясность", "Вдохновение"], ["Сон", "Прогулка"]],
  [0, "08:40", 0.42, ["Спокойствие", "Лёгкость"], ["Сон", "Отдых"]],
]

function demoMoods(): MoodEntry[] {
  return DEMO_MOODS.map(([ago, time, valence, emotions, factors], i) => {
    const d = daysAgo(ago)
    const [h, m] = time.split(":").map(Number)
    d.setHours(h, m, 0, 0)
    return { id: `demo-m-${i}`, at: d.toISOString(), valence, emotions, factors }
  })
}

const DEFAULT_SPECTRUM: SpectrumAxis[] = [
  { id: "calm", left: "Тревога", right: "Спокойствие", value: 0.74 },
  { id: "energy", left: "Усталость", right: "Бодрость", value: 0.82 },
  { id: "focus", left: "Рассеянность", right: "Ясность", value: 0.65 },
  { id: "balance", left: "Перегруз", right: "Баланс", value: 0.78 },
]

export const DEFAULT_WIDGETS: Widget[] = [
  { id: "w-streak", kind: "streak", size: "1x1", tone: "ink", visible: true },
  { id: "w-sleep", kind: "sleep", size: "1x1", tone: "plum", visible: true },
  { id: "w-evening", kind: "evening", size: "2x1", tone: "cobalt", visible: true },
  { id: "w-water", kind: "water", size: "1x1", tone: "lime", visible: true },
  { id: "w-breath", kind: "breath", size: "1x1", tone: "coral", visible: true },
  { id: "w-week", kind: "week", size: "2x1", tone: "forest", visible: true },
  { id: "w-mood", kind: "mood", size: "1x1", tone: "moss", visible: true },
  { id: "w-energy", kind: "energy", size: "1x1", tone: "ember", visible: true },
  { id: "w-rhythm", kind: "rhythm", size: "2x1", tone: "dusk", visible: true },
  { id: "w-debt", kind: "debt", size: "1x1", tone: "rose", visible: false },
]

interface Persisted {
  onboarded: boolean
  userName: string
  chronotype: Chronotype
  bedGoal: string
  wakeGoal: string
  reminder: boolean
  reminderTime: string
  focus: string[]
  ritual: { day: string; done: string[] }
  water: { day: string; ml: number }
  breath: { day: string; min: number }
  eveningMode: boolean
  volume: number
  nights: SleepNight[]
  moods: MoodEntry[]
  spectrum: SpectrumAxis[]
  widgets: Widget[]
  weeklyGoal: { id: string; text: string } | null
}

const today = () => dateKey(new Date())

function defaults(): Persisted {
  return {
    onboarded: false,
    userName: "",
    chronotype: "balanced",
    bedGoal: "23:30",
    wakeGoal: "07:30",
    reminder: true,
    reminderTime: "22:30",
    focus: ["Стабильный подъём", "Снять вечерний стресс"],
    ritual: { day: today(), done: ["dim"] },
    water: { day: today(), ml: 1250 },
    breath: { day: today(), min: 6 },
    eveningMode: true,
    volume: 60,
    nights: demoNights(),
    moods: demoMoods(),
    spectrum: DEFAULT_SPECTRUM,
    widgets: DEFAULT_WIDGETS,
    weeklyGoal: null,
  }
}

const STORAGE_KEY = "somna-state-v6"

function load(): Persisted {
  const base = defaults()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = { ...base, ...(JSON.parse(raw) as Partial<Persisted>) }
    const day = today()
    if (saved.water.day !== day) saved.water = { day, ml: 0 }
    if (saved.breath.day !== day) saved.breath = { day, min: 0 }
    if (saved.ritual.day !== day) saved.ritual = { day, done: [] }
    saved.widgets = saved.widgets.map((w) =>
      w.kind === "custom" && w.day !== day ? { ...w, value: 0, day } : w
    )
    return saved
  } catch {
    return base
  }
}

export interface Store extends Persisted {
  tab: TabId
  setTab: (t: TabId) => void
  sheet: SheetId
  openSheet: (s: SheetId) => void
  editing: boolean
  setEditing: (v: boolean) => void
  nightMode: boolean
  /** HH:MM the current night session started at; prefills the sleep log */
  nightStart: string | null
  startNight: () => void
  clearNightStart: () => void
  endNight: (log: boolean) => void
  nightSound: SoundMode
  setNightSound: (s: SoundMode) => void
  patch: (p: Partial<Persisted>) => void
  finishOnboarding: (p: Partial<Persisted>) => void
  addNight: (n: Omit<SleepNight, "id">) => void
  removeNight: (id: string) => void
  addMood: (m: Omit<MoodEntry, "id" | "at">) => void
  addWater: (ml: number) => void
  toggleRitual: (id: string) => void
  setSpectrum: (id: string, value: number) => void
  setWidgets: React.Dispatch<React.SetStateAction<Widget[]>>
  updateWidget: (id: string, p: Partial<Widget>) => void
  addCustomWidget: (w: Pick<Widget, "title" | "unit" | "target" | "step" | "tone" | "size">) => void
  deleteWidget: (id: string) => void
  bumpWidget: (id: string) => void
  resetWidgets: () => void
  resetAll: () => void
}

const StoreContext = React.createContext<Store | null>(null)
const BreathContext = React.createContext<{
  breath: BreathState
  setBreath: React.Dispatch<React.SetStateAction<BreathState>>
} | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<Persisted>(load)
  const [tab, setTab] = React.useState<TabId>("today")
  const [sheet, openSheet] = React.useState<SheetId>(null)
  const [editing, setEditing] = React.useState(false)
  const [nightMode, setNightMode] = React.useState(false)
  const [nightStart, setNightStart] = React.useState<string | null>(null)
  const [nightSound, setNightSound] = React.useState<SoundMode>("pink")
  const [breathState, setBreath] = React.useState<BreathState>({
    running: false,
    remainingSec: 240,
    totalSec: 240,
    technique: "calm",
    sound: "off",
  })

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // storage can be full or disabled; the session keeps working in memory
    }
  }, [data])

  React.useEffect(() => {
    if (!breathState.running) return
    const id = window.setInterval(() => {
      setBreath((b) => (b.running ? { ...b, remainingSec: Math.max(0, b.remainingSec - 1) } : b))
    }, 1000)
    return () => window.clearInterval(id)
  }, [breathState.running])

  React.useEffect(() => {
    if (!breathState.running || breathState.remainingSec > 0) return
    setData((d) => ({
      ...d,
      breath: { day: today(), min: +(d.breath.min + breathState.totalSec / 60).toFixed(1) },
    }))
    setBreath((b) => ({ ...b, running: false, remainingSec: b.totalSec }))
  }, [breathState.running, breathState.remainingSec, breathState.totalSec])

  React.useEffect(() => {
    const vol = Math.max(0, Math.min(1, data.volume / 100))
    if (breathState.running && breathState.sound !== "off") {
      setSoundVolume(vol * 0.5)
      startSound(breathState.sound)
    } else if (nightMode && nightSound !== "off") {
      setSoundVolume(vol * 0.45)
      startSound(nightSound)
    } else {
      stopSound()
    }
  }, [breathState.running, breathState.sound, nightMode, nightSound, data.volume])

  React.useEffect(() => () => stopSound(), [])

  const actions = React.useMemo(() => {
    const patch = (p: Partial<Persisted>) => setData((d) => ({ ...d, ...p }))
    const setWidgets: React.Dispatch<React.SetStateAction<Widget[]>> = (next) =>
      setData((d) => ({ ...d, widgets: typeof next === "function" ? next(d.widgets) : next }))
    return {
      patch,
      setWidgets,
      finishOnboarding: (p: Partial<Persisted>) => setData((d) => ({ ...d, ...p, onboarded: true })),
      addNight: (n: Omit<SleepNight, "id">) =>
        setData((d) => ({
          ...d,
          nights: [...d.nights.filter((x) => x.dateKey !== n.dateKey), { ...n, id: uid() }]
            .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
            .slice(-90),
        })),
      removeNight: (id: string) => setData((d) => ({ ...d, nights: d.nights.filter((n) => n.id !== id) })),
      addMood: (m: Omit<MoodEntry, "id" | "at">) =>
        setData((d) => ({
          ...d,
          moods: [...d.moods, { ...m, id: uid(), at: new Date().toISOString() }].slice(-200),
        })),
      addWater: (ml: number) =>
        setData((d) => ({ ...d, water: { day: today(), ml: Math.max(0, Math.min(4000, d.water.ml + ml)) } })),
      toggleRitual: (id: string) =>
        setData((d) => ({
          ...d,
          ritual: {
            day: today(),
            done: d.ritual.done.includes(id) ? d.ritual.done.filter((x) => x !== id) : [...d.ritual.done, id],
          },
        })),
      setSpectrum: (id: string, value: number) =>
        setData((d) => ({
          ...d,
          spectrum: d.spectrum.map((a) => (a.id === id ? { ...a, value: Math.max(0, Math.min(1, value)) } : a)),
        })),
      updateWidget: (id: string, p: Partial<Widget>) =>
        setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, ...p } : w))),
      addCustomWidget: (w: Pick<Widget, "title" | "unit" | "target" | "step" | "tone" | "size">) =>
        setWidgets((ws) => [
          { ...w, id: `w-${uid()}`, kind: "custom", visible: true, value: 0, day: today() },
          ...ws,
        ]),
      deleteWidget: (id: string) => setWidgets((ws) => ws.filter((w) => w.id !== id)),
      bumpWidget: (id: string) =>
        setWidgets((ws) =>
          ws.map((w) => (w.id === id ? { ...w, value: (w.value ?? 0) + (w.step ?? 1), day: today() } : w))
        ),
      resetWidgets: () => setWidgets(DEFAULT_WIDGETS),
      resetAll: () => setData((d) => ({ ...defaults(), onboarded: d.onboarded, userName: d.userName })),
    }
  }, [])

  const value = React.useMemo<Store>(
    () => ({
      ...data,
      ...actions,
      tab,
      setTab,
      sheet,
      openSheet,
      editing,
      setEditing,
      nightMode,
      nightStart,
      startNight: () => {
        const d = new Date()
        setNightStart(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)
        setNightMode(true)
      },
      endNight: (log: boolean) => {
        setNightMode(false)
        if (log) openSheet("sleep")
        else setNightStart(null)
      },
      clearNightStart: () => setNightStart(null),
      nightSound,
      setNightSound,
    }),
    [data, actions, tab, sheet, editing, nightMode, nightStart, nightSound]
  )
  const breathValue = React.useMemo(() => ({ breath: breathState, setBreath }), [breathState])

  return (
    <StoreContext.Provider value={value}>
      <BreathContext.Provider value={breathValue}>{children}</BreathContext.Provider>
    </StoreContext.Provider>
  )
}

export function useStore(): Store {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}

export function useBreath() {
  const ctx = React.useContext(BreathContext)
  if (!ctx) throw new Error("useBreath must be used inside StoreProvider")
  return ctx
}
