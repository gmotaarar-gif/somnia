import * as React from "react"
import { m, AnimatePresence, useReducedMotion } from "framer-motion"
import { Moon, Pause, Play, Wind } from "lucide-react"
import { IconSwap, MatrixLoader, SubtleNumber } from "@/components/ui/t-motion"
import { MOTION_TOKENS, SOMNA_TRANSITIONS } from "@/lib/motion"
import { useSomna, useStressTimer } from "@/store/useSomnaStore"

export function DynamicIsland() {
  const { sleepModeActive, setSleepModeActive, wakeGoal, setActiveTab } =
    useSomna()
  const { stressTimer, setStressTimer } = useStressTimer()

  const reduceMotion = useReducedMotion()
  const [expanded, setExpanded] = React.useState(false)

  const hasPausedTimer =
    !stressTimer.running && stressTimer.remainingSec < stressTimer.totalSec
  const hasTimer = stressTimer.running || hasPausedTimer
  const hasSleep = !hasTimer && sleepModeActive
  const isActive = hasTimer || hasSleep

  React.useEffect(() => {
    if (!isActive) setExpanded(false)
  }, [isActive])

  const mm = String(Math.floor(stressTimer.remainingSec / 60)).padStart(2, "0")
  const ss = String(stressTimer.remainingSec % 60).padStart(2, "0")

  const mode = !isActive ? "idle" : expanded ? "expanded" : "compact"
  const width = mode === "idle" ? 118 : mode === "compact" ? 190 : 336
  const height = mode === "idle" ? 33 : mode === "compact" ? 34 : 84
  const blurVal = reduceMotion ? "0px" : `blur(${MOTION_TOKENS.blurs.small}px)`

  const toggleExpanded = () => {
    if (isActive) setExpanded((v) => !v)
  }

  return (
    <m.div
      layout
      transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.islandSpring}
      role={isActive ? "button" : undefined}
      tabIndex={isActive ? 0 : undefined}
      aria-expanded={isActive ? expanded : undefined}
      aria-label={
        isActive
          ? expanded
            ? "Свернуть Dynamic Island"
            : "Развернуть Dynamic Island"
          : undefined
      }
      onClick={toggleExpanded}
      onKeyDown={(e) => {
        if (!isActive) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggleExpanded()
        }
      }}
      style={{
        width,
        height,
        borderRadius: mode === "expanded" ? 28 : 22,
      }}
      className="relative z-50 flex cursor-pointer items-center justify-between overflow-hidden border border-white/12 bg-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.75)] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ff1f]/50"
    >
      <AnimatePresence mode="popLayout">
        {mode === "idle" && (
          <m.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : undefined}
            className="flex h-full w-full items-center justify-end px-3"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#111322] ring-1 ring-indigo-400/20" />
          </m.div>
        )}

        {mode === "compact" && hasTimer && (
          <m.div
            key="compact-timer"
            initial={{ opacity: 0, filter: blurVal }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: blurVal }}
            transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.modalOpen}
            className="flex h-full w-full items-center justify-between px-3.5 text-xs"
          >
            <span className="flex items-center gap-2 text-rose-300">
              {stressTimer.running ? (
                <MatrixLoader
                  variant="pulse"
                  rounded
                  label="Дыхание активно"
                  className="[--matrix-active:#fb7185] [--matrix-base:rgba(251,113,133,0.28)]"
                />
              ) : (
                <Pause className="h-3 w-3 text-rose-300/80" />
              )}
              <Wind className="h-3.5 w-3.5" />
            </span>
            <span className="font-mono text-xs font-semibold text-rose-200 tabular-nums">
              <SubtleNumber value={`${mm}:${ss}`} />
            </span>
          </m.div>
        )}

        {mode === "compact" && hasSleep && (
          <m.div
            key="compact-sleep"
            initial={{ opacity: 0, filter: blurVal }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: blurVal }}
            transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.modalOpen}
            className="flex h-full w-full items-center justify-between px-3.5 text-xs"
          >
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Moon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Сон</span>
            </span>
            <span className="font-mono text-[11px] text-[#e8ff1f]">{wakeGoal}</span>
          </m.div>
        )}

        {mode === "expanded" && hasTimer && (
          <m.div
            key="exp-timer"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.modalOpen}
            className="flex h-full w-full items-center justify-between px-4"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab("practices")
                setExpanded(false)
              }}
              className="flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-white focus-visible:outline-none"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-400/24 bg-rose-500/20 text-rose-200">
                <Wind className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  {stressTimer.running ? "Анти-стресс" : "Пауза дыхания"}
                </div>
                <div className="font-mono text-sm font-bold text-rose-300 tabular-nums">
                  <SubtleNumber value={`${mm}:${ss}`} />
                </div>
              </div>
            </button>

            <button
              type="button"
              aria-label={stressTimer.running ? "Пауза" : "Продолжить"}
              onClick={(e) => {
                e.stopPropagation()
                setStressTimer((p) => ({ ...p, running: !p.running }))
              }}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/18 bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.24] active:scale-95 motion-reduce:transition-none"
            >
              <IconSwap
                state={stressTimer.running ? "a" : "b"}
                iconA={<Pause className="h-4 w-4" />}
                iconB={<Play className="ml-0.5 h-4 w-4" />}
              />
            </button>
          </m.div>
        )}

        {mode === "expanded" && hasSleep && (
          <m.div
            key="exp-sleep"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.modalOpen}
            className="flex h-full w-full items-center justify-between px-4"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab("sleep")
                setExpanded(false)
              }}
              className="flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-white focus-visible:outline-none"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-indigo-400/24 bg-indigo-500/22 text-indigo-200">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Вечерний розовый шум
                </div>
                <div className="font-mono text-xs text-[#e8ff1f]">
                  План подъёма {wakeGoal}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSleepModeActive(false)
              }}
              className="cursor-pointer rounded-full border border-white/18 bg-white/[0.14] px-3.5 py-1.5 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.24] active:scale-95 motion-reduce:transition-none"
            >
              Стоп
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}
