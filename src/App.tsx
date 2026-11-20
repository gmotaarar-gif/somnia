import * as React from "react"
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domMax,
  m,
  useReducedMotion,
} from "framer-motion"
import { accentChain } from "glimm"
import { GlimmProvider } from "glimm/react"
import {
  SomnaProvider,
  useSomna,
  useStressTimer,
  type TabId,
} from "@/store/useSomnaStore"
import { IPhoneFrame } from "@/components/iphone/IPhoneFrame"
import { StudioControls } from "@/components/iphone/StudioControls"
import { HomeScreen } from "@/components/screens/HomeScreen"
import { MoodCheckInDrawer } from "@/components/modals/MoodCheckInDrawer"
import { SleepLogDrawer } from "@/components/modals/SleepLogDrawer"
import { ProfileDrawer } from "@/components/modals/ProfileDrawer"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { SOMNA_TRANSITIONS, TAB_SLIDE_VARIANTS } from "@/lib/motion"
import { cn } from "@/lib/utils"

const OnboardingFlow = React.lazy(
  () => import("@/components/screens/OnboardingFlow")
)
const SleepScreen = React.lazy(() => import("@/components/screens/SleepScreen"))
const AnalyticsScreen = React.lazy(
  () => import("@/components/screens/AnalyticsScreen")
)
const PracticesScreen = React.lazy(
  () => import("@/components/screens/PracticesScreen")
)
const WeeklyRecapModal = React.lazy(
  () => import("@/components/modals/WeeklyRecapModal")
)
const WidgetGalleryDrawer = React.lazy(
  () => import("@/components/widgets/WidgetGalleryDrawer")
)
const WideBioBentoView = React.lazy(() =>
  import("@/components/iphone/WideBioBentoView").then((mod) => ({
    default: mod.WideBioBentoView,
  }))
)

const SOMNA_GLIMM_PALETTE = accentChain(["#6366f1", "#2dd4bf", "#e8ff1f"])

const TAB_ORDER: Record<TabId, number> = {
  home: 0,
  sleep: 1,
  analytics: 2,
  practices: 3,
}

const AURA_LAYERS: { key: string; gradient: string }[] = [
  {
    key: "default",
    gradient:
      "radial-gradient(48% 52% at 55% 48%, rgba(139, 92, 246, 0.22), rgba(20, 184, 166, 0.08) 45%, transparent 75%)",
  },
  {
    key: "sleep",
    gradient:
      "radial-gradient(45% 50% at 55% 50%, rgba(99, 102, 241, 0.26), transparent 72%)",
  },
  {
    key: "stress",
    gradient:
      "radial-gradient(45% 50% at 55% 50%, rgba(244, 63, 94, 0.28), transparent 72%)",
  },
  {
    key: "mood",
    gradient:
      "radial-gradient(45% 50% at 55% 50%, rgba(132, 204, 22, 0.24), transparent 72%)",
  },
  {
    key: "analytics",
    gradient:
      "radial-gradient(46% 52% at 54% 48%, rgba(45, 212, 191, 0.22), rgba(99, 102, 241, 0.1) 52%, transparent 74%)",
  },
  {
    key: "onboarding",
    gradient:
      "radial-gradient(50% 54% at 52% 46%, rgba(129, 140, 248, 0.28), rgba(244, 63, 94, 0.12) 55%, transparent 76%)",
  },
]

function resolveAuraKey(
  onboarded: boolean,
  moodDrawerOpen: boolean,
  sleepLogOpen: boolean,
  stressRunning: boolean,
  activeTab: TabId
): string {
  if (!onboarded) return "onboarding"
  if (moodDrawerOpen) return "mood"
  if (sleepLogOpen) return "sleep"
  if (stressRunning || activeTab === "practices") return "stress"
  if (activeTab === "sleep" || activeTab === "analytics") return activeTab
  return "default"
}

