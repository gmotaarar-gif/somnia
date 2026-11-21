import { useEffect, useState, type ComponentType } from "react"
import { ScreenTransition } from "@/ui/ScreenTransition"
import { TodayScreen } from "@/screens/Today"
import { Dock } from "@/shell/Dock"
import { SheetHost } from "@/shell/SheetHost"
import { loadWithRetry } from "@/shell/LazyChunk"
import { useStore, type TabId } from "@/store/store"

const SCREENS: Record<TabId, () => Promise<ComponentType>> = {
  today: () => Promise.resolve(TodayScreen),
  sleep: () => import("@/screens/Sleep").then((m) => m.SleepScreen),
  mind: () => import("@/screens/Mind").then((m) => m.MindScreen),
  practices: () => import("@/screens/Practices").then((m) => m.PracticesScreen),
}

export default function Workspace() {
  const { tab, tabDir, setTab, notify } = useStore()
  const [visible, setVisible] = useState({ tab: "today" as TabId, tabDir, Screen: TodayScreen as ComponentType })
  useEffect(() => {
    if (tab === visible.tab) return
    let current = true
    loadWithRetry(SCREENS[tab]).then(
      (Screen) => { if (current) setVisible({ tab, tabDir, Screen }) },
      () => {
        if (!current) return
        setTab(visible.tab)
        notify("Не удалось загрузить раздел. Попробуйте ещё раз.")
      }
    )
    return () => { current = false }
  }, [tab, tabDir, visible.tab, setTab, notify])
  const { Screen } = visible

  return (
    <>
      <div id="app-scroll" className="app-scroll">
        <div className="px-4 pb-[var(--dock-space)] pt-[max(var(--safe-top),14px)]">
          <ScreenTransition screenKey={visible.tab} direction={visible.tabDir}>
            <Screen />
          </ScreenTransition>
        </div>
      </div>
      <Dock />
      <SheetHost />
    </>
  )
}
