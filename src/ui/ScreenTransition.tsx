import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react"
import { AnimatePresence } from "framer-motion"
import { WaveController, type WaveType } from "distortion-waves"

type Slot = 0 | 1
type View = { key: string; content: ReactNode }
type Stage = { id: number; active: Slot; views: [View | null, View | null] }

const SLOTS: Slot[] = [0, 1]
const other = (slot: Slot): Slot => (slot === 0 ? 1 : 0)
const LAYER = "isolate col-start-1 row-start-1 min-h-0 min-w-0"
// The wave bends pictures of both screens, taken while it gathers at its
// source. A device that needs longer than this for one, twice running, runs
// on colour alone for a while and is then given the lens again: one slow
// picture is a busy moment, not a slow device.
const PICTURE_BUDGET = 200
const PLAIN_RUNS = 6
// The share of the run up to its clearing during which the front has yet to
// cross most of the view: the screen on show is still the one leaving.
const GATHERING = 0.4

/** Carries one screen into the next with a distortion wave that opens from
 * the control that asked for it: up from a dock tab, a ring out of a card.
 * `overlay` stays live above the wave.
 *
 * The two layers never leave the DOM and a screen never changes layer, so the
 * arriving screen is not remounted when the wave settles. One engine at a
 * time is bound to the pair in the direction of travel: showing → empty.
 */
export function ScreenTransition({ screenKey, children, overlay }: {
  screenKey: string
  children: ReactNode
  overlay?: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const chrome = useRef<HTMLDivElement>(null)
  const layers = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const engine = useRef<{ wave: WaveController; from: HTMLElement } | null>(null)
  const pressed = useRef<HTMLElement | null>(null)
  const source = useRef<HTMLElement | null>(null)
  const lens = useRef({ on: true, slow: 0, rest: 0, wait: PLAIN_RUNS })
  const judged = useRef<WaveController | null>(null)
  const shown = useRef(children)
  const [stage, setStage] = useState<Stage>(() => ({ id: 0, active: 0, views: [{ key: screenKey, content: children }, null] }))
  const [armed, setArmed] = useState(0)

  const travelling = stage.views[other(stage.active)] !== null
  if (stage.views[stage.active]!.key !== screenKey) {
    const views: Stage["views"] = [null, null]
    const back = other(stage.active)
    const run = travelling ? engine.current?.wave.debug : null
    if (run && run.progress < run.clearAt * GATHERING) {
      // The wave has hardly left: the screen on show is still the one
      // leaving. Asked for again, it simply stays; asked for another, it
      // leaves for that one instead of the screen nobody has seen.
      if (stage.views[back]!.key === screenKey) {
        views[back] = { key: screenKey, content: children }
        setStage({ id: stage.id + 1, active: back, views })
      } else {
        views[back] = stage.views[back]
        views[stage.active] = { key: screenKey, content: children }
        setStage({ id: stage.id + 1, active: stage.active, views })
      }
    } else {
      // The screen on show leaves as it was last drawn; the new one takes the
      // other layer, replacing whatever an unfinished wave left there.
      views[stage.active] = { key: stage.views[stage.active]!.key, content: shown.current }
      views[back] = { key: screenKey, content: children }
      setStage({ id: stage.id + 1, active: back, views })
    }
  }
  useLayoutEffect(() => { shown.current = children })

  useLayoutEffect(() => {
    const to = layers[stage.active].current!
    const back = layers[other(stage.active)].current!
    const from = travelling ? back : to
    const rested = engine.current?.from === from ? engine.current.wave : null
    if (rested && travelling) {
      const eye = lens.current
      // How long this engine took to picture the screen now leaving. The very
      // first picture also fills the engine's caches: allow for that.
      const { count, walk, raster } = rested.debug.content
      if (!eye.on) {
        if (--eye.rest <= 0) Object.assign(eye, { on: true, slow: 1 })
      } else if (count && judged.current !== rested) {
        judged.current = rested
        const slow = walk + raster > PICTURE_BUDGET * (stage.id === 1 && count === 1 ? 2.5 : 1)
        if (!slow) Object.assign(eye, { slow: 0, wait: PLAIN_RUNS })
        else if (++eye.slow > 1) Object.assign(eye, { on: false, slow: 0, rest: eye.wait, wait: Math.min(eye.wait * 2, 48) })
      }
    } else if (rested) {
      // A trip called off as the wave gathered: back to rest where it was.
      rested.reset()
    } else {
      engine.current?.wave.destroy()
      engine.current = { wave: new WaveController(root.current!, from, travelling ? to : back), from }
    }
    let type: WaveType = "vertical"
    if (travelling) {
      source.current = pressed.current?.isConnected ? pressed.current : null
      pressed.current = null
      if (source.current && !chrome.current?.contains(source.current)) type = "center"
    }
    const id = stage.id
    engine.current!.wave.update({
      type,
      palette: "colorful",
      capture: lens.current.on,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      onFinish: () => setStage((now) => {
        if (now.id !== id) return now
        const views: Stage["views"] = [null, null]
        views[now.active] = now.views[now.active]
        return { ...now, views }
      }),
    })
  }, [stage.id, travelling])

  // The wave leaves once the arriving screen has run its mount effects and
  // drawn what they changed, so its first picture is the one that stays.
  useEffect(() => {
    if (travelling) setArmed(stage.id)
  }, [stage.id, travelling])
  useEffect(() => {
    if (!travelling || armed !== stage.id) return
    // The wave is the entrance: drop the screen's own CSS mount animations.
    for (const animation of layers[stage.active].current!.getAnimations?.({ subtree: true }) ?? []) {
      if ("animationName" in animation && animation.effect?.getComputedTiming().endTime !== Infinity) animation.cancel()
    }
    engine.current?.wave.play({ source: source.current })
  }, [armed])

  useLayoutEffect(() => () => {
    engine.current?.wave.destroy()
    engine.current = null
  }, [])

  const remember = (event: SyntheticEvent) => {
    if (event.target instanceof Element) pressed.current = event.target.closest<HTMLElement>("button, a, [role='button'], [role='tab']")
  }

  return (
    <div
      ref={root}
      className="absolute inset-0 z-10 isolate grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-[inherit]"
      onClickCapture={remember}
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" || event.key === " ") remember(event)
      }}
    >
      {SLOTS.map((slot) => {
        const view = stage.views[slot]
        return (
          // The arriving layer paints above the leaving one, for the crossfade.
          <div key={slot} ref={layers[slot]} className={LAYER} style={{ order: slot === stage.active ? 1 : 0 }}>
            {view && (
              <main key={view.key} data-screen={view.key} className="relative h-full overflow-hidden bg-bg">
                {/* Screens arrive by wave, not by their own entrance animations. */}
                <AnimatePresence initial={false}>
                  <Fragment key={view.key}>{slot === stage.active ? children : view.content}</Fragment>
                </AnimatePresence>
              </main>
            )}
          </div>
        )
      })}
      {overlay != null && (
        <div ref={chrome} data-dw-skip="" className={`${LAYER} pointer-events-none relative z-2 *:pointer-events-auto`}>
          {overlay}
        </div>
      )}
    </div>
  )
}
