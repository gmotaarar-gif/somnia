import { Suspense, useCallback, useLayoutEffect, useState, type ReactNode } from "react"
import { MotionProvider } from "@/ui/MotionProvider"
import { Aurora } from "@/shell/Aurora"
import { Island } from "@/shell/Island"
import { Splash } from "@/shell/Splash"
import { PhoneFrame } from "@/shell/PhoneFrame"
import { lazyWithRetry as lazy } from "@/shell/LazyChunk"
import { StoreProvider, useStore } from "@/store/store"
import { SubscriptionProvider } from "@/store/subscription"

const Workspace = lazy(() => import("@/shell/Workspace"))
const Onboarding = lazy(() => import("@/screens/Onboarding").then((module) => ({ default: module.Onboarding })))

function InitialContent({ onReady, children }: { onReady: () => void; children: ReactNode }) {
  useLayoutEffect(onReady, [onReady])
  return children
}

function Shell() {
  const { onboarded, tab } = useStore()
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
    </PhoneFrame>
  )
}

export default function App() {
  return (
    <MotionProvider>
      <StoreProvider>
        <SubscriptionProvider>
          <Shell />
        </SubscriptionProvider>
      </StoreProvider>
    </MotionProvider>
  )
}
