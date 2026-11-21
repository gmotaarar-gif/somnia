import * as React from "react"
import { summarize, type Summary } from "@/lib/metrics"
import { useStore } from "@/store/store"

export function useSummary(span = 7): Summary {
  const { nights, moods, bedGoal, wakeGoal } = useStore()
  return React.useMemo(() => summarize(nights, moods, bedGoal, wakeGoal, span), [nights, moods, bedGoal, wakeGoal, span])
}

/** Re-render on a wall-clock interval (countdowns, greetings). */
export function useNow(everyMs = 30_000): Date {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), everyMs)
    return () => window.clearInterval(id)
  }, [everyMs])
  return now
}
