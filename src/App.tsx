import * as React from "react"
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion"
import { MotionConfig as MotionReactConfig } from "motion/react"
import { accentChain } from "glimm"
import { GlimmProvider } from "glimm/react"
import { SomnaProvider, useSomna, type TabId } from "@/store/useSomnaStore"
import { IPhoneFrame } from "@/components/iphone/IPhoneFrame"
import { StudioControls } from "@/components/iphone/StudioControls"
import { WideBioBentoView } from "@/components/iphone/WideBioBentoView"
import { OnboardingFlow } from "@/components/screens/OnboardingFlow"
import { HomeScreen } from "@/components/screens/HomeScreen"
import { SleepScreen } from "@/components/screens/SleepScreen"
import { AnalyticsScreen } from "@/components/screens/AnalyticsScreen"
import { PracticesScreen } from "@/components/screens/PracticesScreen"
import { WidgetGalleryDrawer } from "@/components/widgets/WidgetGalleryDrawer"
import { MoodCheckInDrawer } from "@/components/modals/MoodCheckInDrawer"
import { WeeklyRecapModal } from "@/components/modals/WeeklyRecapModal"
import { SleepLogDrawer } from "@/components/modals/SleepLogDrawer"
import { ProfileDrawer } from "@/components/modals/ProfileDrawer"
import { MOTION_TOKENS, SOMNA_TRANSITIONS } from "@/lib/motion"
import { cn } from "@/lib/utils"

export const SOMNA_GLIMM_PALETTE = accentChain(["#6366f1", "#2dd4bf", "#e8ff1f"])

const TAB_ORDER: Record<TabId, number> = {
  home: 0,
  sleep: 1,
  analytics: 2,
  practices: 3,
}

function SomnaStage() {
  const { onboarded, activeTab, stressTimer, moodDrawerOpen } = useSomna()
  const [viewMode, setViewMode] = React.useState<"iphone" | "wide">("iphone")
  const reduceMotion = useReducedMotion()

  const prevTabRef = React.useRef<TabId>(activeTab)
  const dir = TAB_ORDER[activeTab] >= TAB_ORDER[prevTabRef.current] ? 1 : -1
  React.useEffect(() => {
    prevTabRef.current = activeTab
  }, [activeTab])

  if (viewMode === "wide") {
    return <WideBioBentoView onBackToPhone={() => setViewMode("iphone")} />
  }

  const activeAuraKey = moodDrawerOpen
    ? "mood"
    : stressTimer.running || activeTab === "practices"
      ? "stress"
      : activeTab === "sleep"
        ? "sleep"
        : "default"

  const stressAuraOpacity = Math.min(1, 0.55 + stressTimer.intensity * 0.045)

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#04040a] px-4 py-3">
      {/* Opacity cross-fading Ambient Stage Aura layers (GPU composited) */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-[var(--duration-very-slow)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
          activeAuraKey === "default" ? "opacity-100" : "opacity-0"
        )}
        style={{
          backgroundImage:
            "radial-gradient(48% 52% at 55% 48%, rgba(139, 92, 246, 0.22), rgba(20, 184, 166, 0.08) 45%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-[var(--duration-very-slow)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
          activeAuraKey === "sleep" ? "opacity-100" : "opacity-0"
        )}
        style={{
          backgroundImage:
            "radial-gradient(45% 50% at 55% 50%, rgba(99, 102, 241, 0.26), transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-[var(--duration-very-slow)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none"
        style={{
          opacity: activeAuraKey === "stress" ? stressAuraOpacity : 0,
          backgroundImage:
            "radial-gradient(45% 50% at 55% 50%, rgba(244, 63, 94, 0.28), transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-[var(--duration-very-slow)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
          activeAuraKey === "mood" ? "opacity-100" : "opacity-0"
        )}
        style={{
          backgroundImage:
            "radial-gradient(45% 50% at 55% 50%, rgba(132, 204, 22, 0.24), transparent 72%)",
        }}
      />

      <div className="relative z-10 flex items-center justify-center gap-8">
        <StudioControls viewMode={viewMode} setViewMode={setViewMode} />

        <IPhoneFrame>
          {!onboarded ? (
            <OnboardingFlow />
          ) : (
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={activeTab}
                custom={dir}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: dir * MOTION_TOKENS.distances.base }
                }
                animate={{ opacity: 1, x: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: dir * -MOTION_TOKENS.distances.base }
                }
                transition={
                  reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.pageSlide
                }
                className="min-h-full"
              >
                {activeTab === "home" && <HomeScreen />}
                {activeTab === "sleep" && <SleepScreen />}
                {activeTab === "analytics" && <AnalyticsScreen />}
                {activeTab === "practices" && <PracticesScreen />}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Scoped iOS Sheets & Modals inside #iphone-portal-root */}
          <WidgetGalleryDrawer />
          <MoodCheckInDrawer />
          <WeeklyRecapModal />
          <SleepLogDrawer />
          <ProfileDrawer />
        </IPhoneFrame>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <MotionReactConfig reducedMotion="user">
        <GlimmProvider
          palette={SOMNA_GLIMM_PALETTE}
          brightness={0.82}
          sweepMs={650}
          outroMs={150}
          easing="easeOutExpo"
        >
          <SomnaProvider>
            <SomnaStage />
          </SomnaProvider>
        </GlimmProvider>
      </MotionReactConfig>
    </MotionConfig>
  )
}
