import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from "react"
import { AnimatePresence } from "framer-motion"
import { DistortionWave, type DistortionWaveHandle, type WaveStyleInput, type WaveType } from "distortion-waves"
import { usePrefersReducedMotion } from "./MotionProvider"
import { createWaveCapture } from "./waveCapture"
import { useWavePerformance } from "./wavePerformance"

// A short section change, not a full-screen celebration on every tap.
const WAVE: WaveStyleInput = {
  anticipation: 0.1,
  travel: 0.5,
  returnSpeed: 1.2,
  amplitude: 18,
  aberration: 3,
  blur: 4,
  particleCount: 12,
  particleLife: 0.85,
  linger: 0.08,
  rimFade: 0.2,
  hairlineLinger: 0.08,
  hairlineFade: 0.2,
}

type View = { key: string; content: ReactNode }
type Slot = 0 | 1
type Views = {
  key: string
  active: Slot
  slots: [View | null, View | null]
  source: HTMLElement | null
  type: WaveType
}

// Slow/unsupported capture must never hold navigation indefinitely.
const CAPTURE_BUDGET = 1200
// Include playback too: a software GPU can prepare quickly but draw very slowly.
const NAVIGATION_BUDGET = 2500

type ScreenTransitionProps = {
  screenKey: string
  direction?: number
  children: ReactNode
  overlay?: ReactNode
}

function LiveScreen({ screenKey, children, overlay }: ScreenTransitionProps) {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
      <main className="relative h-full min-h-0 overflow-hidden bg-bg" data-active-screen="true">
        <AnimatePresence key={screenKey} initial={false}>
          <Fragment key={screenKey}>{children}</Fragment>
        </AnimatePresence>
      </main>
      {overlay}
    </div>
  )
}

/** Never put the first tab change behind capture or the library's visibility
 * controller. Opt into waves only at a screen boundary, after a successful
 * off-thread probe; a late result cannot remount an in-progress local edit.
 */
export function ScreenTransition(props: ScreenTransitionProps) {
  const reduce = usePrefersReducedMotion()
  const fastRenderer = useWavePerformance(!reduce)
  const [mode, setMode] = useState({ initialKey: props.screenKey, value: "checking" as "checking" | "live" | "wave" })
  if (mode.value === "checking" && props.screenKey !== mode.initialKey) {
    // Conservative for the whole session if the user gets here before the
    // probe. Even reducedMotion/capture=false still lets the library hide DOM.
    setMode({ ...mode, value: fastRenderer && !reduce ? "wave" : "live" })
  }
  return mode.value === "wave" ? <WaveScreenTransition {...props} /> : <LiveScreen {...props} />
}

/** Two real DOM views on a verified renderer; only the destination is
 * interactive or exposed to AT. Settling never remounts the destination.
 */
