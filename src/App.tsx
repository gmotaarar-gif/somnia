import { Suspense, useCallback, useLayoutEffect, useState, type ReactNode } from "react"
import { MotionConfig } from "framer-motion"
import { LocalAccountProvider, useLocalAccount } from "@/account/LocalAccountProvider"
import { Aurora } from "@/shell/Aurora"
import { Island } from "@/shell/Island"
import { Splash } from "@/shell/Splash"
import { PhoneFrame } from "@/shell/PhoneFrame"
import { lazyWithRetry as lazy } from "@/shell/LazyChunk"
import { Deferred } from "@/shell/Deferred"
import { StoreProvider, useStore } from "@/store/store"

const Workspace = lazy(() => import("@/shell/Workspace"))
const Onboarding = lazy(() => import("@/screens/Onboarding").then((module) => ({ default: module.Onboarding })))
const RegistrationSheet = lazy(() => import("@/account/RegistrationSheet").then((module) => ({ default: module.RegistrationSheet })))

function InitialContent({ onReady, children }: { onReady: () => void; children: ReactNode }) {
  useLayoutEffect(onReady, [onReady])
  return children
}

function Shell() {
  const { onboarded, tab } = useStore()
  const { registrationOpen } = useLocalAccount()
  const [ready, setReady] = useState(false)
  const markReady = useCallback(() => setReady(true), [])

  const where = onboarded ? tab : "onboarding"

  return (
    <PhoneFrame tab={where}>
      <Aurora tab={where} />
      <Suspense fallback={null}>
        <InitialContent onReady={markReady}>
          {onboarded ? <Workspace onLoadError={markReady} /> : (
            <div id="app-scroll" className="app-scroll">
              <Onboarding onLoadError={markReady} />
            </div>
          )}
        </InitialContent>
      </Suspense>
      <Island />
      <Splash ready={ready} />
      {/* A pending onboarding transition still exposes the old store snapshot. */}
      <Deferred active={onboarded && registrationOpen}><RegistrationSheet /></Deferred>
    </PhoneFrame>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <LocalAccountProvider>
          <Shell />
        </LocalAccountProvider>
      </StoreProvider>
    </MotionConfig>
  )
}
