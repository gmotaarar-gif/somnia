import * as React from "react"
import { Wifi, BatteryFull, Signal } from "lucide-react"
import { accentChain } from "glimm"
import {
  GlimmScope,
  type GlimmScopeHandle,
  type ScopePlayOptions,
} from "glimm/react"
import { IPhonePortalContext } from "@/context/IPhonePortalContext"
import { DynamicIsland } from "@/components/iphone/DynamicIsland"
import { SoftTabs, type SoftTab } from "@/components/ui/soft-tabs"
import { prefersReducedMotion } from "@/lib/motion"
import { useSomna, type TabId } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const PHONE_GLIMM_PALETTE = accentChain(["#6366f1", "#2dd4bf", "#e8ff1f"])

interface IPhoneGlimmCtx {
  playPhoneSweep: (opts?: ScopePlayOptions<unknown>) => void
}

const IPhoneGlimmContext = React.createContext<IPhoneGlimmCtx>({
  playPhoneSweep: (opts) => {
    opts?.change?.(undefined)
  },
})

export function useIPhoneGlimm(): IPhoneGlimmCtx {
  return React.useContext(IPhoneGlimmContext)
}

function SleepMoonIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth={4.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M36.5 29.5A14.5 14.5 0 0 1 18.5 11.5a14.5 14.5 0 1 0 18 18z" />
      <path d="M32 10v5M29.5 12.5h5" strokeWidth={3.4} />
    </svg>
  )
}

function AnalyticsWaveIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth={4.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 27c4.5-9 9-9 13.5 0s9 9 13.5 0c2.2-4.4 4.5-6.5 9-6.5" />
      <circle cx="38" cy="14" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

const SOMNA_TABS: SoftTab[] = [
  { id: "home", label: "Главная", icon: "sun" },
  { id: "sleep", label: "Сон", icon: <SleepMoonIcon /> },
  { id: "analytics", label: "Аналитика", icon: <AnalyticsWaveIcon /> },
  { id: "practices", label: "Практики", icon: "heart" },
]

export function IPhoneFrame({ children }: { children: React.ReactNode }) {
  const {
    onboarded,
    activeTab,
    setActiveTab,
    anyOverlayOpen,
    setMoodDrawerOpen,
    stressTimer,
    weeklyRecapOpen,
  } = useSomna()

  const [portalEl, setPortalEl] = React.useState<HTMLElement | null>(null)
  const [scale, setScale] = React.useState(1)
  const scopeRef = React.useRef<GlimmScopeHandle>(null)
  const lastSweepAtRef = React.useRef(0)
  const prevWeeklyRef = React.useRef(weeklyRecapOpen)

  const playPhoneSweep = React.useCallback((opts?: ScopePlayOptions<unknown>) => {
    lastSweepAtRef.current = performance.now()
    if (prefersReducedMotion() || !scopeRef.current) {
      opts?.change?.(undefined)
      opts?.onLeave?.()
      return
    }
    scopeRef.current.play(opts)
  }, [])

  // Trigger in-phone GlimmScope sweep if weeklyRecapOpen opens via external trigger
  React.useEffect(() => {
    if (!prevWeeklyRef.current && weeklyRecapOpen) {
      const elapsed = performance.now() - lastSweepAtRef.current
      if (elapsed > 320 && !prefersReducedMotion() && scopeRef.current) {
        scopeRef.current.play()
      }
    }
    prevWeeklyRef.current = weeklyRecapOpen
  }, [weeklyRecapOpen])

  React.useEffect(() => {
    const updateScale = () => {
      const vh = window.innerHeight
      const vw = window.innerWidth
      const targetH = 882
      const targetW = 426
      const s = Math.min(1, (vh - 28) / targetH, (vw - 24) / targetW)
      setScale(Math.max(0.68, +s.toFixed(3)))
    }
    updateScale()
    window.addEventListener("resize", updateScale)
    return () => window.removeEventListener("resize", updateScale)
  }, [])

  const showStressEdge = onboarded && activeTab === "practices"
  const stressAlpha = +(0.26 + stressTimer.intensity * 0.056).toFixed(3)
  const stressCycle =
    stressTimer.technique === "478"
      ? "19s"
      : stressTimer.technique === "box"
        ? "16s"
        : "14s"

  const glimmValue = React.useMemo(
    () => ({ playPhoneSweep }),
    [playPhoneSweep]
  )

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: Math.round(421 * scale),
        height: Math.round(880 * scale),
      }}
    >
      {/* Titanium iPhone 16 Pro Chassis */}
      <div
        style={{
          width: 421,
          height: 880,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
        className="relative shrink-0 rounded-[62px] bg-gradient-to-b from-[#3a3b44] via-[#1f2026] to-[#2c2d35] p-[11px] shadow-[0_32px_90px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.14)]"
      >
        {/* Hardware Side Buttons */}
        <span
          aria-hidden
          className="absolute top-[132px] -left-[3px] h-7 w-[3px] rounded-l-sm bg-[#464853]"
        />
        <span
          aria-hidden
          className="absolute top-[184px] -left-[3px] h-13 w-[3px] rounded-l-sm bg-[#464853]"
        />
        <span
          aria-hidden
          className="absolute top-[250px] -left-[3px] h-13 w-[3px] rounded-l-sm bg-[#464853]"
        />
        <span
          aria-hidden
          className="absolute top-[210px] -right-[3px] h-20 w-[3px] rounded-r-sm bg-[#464853]"
        />

        {/* Inner Black Bezel */}
        <div className="relative h-full w-full overflow-hidden rounded-[52px] bg-black p-[3px] ring-1 ring-black">
          {/* Logical 393 x 852 OLED Screen */}
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[49px] bg-[#050508] text-white">
            <IPhonePortalContext.Provider value={portalEl}>
              <IPhoneGlimmContext.Provider value={glimmValue}>
                {/* Full-bleed Stress 04:00 OLED Perimeter Vignette (GPU opacity-only) */}
                {showStressEdge ? (
                  <div
                    aria-hidden
                    data-running={stressTimer.running ? "true" : "false"}
                    style={
                      {
                        "--stress-glow-alpha": stressAlpha,
                        "--stress-cycle": stressCycle,
                      } as React.CSSProperties
                    }
                    className="stress-edge-viewport pointer-events-none absolute inset-0 z-35 rounded-[49px]"
                  />
                ) : null}

                {/* iOS Status Bar + Dynamic Island */}
                <div className="pointer-events-none relative z-50 flex h-[52px] shrink-0 items-center justify-between px-7 pt-2 select-none">
                  <span className="w-14 font-sans text-[14px] font-semibold tracking-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.28)]">
                    19:53
                  </span>

                  <div className="pointer-events-auto absolute top-2.5 left-1/2 -translate-x-1/2">
                    <DynamicIsland />
                  </div>

                  <div className="flex w-16 items-center justify-end gap-1.5 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.28)]">
                    <Signal className="h-3.5 w-3.5" />
                    <Wifi className="h-3.5 w-3.5" />
                    <BatteryFull className="h-4 w-4" />
                  </div>
                </div>

                {/* Scoped In-Phone Glimm Canvas around Main Scrollable Viewport */}
                <GlimmScope
                  ref={scopeRef}
                  palette={PHONE_GLIMM_PALETTE}
                  direction="btt"
                  curve={0.14}
                  sweepMs={820}
                  brightness={0.82}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <main
                    className={cn(
                      "relative h-full w-full flex-1 overflow-x-hidden overflow-y-auto transition-[transform,border-radius] duration-[var(--duration-medium)] [transition-timing-function:var(--ease-ios-drawer)] will-change-transform motion-reduce:transition-none motion-reduce:transform-none no-scrollbar",
                      anyOverlayOpen
                        ? "translate-y-[6px] scale-[0.94] overflow-hidden rounded-[34px]"
                        : "translate-y-0 scale-100"
                    )}
                  >
                    {children}
                  </main>
                </GlimmScope>

                {/* Scoped iOS Pushback Scrim (opacity only, no filter paint cost) */}
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 z-35 bg-black/32 transition-opacity duration-[var(--duration-medium)] [transition-timing-function:var(--ease-ios-drawer)] motion-reduce:transition-none",
                    anyOverlayOpen ? "opacity-100" : "opacity-0"
                  )}
                />

                {/* Floating Bottom Dock: SoftTabs only */}
                {onboarded ? (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center pb-5 transition-opacity duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                      anyOverlayOpen && "pointer-events-none opacity-0"
                    )}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 -top-10 bottom-0 bg-gradient-to-t from-[#050508] via-[#050508]/92 to-transparent"
                    />

                    <div className="pointer-events-auto relative z-10 w-full px-2">
                      <SoftTabs
                        tabs={SOMNA_TABS}
                        value={activeTab}
                        onValueChange={(id) => setActiveTab(id as TabId)}
                        onAdd={() => setMoodDrawerOpen(true)}
                        addLabel="Записать состояние"
                        ariaLabel="Разделы Somna"
                        surface="#181924"
                        background="#07070c"
                        accent="#e8ff1f"
                        color="#f8fafc"
                        iridescence={["#e8f8ff", "#c7d9ff", "#8b7aff", "#ff9ee4"]}
                        glassBlobs={["#2dd4bf", "#6366f1", "#1e1b4b"]}
                        size={68}
                        grain={0}
                        style={{
                          minHeight: 0,
                          height: 68,
                          background: "transparent",
                          overflow: "visible",
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Portal Root for Scoped Vaul Drawers & Dialogs (sibling of GlimmScope) */}
                <div
                  id="iphone-portal-root"
                  ref={setPortalEl}
                  className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[49px]"
                />

                {/* iOS Home Indicator Pill */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute bottom-1.5 left-1/2 z-50 h-[4.5px] w-32 -translate-x-1/2 rounded-full bg-white/35"
                />
              </IPhoneGlimmContext.Provider>
            </IPhonePortalContext.Provider>
          </div>
        </div>
      </div>
    </div>
  )
}