export function WaveScreenTransition({ screenKey, children, overlay }: ScreenTransitionProps) {
  const reduce = usePrefersReducedMotion()
  const wave = useRef<DistortionWaveHandle>(null)
  const preparation = useRef(Promise.resolve())
  const [shown, setShown] = useState<Slot>(0)
  const [captureTooSlow, setCaptureTooSlow] = useState(false)
  const [skipPlayback, setSkipPlayback] = useState(false)
  const source = useRef<HTMLElement | null>(null)
  const type = useRef<WaveType>("vertical")
  const latest = useRef<View>({ key: screenKey, content: children })
  const [views, setViews] = useState<Views>(() => ({
    key: screenKey, active: 0, slots: [latest.current, null], source: null, type: "vertical",
  }))

  if (!skipPlayback && views.key !== screenKey) {
    // A new request while capture is pending replaces the pending view,
    // not the still-visible one. Late captures cannot select an old tab.
    const next: Slot = shown === 0 ? 1 : 0
    const slots: [View | null, View | null] = [null, null]
    slots[shown] = latest.current.key === views.slots[shown]?.key ? latest.current : views.slots[shown]
    slots[next] = { key: screenKey, content: children }
    setViews({ key: screenKey, active: next, slots, source: source.current, type: type.current })
  }

  useLayoutEffect(() => { latest.current = { key: screenKey, content: children } })

  const pictures = useMemo(() => createWaveCapture(), [views.key])
  const crossfade = reduce || captureTooSlow
  useEffect(() => {
    if (skipPlayback) return
    const destination = views.active
    if (destination === shown) return
    if (crossfade) {
      setShown(destination)
      return
    }

    let cancelled = false
    const started = performance.now()
    const fallback = () => {
      if (cancelled) return
      setCaptureTooSlow(true)
      setShown(destination)
    }
    const timer = window.setTimeout(fallback, CAPTURE_BUDGET)
    // prepare() does not wait for a capture already in progress. Serialize
    // requests so rapid navigation always prepares the latest DOM afresh.
    preparation.current = preparation.current.catch(() => {}).then(async () => {
      if (cancelled) return
      await wave.current?.prepare()
      if (cancelled) return
      // prepare() may reuse a previously fresh slot. Seed both scene pictures
      // so even a later invalidation at go() is a cheap cached upload.
      await pictures.prepare()
      if (cancelled) return
      await wave.current?.prepare()
      if (cancelled) return
      // A synchronous DOM readback can starve setTimeout. Enforce the same
      // budget even when the timer hasn't had an event-loop turn yet.
      if (performance.now() - started >= CAPTURE_BUDGET) {
        fallback()
        return
      }
      window.clearTimeout(timer)
      setShown(destination)
    }).catch(fallback)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [views.key, views.active, shown, crossfade, pictures, skipPlayback])

  useEffect(() => {
    if (skipPlayback || !views.slots[0] || !views.slots[1]) return
    const timer = window.setTimeout(() => {
      // Stop using the renderer entirely: changing reducedMotion/scrub while
      // its playback is running still leaves the library owning visibility.
      setSkipPlayback(true)
    }, NAVIGATION_BUDGET)
    return () => window.clearTimeout(timer)
  }, [views.key, views.active, views.slots, skipPlayback])

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
    // Keep these attributes stable from preparation through playback.
    // Changing them when playback starts dirties both prepared textures.
    const active = views.active === slot
    return (
      <main key={view.key} className="relative h-full min-h-0 overflow-hidden bg-bg"
        data-active-screen={active} inert={!active} aria-hidden={!active || undefined}>
        {/* The wave replaces screen-entry animations; capture fully visible
            cards/charts rather than their initial opacity/path-length zero. */}
        <AnimatePresence initial={false}>
          <Fragment key={view.key}>{views.active === slot ? children : view.content}</Fragment>
        </AnimatePresence>
      </main>
    )
  }

  // Exceptional recovery: release the slow renderer and mount the current
  // screen visibly. Further section changes use ordinary DOM navigation.
  if (skipPlayback) return <LiveScreen screenKey={screenKey} overlay={overlay}>{children}</LiveScreen>

  return (
    <DistortionWave
      ref={wave}
      className="absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
      style={{ gridTemplateRows: "minmax(0, 1fr)" }}
      type={views.type}
      source={views.source}
      revealed={shown === 1}
      revealedContent={renderSlot(1)}
      overlay={overlay}
      palette="colorful"
      waveStyle={WAVE}
      resolution={1}
      // A reduced-motion/capture-timeout fallback must not start new captures.
      capture={crossfade ? false : pictures.capture}
      prewarm={false}
      live={false}
      reducedMotion={crossfade ? "always" : "system"}
      onClickCapture={rememberSource}
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" || event.key === " ") rememberSource(event)
      }}
      onFinish={(revealed) => setViews((current) => {
        if (current.active !== shown || revealed !== (shown === 1)) return current
        const slots: [View | null, View | null] = [...current.slots]
        slots[current.active === 0 ? 1 : 0] = null
        return { ...current, slots }
      })}
    >
      {renderSlot(0)}
    </DistortionWave>
  )
}
