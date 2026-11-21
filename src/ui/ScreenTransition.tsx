import { useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react"
import { DistortionWave, type WaveStyleInput, type WaveType } from "distortion-waves"
import { usePrefersReducedMotion } from "./MotionProvider"

// A short section change, not a full-screen celebration on every tap.
const WAVE: WaveStyleInput = {
  anticipation: 0.1,
  travel: 0.5,
  returnSpeed: 1.2,
  amplitude: 18,
  aberration: 3,
  blur: 4,
  particleCount: 12,
  linger: 0.08,
  rimFade: 0.2,
  hairlineLinger: 0.08,
  hairlineFade: 0.2,
}

type View = { key: string; content: ReactNode }
type Slot = 0 | 1

/** Two real DOM views; only the destination is interactive or exposed to AT.
 * Alternate slots so settling a wave never remounts the destination screen.
 */
export function ScreenTransition({ screenKey, children, overlay }: {
  screenKey: string
  direction?: number
  children: ReactNode
  overlay?: ReactNode
}) {
  const reduce = usePrefersReducedMotion()
  const source = useRef<HTMLElement | null>(null)
  const type = useRef<WaveType>("vertical")
  const latest = useRef<View>({ key: screenKey, content: children })
  const [views, setViews] = useState<{ key: string; active: Slot; slots: [View | null, View | null] }>(() => ({
    key: screenKey, active: 0, slots: [latest.current, null],
  }))

  if (views.key !== screenKey) {
    const next: Slot = views.active === 0 ? 1 : 0
    const slots: [View | null, View | null] = [null, null]
    slots[views.active] = latest.current
    slots[next] = { key: screenKey, content: children }
    setViews({ key: screenKey, active: next, slots })
  }

  useLayoutEffect(() => { latest.current = { key: screenKey, content: children } })

  // Keep the real control even if its lazy-loaded screen takes time to arrive.
  const rememberSource = (event: SyntheticEvent) => {
    if (!(event.target instanceof Element)) return
    const control = event.target.closest<HTMLElement>("button, a, [role='button'], [role='tab']")
    if (!control) return
    source.current = control
    type.current = control.closest("nav") ? "vertical" : "center"
  }

  const renderSlot = (slot: Slot) => {
    const view = views.slots[slot]
    if (!view) return null
    const active = views.active === slot
    return (
      <main key={view.key} className="relative h-full min-h-0 overflow-hidden bg-bg"
        data-active-screen={active} inert={!active} aria-hidden={!active || undefined}>
        {active ? children : view.content}
      </main>
    )
  }

  return (
    <DistortionWave
      className="absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
      style={{ gridTemplateRows: "minmax(0, 1fr)" }}
      type={type.current}
      source={source}
      revealed={views.active === 1}
      revealedContent={renderSlot(1)}
      overlay={overlay}
      palette="colorful"
      waveStyle={WAVE}
      resolution={1}
      reducedMotion={reduce ? "always" : "system"}
      onClickCapture={rememberSource}
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" || event.key === " ") rememberSource(event)
      }}
      onFinish={(revealed) => setViews((current) => {
        if (revealed !== (current.active === 1)) return current
        const slots: [View | null, View | null] = [...current.slots]
        slots[current.active === 0 ? 1 : 0] = null
        return { ...current, slots }
      })}
    >
      {renderSlot(0)}
    </DistortionWave>
  )
}
