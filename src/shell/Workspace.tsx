import { useEffect, useState, type ComponentType } from "react"
import { ScreenTransition } from "@/ui/ScreenTransition"
import { Aurora } from "@/shell/Aurora"
import { TodayScreen } from "@/screens/Today"
import { Dock } from "@/shell/Dock"
import { SheetHost } from "@/shell/SheetHost"
import { loadWithRetry } from "@/shell/LazyChunk"
import { useStore, type TabId } from "@/store/store"
import { useResolvedTheme } from "@/lib/theme"

const SCREENS: Record<TabId, () => Promise<ComponentType>> = {
  today: () => Promise.resolve(TodayScreen),
  sleep: () => import("@/screens/Sleep").then((m) => m.SleepScreen),
  mind: () => import("@/screens/Mind").then((m) => m.MindScreen),
  practices: () => import("@/screens/Practices").then((m) => m.PracticesScreen),
}

export default function Workspace() {
  const { tab, setTab, notify, theme: themeMode } = useStore()
  const theme = useResolvedTheme(themeMode)
  const [visible, setVisible] = useState({ tab: "today" as TabId, Screen: TodayScreen as ComponentType })
  useEffect(() => {
    if (tab === visible.tab) return
    let current = true
    loadWithRetry(SCREENS[tab]).then(
      (Screen) => { if (current) setVisible({ tab, Screen }) },
      () => {
        if (!current) return
        setTab(visible.tab)
        notify("Не удалось загрузить раздел. Попробуйте ещё раз.")
      }
    )
    return () => { current = false }
  }, [tab, visible.tab, setTab, notify])
  const { Screen } = visible

  return (
    <>
      <ScreenTransition screenKey={visible.tab} overlay={<Dock />}>
        <Aurora tab={visible.tab} theme={theme} snapshot />
        <div className="app-scroll">
          <div className="px-5 pb-[var(--dock-space)] pt-[max(var(--safe-top),14px)]">
            <Screen />
          </div>
        </div>
      </ScreenTransition>
      <SheetHost />
    </>
  )
}
