import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import { screenVariants } from "@/lib/motion"
import { MindScreen } from "@/screens/Mind"
import { Onboarding } from "@/screens/Onboarding"
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
import { SubscriptionSheet } from "@/sheets/SubscriptionSheet"
import { Aurora } from "@/shell/Aurora"
import { Dock } from "@/shell/Dock"
import { Island } from "@/shell/Island"
import { NightMode } from "@/shell/NightMode"
import { Splash } from "@/shell/Splash"
import { PhoneFrame } from "@/shell/PhoneFrame"
import { StoreProvider, useStore, type TabId } from "@/store/store"
import { SubscriptionProvider } from "@/store/subscription"

const SCREENS: Record<TabId, () => React.ReactNode> = {
  today: TodayScreen,
  sleep: SleepScreen,
  mind: MindScreen,
  practices: PracticesScreen,
}

function Shell() {
  const { onboarded, tab, tabDir } = useStore()
  const Screen = SCREENS[tab]

  const where = onboarded ? tab : "onboarding"

  return (
    <PhoneFrame tab={where}>
      <Aurora tab={where} />
      <div id="app-scroll" className="app-scroll">
        {onboarded ? (
          <div className="px-4 pb-[var(--dock-space)] pt-[max(var(--safe-top),14px)]">
            <AnimatePresence mode="wait" initial={false} custom={tabDir}>
              <motion.main key={tab} custom={tabDir} variants={screenVariants} initial="enter" animate="center" exit="exit">
                <Screen />
              </motion.main>
            </AnimatePresence>
          </div>
        ) : (
          <Onboarding />
        )}
      </div>
      <Island />
      <Splash />
      {onboarded && (
        <>
          <Dock />
          <MoodSheet />
          <SleepSheet />
          <GallerySheet />
          <RecapSheet />
          <ProfileSheet />
          <SubscriptionSheet />
          <CyclesSheet />
          <WellbeingSheet />
          <NightSheet />
          <AwardsSheet />
          <GroundingSheet />
          <BodyScanSheet />
          <WorrySheet />
          <NightMode />
        </>
      )}
    </PhoneFrame>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <SubscriptionProvider>
          <Shell />
        </SubscriptionProvider>
      </StoreProvider>
    </MotionConfig>
  )
}
