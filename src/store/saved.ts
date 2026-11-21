import { normalizeLocalAccount } from "@/account/registration"
import { isThemeMode } from "@/lib/theme"
import type { Persisted } from "@/store/store"

type Check = (v: unknown) => boolean

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === "string"
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const isBool = (v: unknown): v is boolean => typeof v === "boolean"
const isStrs = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr)
const optional = (check: Check): Check => (v) => v === undefined || check(v)
const oneOf = (...values: string[]): Check => (v) => isStr(v) && values.includes(v)
const isTime = (v: unknown) => isStr(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
const isDay = (v: unknown) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isMoment = (v: unknown) => isStr(v) && Number.isFinite(Date.parse(v))
const shape = (fields: Record<string, Check>): Check => (v) =>
  isObj(v) && Object.entries(fields).every(([key, check]) => check(v[key]))

const TONES = ["plum", "lime", "ember", "forest", "moss", "rose", "dusk", "cobalt", "coral", "ink", "violet"]
// "breath" widgets and sessions are from a removed practice; load() migrates them, they are not damage.
const WIDGET_KINDS = ["streak", "sleep", "water", "mood", "evening", "week", "energy", "rhythm", "debt", "cycle", "wellbeing", "plan", "custom", "breath"]

const isNight = shape({
  id: isStr, dateKey: isDay, bedtime: isTime, wakeTime: isTime,
  durationMin: isNum, quality: isNum, awakenings: isNum, tags: isStrs, note: optional(isStr),
})
const isMood = shape({ id: isStr, at: isMoment, valence: isNum, emotions: isStrs, factors: isStrs, note: optional(isStr) })
const isSession = shape({ id: isStr, at: isMoment, kind: oneOf("grounding", "bodyscan", "worry", "breath"), min: isNum })
const isWorry = shape({ id: isStr, at: isMoment, text: isStr, plan: optional(isStr), done: isBool })
const isWellbeing = shape({ at: isMoment, score: isNum })
const isAxis = shape({ id: isStr, left: isStr, right: isStr, value: isNum })
const isWidget = shape({
  id: isStr, kind: oneOf(...WIDGET_KINDS), size: oneOf("1x1", "2x1"), tone: oneOf(...TONES), visible: isBool,
  title: optional(isStr), unit: optional(isStr), target: optional(isNum), step: optional(isNum),
  value: optional(isNum), day: optional(isStr),
})

/** Lists keep their readable entries; one broken record never costs the rest. */
const LISTS: Partial<Record<keyof Persisted, Check>> = {
  nights: isNight,
  moods: isMood,
  sessions: isSession,
  worries: isWorry,
  wellbeing: isWellbeing,
  spectrum: isAxis,
  widgets: isWidget,
  focus: isStr,
  readArticles: isStr,
}

const FIELDS: Partial<Record<keyof Persisted, Check>> = {
  onboarded: isBool,
  userName: isStr,
  localAccount: (v) => v === null || normalizeLocalAccount(v) !== null,
  chronotype: oneOf("early", "balanced", "night"),
  theme: isThemeMode,
  bedGoal: isTime,
  wakeGoal: isTime,
  reminder: isBool,
  reminderTime: isTime,
  morningReminder: isBool,
  morningReminderTime: isTime,
  ritual: shape({ day: isStr, done: isStrs }),
  water: shape({ day: isStr, ml: isNum }),
  eveningMode: isBool,
  volume: isNum,
  weeklyGoal: (v) => v === null || shape({ id: isStr, text: isStr })(v),
  soundTimer: isNum,
  layout: isNum,
}

export interface ReadResult {
  /** Fields that passed validation; unknown keys are passed through untouched. */
  saved: Partial<Persisted>
  /** Nothing could be read: the stored text is not a JSON object. */
  unreadable: boolean
  /** Fields and records that were dropped because they were malformed. */
  dropped: number
}

/** Parses stored state, keeping every field and record that is still well-formed. */
export function readSaved(raw: string): ReadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { saved: {}, unreadable: true, dropped: 0 }
  }
  if (!isObj(parsed)) return { saved: {}, unreadable: true, dropped: 0 }

  const saved: Record<string, unknown> = {}
  let dropped = 0
  for (const [key, value] of Object.entries(parsed)) {
    const item = LISTS[key as keyof Persisted]
    const field = FIELDS[key as keyof Persisted]
    if (item) {
      if (!Array.isArray(value)) {
        dropped++
        continue
      }
      const kept = value.filter(item)
      dropped += value.length - kept.length
      saved[key] = kept
    } else if (field) {
      if (field(value)) saved[key] = value
      else dropped++
    } else {
      saved[key] = value
    }
  }
  return { saved: saved as Partial<Persisted>, unreadable: false, dropped }
}
