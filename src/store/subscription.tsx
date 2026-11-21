import * as React from "react"

export type SubscriptionPlan = "monthly" | "yearly"

export const SUBSCRIPTION_KEY = "somna-subscription-v1"
export const SUBSCRIPTION_PLANS = {
  monthly: { title: "На месяц", price: 299, months: 1 },
  yearly: { title: "На год", price: 1990, months: 12 },
} as const

export interface Membership {
  plan: SubscriptionPlan
  startedAt: string
  endsAt: string
}

/** Calendar periods, clamped to the final day of shorter months. No auto-renewal. */
export function membershipFor(plan: SubscriptionPlan, at = new Date()): Membership {
  const end = new Date(at)
  const day = end.getUTCDate()
  end.setUTCDate(1)
  end.setUTCMonth(end.getUTCMonth() + SUBSCRIPTION_PLANS[plan].months)
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()
  end.setUTCDate(Math.min(day, lastDay))
  return { plan, startedAt: at.toISOString(), endsAt: end.toISOString() }
}

export function parseMembership(raw: string | null): Membership | null {
  try {
    const value: unknown = JSON.parse(raw ?? "null")
    if (!value || typeof value !== "object") return null
    const m = value as Partial<Membership>
    if (m.plan !== "monthly" && m.plan !== "yearly") return null
    if (typeof m.startedAt !== "string" || typeof m.endsAt !== "string") return null
    const start = Date.parse(m.startedAt)
    const end = Date.parse(m.endsAt)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
    return { plan: m.plan, startedAt: m.startedAt, endsAt: m.endsAt }
  } catch {
    return null
  }
}

function loadMembership() {
  try {
    return parseMembership(window.localStorage.getItem(SUBSCRIPTION_KEY))
  } catch {
    return null
  }
}

interface Subscription {
  membership: Membership | null
  isPlus: boolean
  error: string | null
  activate: (plan: SubscriptionPlan) => boolean
  deactivate: () => boolean
  clearError: () => void
}

const SubscriptionContext = React.createContext<Subscription | null>(null)

/** Local demo entitlement only; never use localStorage to authorize a paid service. */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [membership, setMembership] = React.useState(loadMembership)
  const [now, setNow] = React.useState(Date.now)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const refresh = () => setNow(Date.now())
    const sync = (event: StorageEvent) => {
      if (event.key !== SUBSCRIPTION_KEY && event.key !== null) return
      setMembership(loadMembership())
      refresh()
    }
    window.addEventListener("storage", sync)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [])

  React.useEffect(() => {
    if (!membership) return
    const remaining = Date.parse(membership.endsAt) - now
    if (remaining <= 0) return
    // Long periods exceed the browser's maximum timeout; wake only as needed.
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [membership, now])

  const save = React.useCallback((next: Membership | null) => {
    try {
      if (next) window.localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(next))
      else window.localStorage.removeItem(SUBSCRIPTION_KEY)
      setMembership(next)
      setNow(Date.now())
      setError(null)
      return true
    } catch {
      setError("Не удалось сохранить подписку. Разрешите хранение данных в браузере и попробуйте ещё раз.")
      return false
    }
  }, [])
  const activate = React.useCallback((plan: SubscriptionPlan) => save(membershipFor(plan)), [save])
  const deactivate = React.useCallback(() => save(null), [save])
  const clearError = React.useCallback(() => setError(null), [])
  const isPlus = !!membership && Date.parse(membership.startedAt) <= now && Date.parse(membership.endsAt) > now
  const value = React.useMemo(() => ({ membership, isPlus, error, activate, deactivate, clearError }), [membership, isPlus, error, activate, deactivate, clearError])

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

export function useSubscription() {
  const value = React.useContext(SubscriptionContext)
  if (!value) throw new Error("useSubscription must be used inside SubscriptionProvider")
  return value
}
