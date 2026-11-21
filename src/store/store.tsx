import * as React from "react"
import { normalizeEmail, normalizeLocalAccount, validateRegistration, type LocalAccount, type RegistrationInput } from "@/account/registration"
import { setSoundVolume, startSound, stopSound, type SoundMode } from "@/lib/audio"
import type { ThemeMode } from "@/lib/theme"
import { listenForReminders, requestReminderPermission, syncReminders } from "@/lib/notifications"
import { dateKey } from "@/lib/time"
import { readSaved } from "@/store/saved"

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
  | "week"
  | "energy"
  | "rhythm"
  | "debt"
  | "cycle"
  | "wellbeing"
  | "plan"
  | "custom"
export type SheetId =
  | "mood"
  | "sleep"
  | "profile"
  | "subscription"
  | "gallery"
  | "recap"
  | "night"
  | "cycles"
  | "wellbeing"
  | "grounding"
  | "bodyscan"
  | "worry"
  | "awards"
  | "article"
  | null
export type PracticeKind = "grounding" | "bodyscan" | "worry"

export interface PracticeSession {
  id: string
  at: string
  kind: PracticeKind
  min: number
}

export interface Worry {
  id: string
  at: string
  text: string
  /** What the user decided to do about it */
  plan: string
  done: boolean
}

export interface WellbeingResult {
  at: string
  /** WHO-5 index, 0..100 */
  score: number
}

export interface Toast {
  id: number
  text: string
}

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

const uid = () => Math.random().toString(36).slice(2, 10)

export const DEFAULT_WIDGETS: Widget[] = [
  { id: "w-streak", kind: "streak", size: "1x1", tone: "ink", visible: true },
  { id: "w-sleep", kind: "sleep", size: "1x1", tone: "plum", visible: false },
  { id: "w-evening", kind: "evening", size: "2x1", tone: "cobalt", visible: true },
  { id: "w-water", kind: "water", size: "1x1", tone: "lime", visible: true },
  { id: "w-week", kind: "week", size: "2x1", tone: "forest", visible: false },
  { id: "w-mood", kind: "mood", size: "1x1", tone: "moss", visible: false },
  { id: "w-energy", kind: "energy", size: "1x1", tone: "ember", visible: false },
  { id: "w-rhythm", kind: "rhythm", size: "2x1", tone: "dusk", visible: false },
  { id: "w-debt", kind: "debt", size: "1x1", tone: "rose", visible: false },
  { id: "w-plan", kind: "plan", size: "2x1", tone: "ink", visible: false },
  { id: "w-cycle", kind: "cycle", size: "1x1", tone: "cobalt", visible: false },
  { id: "w-wellbeing", kind: "wellbeing", size: "1x1", tone: "moss", visible: false },
]

const HOME_LAYOUT = 2
/** Built-in widgets whose numbers the home screen already shows. */
const REDUNDANT_WIDGETS = new Set<WidgetKind>(["sleep", "mood", "week", "energy", "plan"])

export interface Persisted {
  onboarded: boolean
  userName: string
  localAccount: LocalAccount | null
  chronotype: Chronotype
  /** "system" follows the device setting */
  theme: ThemeMode
  bedGoal: string
  wakeGoal: string
  reminder: boolean
  reminderTime: string
  morningReminder: boolean
  morningReminderTime: string
  focus: string[]
  ritual: { day: string; done: string[] }
  water: { day: string; ml: number }
  eveningMode: boolean
  volume: number
  nights: SleepNight[]
  moods: MoodEntry[]
  spectrum: SpectrumAxis[]
  widgets: Widget[]
  weeklyGoal: { id: string; text: string } | null
  sessions: PracticeSession[]
  worries: Worry[]
  /** Ids of articles the reader has finished */
  readArticles: string[]
  wellbeing: WellbeingResult[]
  /** Minutes after which night sounds fade out; 0 keeps them on */
  soundTimer: number
  /** Home layout generation; older installs get the calmer set once */
  layout: number
}

const today = () => dateKey(new Date())

function defaults(): Persisted {
  return {
    onboarded: false,
    userName: "",
    localAccount: null,
    chronotype: "balanced",
    theme: "system",
    bedGoal: "23:30",
    wakeGoal: "07:30",
    reminder: true,
    reminderTime: "22:30",
    morningReminder: false,
    morningReminderTime: "07:30",
    focus: ["Стабильный подъём", "Снять вечерний стресс"],
    ritual: { day: today(), done: [] },
    water: { day: today(), ml: 0 },
    eveningMode: true,
    volume: 60,
    nights: [],
    moods: [],
    spectrum: [],
    widgets: DEFAULT_WIDGETS,
    weeklyGoal: null,
    sessions: [],
    worries: [],
    readArticles: [],
    wellbeing: [],
    soundTimer: 30,
    layout: HOME_LAYOUT,
  }
}