function StageAuraLayers({
  onboarded,
  activeTab,
  moodDrawerOpen,
  sleepLogOpen,
}: {
  onboarded: boolean
  activeTab: TabId
  moodDrawerOpen: boolean
  sleepLogOpen: boolean
}) {
  const { stressTimer } = useStressTimer()
  const activeAuraKey = resolveAuraKey(
    onboarded,
    moodDrawerOpen,
    sleepLogOpen,
    stressTimer.running,
    activeTab
  )
  const stressAuraOpacity = Math.min(1, 0.55 + stressTimer.intensity * 0.045)

  return (
    <>
      {AURA_LAYERS.map((layer) => {
        const isActive = activeAuraKey === layer.key
        const opacity =
          layer.key === "stress"
            ? isActive
              ? stressAuraOpacity
              : 0
            : isActive
              ? 1
              : 0
        return (
          <div
            key={layer.key}
            aria-hidden
            className="pointer-events-none absolute inset-0 transition-opacity duration-[var(--duration-very-slow)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none"
            style={{ opacity, backgroundImage: layer.gradient }}
          />
        )
      })}
    </>
  )
}

function ScreenFallback() {
  return (
    <div
      aria-busy="true"
      className="flex min-h-[320px] items-center justify-center px-4 py-12"
    >
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-[#e8ff1f] motion-reduce:animate-none" />
    </div>
  )
}

function SomnaStage() {
  const {
    onboarded,
    activeTab,
    moodDrawerOpen,
    sleepLogOpen,
    weeklyRecapOpen,
    widgetGalleryOpen,
  } = useSomna()
  const [viewMode, setViewMode] = React.useState<"iphone" | "wide">("iphone")
  const reduceMotion = useReducedMotion()

  const prevTabRef = React.useRef<TabId>(activeTab)
  const dir = TAB_ORDER[activeTab] >= TAB_ORDER[prevTabRef.current] ? 1 : -1
  React.useEffect(() => {
    prevTabRef.current = activeTab
  }, [activeTab])

  if (viewMode === "wide") {
    return (
      <ErrorBoundary>
        <React.Suspense fallback={<ScreenFallback />}>
          <WideBioBentoView onBackToPhone={() => setViewMode("iphone")} />
        </React.Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#04040a] px-4 py-3">
      <StageAuraLayers
        onboarded={onboarded}
        activeTab={activeTab}
        moodDrawerOpen={moodDrawerOpen}
        sleepLogOpen={sleepLogOpen}
      />

      <div className="relative z-10 flex items-center justify-center gap-8">
        <StudioControls viewMode={viewMode} setViewMode={setViewMode} />

        <IPhoneFrame>
          <ErrorBoundary>
            <React.Suspense fallback={<ScreenFallback />}>
              <AnimatePresence mode="wait" initial={false}>
                {!onboarded ? (
                  <m.div
                    key="onboarding-stage"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.985, filter: "blur(3px)" }
                    }
                    transition={
                      reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.modalOpen
                    }
                    className="h-full w-full"
                  >
                    <OnboardingFlow />
                  </m.div>
                ) : (
                  <m.div
                    key="app-stage"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={
                      reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.subtleFade
                    }
                    className="min-h-full"
                  >
                    <AnimatePresence
                      mode="wait"
                      initial={false}
                      custom={{ dir, reduced: !!reduceMotion }}
                    >
                      <m.div
                        key={activeTab}
                        custom={{ dir, reduced: !!reduceMotion }}
                        variants={TAB_SLIDE_VARIANTS}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="min-h-full"
                      >
                        {activeTab === "home" && <HomeScreen />}
                        {activeTab === "sleep" && <SleepScreen />}
                        {activeTab === "analytics" && <AnalyticsScreen />}
                        {activeTab === "practices" && <PracticesScreen />}
                      </m.div>
                    </AnimatePresence>
                  </m.div>
                )}
              </AnimatePresence>
            </React.Suspense>
          </ErrorBoundary>

          {/* Scoped iOS Sheets & Modals inside #iphone-portal-root */}
          <React.Suspense fallback={null}>
            {widgetGalleryOpen ? <WidgetGalleryDrawer /> : null}
            {weeklyRecapOpen ? <WeeklyRecapModal /> : null}
          </React.Suspense>
          <MoodCheckInDrawer />
          <SleepLogDrawer />
          <ProfileDrawer />
        </IPhoneFrame>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion="user">
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
      </MotionConfig>
    </LazyMotion>
  )
}
