import { AnimatePresence, motion } from "framer-motion"
import { screenVariants } from "@/lib/motion"
import { MindScreen } from "@/screens/Mind"
import { PracticesScreen } from "@/screens/Practices"
import { SleepScreen } from "@/screens/Sleep"
import { TodayScreen } from "@/screens/Today"
import { AwardsSheet, CyclesSheet, NightSheet, WellbeingSheet } from "@/sheets/Extras"
import { BodyScanSheet, GroundingSheet, WorrySheet } from "@/sheets/PracticeSheets"
import { GallerySheet } from "@/sheets/GallerySheet"
import { MoodSheet } from "@/sheets/MoodSheet"
import { ProfileSheet } from "@/sheets/ProfileSheet"
import { RecapSheet } from "@/sheets/RecapSheet"
import { SleepSheet } from "@/sheets/SleepSheet"
import { Dock } from "@/shell/Dock"
import { NightMode } from "@/shell/NightMode"
import { useStore, type TabId } from "@/store/store"

const SCREENS: Record<TabId, () => React.ReactNode> = {
  today: TodayScreen,
  sleep: SleepScreen,
  mind: MindScreen,
  practices: PracticesScreen,
}

export default function Workspace() {
  const { tab, tabDir } = useStore()
  const Screen = SCREENS[tab]

  return (
    <>
      <div id="app-scroll" className="app-scroll">
        <div className="px-4 pb-[var(--dock-space)] pt-[max(var(--safe-top),14px)]">
          <AnimatePresence mode="wait" initial={false} custom={tabDir}>
            <motion.main key={tab} custom={tabDir} variants={screenVariants} initial="enter" animate="center" exit="exit">
              <Screen />
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
      <Dock />
      <MoodSheet />
      <SleepSheet />
      <GallerySheet />
      <RecapSheet />
      <ProfileSheet />
      <CyclesSheet />
      <WellbeingSheet />
      <NightSheet />
      <AwardsSheet />
      <GroundingSheet />
      <BodyScanSheet />
      <WorrySheet />
      <NightMode />
    </>
  )
}