const STORAGE_KEY = "somna-state-v6"
/** The original text of a save that had to be repaired, kept until the next repair. */
export const BACKUP_KEY = "somna-state-v6-backup"

/** One night per morning (the latest save wins), in calendar order, capped at 90. */
function normalizeNights(nights: SleepNight[]): SleepNight[] {
  const byKey = new Map<string, SleepNight>()
  for (const n of nights) if (n?.dateKey) byKey.set(n.dateKey, n)
  return [...byKey.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).slice(-90)
}

/** Day-scoped counters start from zero on a new calendar day. */
function rollDay(d: Persisted, day: string): Persisted {
  const stale =
    d.water.day !== day ||
    d.ritual.day !== day ||
    d.widgets.some((w) => w.kind === "custom" && w.day !== day)
  if (!stale) return d
  return {
    ...d,
    water: d.water.day === day ? d.water : { day, ml: 0 },
    ritual: d.ritual.day === day ? d.ritual : { day, done: [] },
    widgets: d.widgets.map((w) => (w.kind === "custom" && w.day !== day ? { ...w, value: 0, day } : w)),
  }
}

/** "partial": malformed records were skipped; "unreadable": nothing could be read. */
export type SavedDataDamage = "partial" | "unreadable"

interface Loaded {
  data: Persisted
  damage: SavedDataDamage | null
}

function load(): Loaded {
  const base = defaults()
  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return { data: base, damage: null }
  }
  if (!raw) return { data: base, damage: null }
  const { saved: parsed, unreadable, dropped } = readSaved(raw)
  const damage: SavedDataDamage | null = unreadable ? "unreadable" : dropped ? "partial" : null
  // Autosave replaces the damaged text, so the original stays available for export.
  if (damage) backupSavedData(raw)
  try {
    return { data: migrate(base, parsed), damage }
  } catch {
    backupSavedData(raw)
    return { data: base, damage: "unreadable" }
  }
}

function migrate(base: Persisted, parsed: Partial<Persisted>): Persisted {
  const saved = rollDay({ ...base, ...parsed }, today())
  saved.morningReminderTime = parsed.morningReminderTime ?? saved.wakeGoal ?? "08:00"
  saved.localAccount = normalizeLocalAccount(saved.localAccount)
  saved.nights = normalizeNights(saved.nights.filter((n) => !/^demo-n-\d+$/.test(n.id)))
  saved.moods = saved.moods.filter((m) => !/^demo-m-\d+$/.test(m.id))
  saved.sessions = saved.sessions.filter((s) => !/^demo-s-\d+$/.test(s.id))
  // Breathing practices were removed: drop their counter, widget and ritual step.
  // Finished sessions stay, so earned practice minutes and awards are not lost.
  delete (saved as { breath?: unknown }).breath
  saved.widgets = saved.widgets.filter((w) => (w.kind as string) !== "breath")
  saved.ritual = { ...saved.ritual, done: saved.ritual.done.filter((id) => id !== "breath") }
  if (parsed.layout !== HOME_LAYOUT) {
    if (parsed.widgets) saved.widgets = saved.widgets.map((w) => (REDUNDANT_WIDGETS.has(w.kind) ? { ...w, visible: false } : w))
    saved.layout = HOME_LAYOUT
  }
  // widgets added in later versions appear in the gallery of existing installs
  const missing = DEFAULT_WIDGETS.filter((w) => !saved.widgets.some((x) => x.id === w.id))
  if (missing.length) saved.widgets = [...saved.widgets, ...missing.map((w) => ({ ...w, visible: false }))]
  return saved
}

function backupSavedData(raw: string) {
  try {
    window.localStorage.setItem(BACKUP_KEY, raw)
  } catch {
    // storage is full or disabled; the damaged original stays in STORAGE_KEY until the next save
  }
}

/** The saved text a user can download: the backed-up original if one was kept, else the current save. */
export function readSavedDataCopy(): string | null {
  try {
    return window.localStorage.getItem(BACKUP_KEY) ?? window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Last resort when saved data keeps the app from rendering: keep a backup and start fresh. */
export function resetSavedData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) backupSavedData(raw)
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing more can be done without storage
  }
}

