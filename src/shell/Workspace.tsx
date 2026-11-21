import { useEffect, useState, type ComponentType } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { screenVariants } from "@/lib/motion"
import { TodayScreen } from "@/screens/Today"
import { Dock } from "@/shell/Dock"
import { SheetHost } from "@/shell/SheetHost"
import { useStore, type TabId } from "@/store/store"

const SCREENS: Record<TabId, () => Promise<ComponentType>> = {
  today: () => Promise.resolve(TodayScreen),
  sleep: () => import("@/screens/Sleep").then((m) => m.SleepScreen),
  mind: () => import("@/screens/Mind").then((m) => m.MindScreen),
  practices: () => import("@/screens/Practices").then((m) => m.PracticesScreen),
}

export default function Workspace() {
  const { tab, tabDir } = useStore()
  const [visible, setVisible] = useState({ tab: "today" as TabId, tabDir, Screen: TodayScreen as ComponentType })
  const [error, setError] = useState<unknown>(null)
  useEffect(() => {
    if (tab === visible.tab) return
    let current = true
    SCREENS[tab]().then(
      (Screen) => { if (current) setVisible({ tab, tabDir, Screen }) },
      (reason) => { if (current) setError(reason) }
    )
    return () => { current = false }
  }, [tab, tabDir, visible.tab])
  if (error) throw error
  const { Screen } = visible

  return (
    <>
      <div id="app-scroll" className="app-scroll">
        <div className="px-4 pb-[var(--dock-space)] pt-[max(var(--safe-top),14px)]">
          <AnimatePresence mode="wait" initial={false} custom={visible.tabDir}>
            <motion.main key={visible.tab} custom={visible.tabDir} variants={screenVariants} initial="enter" animate="center" exit="exit">
              <Screen />
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
      <Dock />
      <SheetHost />
    </>
  )
}
