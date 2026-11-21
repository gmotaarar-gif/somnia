import { lazy, Suspense } from "react"
import { MotionConfig } from "framer-motion"
import { Aurora } from "@/shell/Aurora"
import { Island } from "@/shell/Island"
import { Splash } from "@/shell/Splash"
import { PhoneFrame } from "@/shell/PhoneFrame"
import { StoreProvider, useStore } from "@/store/store"

const Workspace = lazy(() => import("@/shell/Workspace"))
const Onboarding = lazy(() => import("@/screens/Onboarding").then((module) => ({ default: module.Onboarding })))

function Shell() {
  const { onboarded, tab } = useStore()

  const where = onboarded ? tab : "onboarding"

  return (
    <PhoneFrame tab={where}>
      <Aurora tab={where} />
      <Suspense fallback={null}>
        {onboarded ? <Workspace /> : (
          <div id="app-scroll" className="app-scroll">
            <Onboarding />
          </div>
        )}
      </Suspense>
      <Island />
      <Splash />
    </PhoneFrame>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </MotionConfig>
  )
}