export interface Store extends Persisted {
  /** Set when the last load had to skip or discard damaged saved data. */
  savedDataDamage: SavedDataDamage | null
  dismissSavedDataDamage: () => void
  registerLocalProfile: (input: RegistrationInput) => void
  tab: TabId
  setTab: (t: TabId) => void
  sheet: SheetId
  /** Id of the record the open sheet is about (e.g. a night) */
  sheetArg: string | null
  openSheet: (s: SheetId, arg?: string) => void
  toast: Toast | null
  notify: (text: string) => void
  /** +1 when the user moved to a tab on the right, -1 to the left */
  tabDir: number
  addSession: (kind: PracticeKind, min: number) => void
  addWorry: (text: string, plan: string) => void
  toggleWorry: (id: string) => void
  removeWorry: (id: string) => void
  addWellbeing: (score: number) => void
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
  finishOnboarding: (p: Partial<Persisted>) => Promise<boolean>
  addNight: (n: Omit<SleepNight, "id">) => void
  removeNight: (id: string) => void
  addMood: (m: Omit<MoodEntry, "id" | "at">) => void
  addWater: (ml: number) => void
  toggleRitual: (id: string) => void
  markArticleRead: (id: string) => void
  setSpectrum: (id: string, value: number) => void
  setWidgets: React.Dispatch<React.SetStateAction<Widget[]>>
  updateWidget: (id: string, p: Partial<Widget>) => void
  addCustomWidget: (w: Pick<Widget, "title" | "unit" | "target" | "step" | "tone" | "size">) => void
  deleteWidget: (id: string) => void
  bumpWidget: (id: string) => void
  resetWidgets: () => void
  resetAll: () => void
}

const TAB_ORDER: TabId[] = ["today", "sleep", "mind", "practices"]

