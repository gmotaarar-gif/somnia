import { useMemo } from "react"
import { buildAwards } from "@/lib/features"
import { useStore } from "@/store/store"

export function useAwards() {
  const { nights, moods, sessions, wellbeing, bedGoal, wakeGoal, widgets } = useStore()
  return useMemo(
    () =>
      buildAwards({ nights, moods, sessions, wellbeing, bedGoal, wakeGoal, customWidgets: widgets.filter((w) => w.kind === "custom").length }),
    [nights, moods, sessions, wellbeing, bedGoal, wakeGoal, widgets]
  )
}