const StoreContext = React.createContext<Store | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [initial] = React.useState(load)
  const [data, setData] = React.useState<Persisted>(initial.data)
  const [savedDataDamage, setSavedDataDamage] = React.useState(initial.damage)
  const latestData = React.useRef(data)
  latestData.current = data
  const lastSaved = React.useRef<string | null>(null)
  const [tab, setTabRaw] = React.useState<TabId>("today")
  const [tabDir, setTabDir] = React.useState(1)
  const [sheet, setSheet] = React.useState<SheetId>(null)
  const [sheetArg, setSheetArg] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<Toast | null>(null)

  const setTab = React.useCallback((t: TabId) => {
    setTabRaw((prev) => {
      setTabDir(TAB_ORDER.indexOf(t) >= TAB_ORDER.indexOf(prev) ? 1 : -1)
      return t
    })
  }, [])
  const openSheet = React.useCallback((s: SheetId, arg?: string) => {
    setSheet(s)
    if (s) setSheetArg(arg ?? null)
  }, [])
  const notify = React.useCallback((text: string) => setToast({ id: Date.now(), text }), [])

  React.useEffect(() => {
    void syncReminders(data).catch(() => notify("Не удалось обновить напоминания. Попробуйте ещё раз."))
  }, [data.reminder, data.reminderTime, data.morningReminder, data.morningReminderTime, notify])

  React.useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(id)
  }, [toast])
  const [editing, setEditing] = React.useState(false)
  const [nightMode, setNightMode] = React.useState(false)
  const [nightStart, setNightStart] = React.useState<string | null>(null)
  const [nightSound, setNightSound] = React.useState<SoundMode>("pink")
  const endNight = React.useCallback((log: boolean) => {
    setNightMode(false)
    if (log) openSheet("sleep")
    else setNightStart(null)
  }, [openSheet])
  React.useEffect(() => listenForReminders((target) => {
    if (target === "mood" && (nightMode || nightStart)) endNight(true)
    else openSheet(target)
  }), [openSheet, endNight, nightMode, nightStart])

  React.useEffect(() => {
    const serialized = JSON.stringify(data)
    if (serialized === lastSaved.current) return
    try {
      window.localStorage.setItem(STORAGE_KEY, serialized)
      lastSaved.current = serialized
    } catch {
      // storage can be full or disabled; the session keeps working in memory
    }
  }, [data])

  // Keep an already-open tab from autosaving its pre-registration profile later.
  React.useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && (event.key === STORAGE_KEY || event.key === null)) {
        // A failed local autosave may be the only copy of a new check-in.
        if (JSON.stringify(latestData.current) !== lastSaved.current) return
        const { data: incoming, damage } = load()
        // Imported snapshots must not be written back over a newer remote save.
        lastSaved.current = JSON.stringify(incoming)
        setData(incoming)
        if (damage) setSavedDataDamage(damage)
      }
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])

  // A tab left open past midnight moves to the new day: counters reset, "Сегодня" labels re-derive.
  React.useEffect(() => {
    const refresh = () => setData((d) => rollDay(d, today()))
    const id = window.setInterval(refresh, 60_000)
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [])

  React.useEffect(() => {
    const vol = Math.max(0, Math.min(1, data.volume / 100))
    if (nightMode && nightSound !== "off") {
      setSoundVolume(vol * 0.45)
      startSound(nightSound)
    } else {
      stopSound()
    }
  }, [nightMode, nightSound, data.volume])

  React.useEffect(() => {
    if (!nightMode || nightSound === "off" || !data.soundTimer) return
    const id = window.setTimeout(() => setNightSound("off"), data.soundTimer * 60_000)
    return () => window.clearTimeout(id)
  }, [nightMode, nightSound, data.soundTimer])

  React.useEffect(() => () => stopSound(), [])

  const actions = React.useMemo(() => {
    const patch = (p: Partial<Persisted>) => setData((d) => ({ ...d, ...p }))
    const setWidgets: React.Dispatch<React.SetStateAction<Widget[]>> = (next) =>
      setData((d) => ({ ...d, widgets: typeof next === "function" ? next(d.widgets) : next }))
    return {
      patch,
      setWidgets,
      finishOnboarding: async (p: Partial<Persisted>) => {
        const granted = !p.reminder || await requestReminderPermission()
        const next = { ...latestData.current, ...p, ...(p.reminder && { reminder: granted }), onboarded: true }
        React.startTransition(() => setData(next))
        void syncReminders(next).catch(() => notify("Не удалось обновить напоминания. Попробуйте ещё раз."))
        if (!granted) notify("Разрешите уведомления для Somna в настройках телефона")
        return granted
      },
      addNight: (n: Omit<SleepNight, "id">) =>
        setData((d) => ({
          ...d,
          nights: normalizeNights([...d.nights, { ...n, id: uid() }]),
        })),
      addSession: (kind: PracticeKind, min: number) =>
        setData((d) => ({
          ...d,
          sessions: [...d.sessions, { id: uid(), at: new Date().toISOString(), kind, min }].slice(-300),
        })),
      addWorry: (text: string, plan: string) =>
        setData((d) => ({
          ...d,
          worries: [{ id: uid(), at: new Date().toISOString(), text, plan, done: false }, ...d.worries].slice(0, 60),
        })),
      toggleWorry: (id: string) =>
        setData((d) => ({ ...d, worries: d.worries.map((w) => (w.id === id ? { ...w, done: !w.done } : w)) })),
      removeWorry: (id: string) => setData((d) => ({ ...d, worries: d.worries.filter((w) => w.id !== id) })),
      addWellbeing: (score: number) =>
        setData((d) => ({ ...d, wellbeing: [...d.wellbeing, { at: new Date().toISOString(), score }].slice(-52) })),
      removeNight: (id: string) => setData((d) => ({ ...d, nights: d.nights.filter((n) => n.id !== id) })),
      addMood: (m: Omit<MoodEntry, "id" | "at">) =>
        setData((d) => ({
          ...d,
          moods: [...d.moods, { ...m, id: uid(), at: new Date().toISOString() }].slice(-200),
        })),
      addWater: (ml: number) =>
        setData((d) => ({ ...d, water: { day: today(), ml: Math.max(0, Math.min(4000, d.water.ml + ml)) } })),
      markArticleRead: (id: string) =>
        setData((d) => (d.readArticles.includes(id) ? d : { ...d, readArticles: [...d.readArticles, id] })),
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
      resetWidgets: () => setWidgets((widgets) => [
        ...widgets.filter((widget) => widget.kind === "custom"),
        ...DEFAULT_WIDGETS.map((widget) => ({ ...widget })),
      ]),
      resetAll: () => setData((d) => ({ ...defaults(), onboarded: d.onboarded, userName: d.userName, localAccount: d.localAccount })),
    }
  }, [])

  const value = React.useMemo<Store>(
    () => ({
      ...data,
      ...actions,
      savedDataDamage,
      dismissSavedDataDamage: () => setSavedDataDamage(null),
      registerLocalProfile: (input) => {
        if (Object.keys(validateRegistration(input)).length) throw new Error("Invalid local registration")
        const next: Persisted = {
          ...data,
          userName: input.name.trim(),
          localAccount: {
            email: normalizeEmail(input.email),
            createdAt: data.localAccount?.createdAt ?? new Date().toISOString(),
          },
        }
        // One atomic write saves the name, email, and existing journal together.
        // Unlike background autosave, registration must surface storage failures.
        const serialized = JSON.stringify(next)
        window.localStorage.setItem(STORAGE_KEY, serialized)
        lastSaved.current = serialized
        setData(next)
      },
      tab,
      setTab,
      tabDir,
      sheet,
      sheetArg,
      openSheet,
      toast,
      notify,
      editing,
      setEditing,
      nightMode,
      nightStart,
      startNight: () => {
        const d = new Date()
        setNightStart(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)
        setNightMode(true)
      },
      endNight,
      clearNightStart: () => setNightStart(null),
      nightSound,
      setNightSound,
    }),
    [data, actions, savedDataDamage, tab, tabDir, setTab, sheet, sheetArg, openSheet, toast, notify, editing, nightMode, nightStart, nightSound, endNight]
  )

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  )
}

export function useStore(): Store {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}
