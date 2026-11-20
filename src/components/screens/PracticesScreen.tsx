import * as React from "react"
import { m, useReducedMotion } from "framer-motion"
import {
  ArrowLeft,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"
import { ExposureSlider } from "@/components/ui/exposure-slider"
import { HopArcs } from "@/components/ui/dotted-track"
import { SLSoundVolumeSlider } from "@/components/ui/sl-product-controls"
import {
  IconSwap,
  SlidingTabs,
  SubtleNumber,
  SuccessCheck,
  TextStatesSwap,
} from "@/components/ui/t-motion"
import { setSoundVolume, type SoundMode } from "@/lib/audioEngine"
import { SOMNA_SPRINGS, haptic } from "@/lib/motion"
import {
  useSomna,
  useStressTimer,
  type StressTimerState,
} from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const SOUND_OPTIONS: { id: SoundMode; label: string }[] = [
  { id: "off", label: "Тишина" },
  { id: "rain", label: "Дождь" },
  { id: "pink", label: "Розовый" },
  { id: "drone", label: "432 Гц" },
]

const TECHNIQUE_TABS: {
  id: StressTimerState["technique"]
  label: string
  title: string
}[] = [
  { id: "stress", label: "4-4-6", title: "Схема 4-4-6" },
  { id: "478", label: "4-7-8", title: "Схема 4-7-8" },
  { id: "box", label: "4×4", title: "Квадрат 4×4" },
]

export function PracticesScreen() {
  const {
    soundVolume,
    setSoundVolumePct,
    breathMinutes,
    addBreathMinutes,
    setActiveTab,
  } = useSomna()
  const { stressTimer, setStressTimer } = useStressTimer()

  const reduceMotion = useReducedMotion()
  const [soundMenuOpen, setSoundMenuOpen] = React.useState(false)
  const [loggedBanner, setLoggedBanner] = React.useState<number | null>(null)
  const bannerTimerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (bannerTimerRef.current !== null) {
        window.clearTimeout(bannerTimerRef.current)
      }
    }
  }, [])

  // Synchronized breathing cue + physical halo expansion phase
  const breathMeta = React.useMemo(() => {
    if (!stressTimer.running) {
      return {
        label: "При напряжении попробуйте 4 минуты. При сильном стрессе — 6 минут.",
        kind: "idle" as const,
        scale: 1,
        hopStep: 0,
      }
    }
    const elapsed = stressTimer.totalSec - stressTimer.remainingSec
    if (stressTimer.technique === "478") {
      const m = elapsed % 19
      if (m < 4) return { label: "Вдох носом · 4 сек", kind: "inhale" as const, scale: 1.18, hopStep: 1 }
      if (m < 11) return { label: "Задержка · 7 сек", kind: "hold" as const, scale: 1.2, hopStep: 2 }
      return { label: "Плавный выдох · 8 сек", kind: "exhale" as const, scale: 0.9, hopStep: 3 }
    }
    if (stressTimer.technique === "box") {
      const m = elapsed % 16
      if (m < 4) return { label: "Вдох · 4 сек", kind: "inhale" as const, scale: 1.16, hopStep: 1 }
      if (m < 8) return { label: "Пауза на вдохе · 4 сек", kind: "hold" as const, scale: 1.18, hopStep: 2 }
      if (m < 12) return { label: "Выдох · 4 сек", kind: "exhale" as const, scale: 0.9, hopStep: 3 }
      return { label: "Пауза на выдохе · 4 сек", kind: "rest" as const, scale: 0.88, hopStep: 4 }
    }
    const m = elapsed % 14
    if (m < 4) return { label: "Глубокий вдох · 4 сек", kind: "inhale" as const, scale: 1.18, hopStep: 1 }
    if (m < 8) return { label: "Спокойная пауза · 4 сек", kind: "hold" as const, scale: 1.2, hopStep: 2 }
    return { label: "Длинный выдох · 6 сек", kind: "exhale" as const, scale: 0.9, hopStep: 3 }
  }, [
    stressTimer.running,
    stressTimer.remainingSec,
    stressTimer.totalSec,
    stressTimer.technique,
  ])

  const mm = String(Math.floor(stressTimer.remainingSec / 60)).padStart(2, "0")
  const ss = String(stressTimer.remainingSec % 60).padStart(2, "0")
  const elapsedSec = Math.max(0, stressTimer.totalSec - stressTimer.remainingSec)
  const elapsedMin = +(elapsedSec / 60).toFixed(1)
  const sessionProgress =
    stressTimer.totalSec > 0 ? Math.min(1, elapsedSec / stressTimer.totalSec) : 0

  const adjustMinutes = (deltaMin: number) => {
    haptic(6)
    setStressTimer((prev) => {
      const nextTotal = Math.max(60, Math.min(900, prev.totalSec + deltaMin * 60))
      const nextRem = Math.max(
        30,
        Math.min(nextTotal, prev.remainingSec + deltaMin * 60)
      )
      return { ...prev, totalSec: nextTotal, remainingSec: nextRem }
    })
  }

  const handleIntensityChange = (val: number) => {
    setStressTimer((prev) => ({ ...prev, intensity: val }))
    const volScale = Math.max(0, Math.min(1, soundVolume / 100))
    setSoundVolume(volScale * (0.28 + val * 0.045))
  }

  const handleVolumeChange = (nextPct: number) => {
    setSoundVolumePct(nextPct)
    setSoundVolume((nextPct / 100) * (0.28 + stressTimer.intensity * 0.045))
  }

  const finishAndLog = () => {
    haptic(12)
    const loggedMin = Math.max(1, Math.round(elapsedMin))
    addBreathMinutes(loggedMin)
    setStressTimer((prev) => ({
      ...prev,
      running: false,
      remainingSec: prev.totalSec,
    }))
    setLoggedBanner(loggedMin)
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current)
    }
    bannerTimerRef.current = window.setTimeout(() => {
      setLoggedBanner(null)
    }, 2600)
  }

  const activeSoundLabel =
    SOUND_OPTIONS.find((s) => s.id === stressTimer.sound)?.label ?? "Тишина"

  const bloomAlpha = +(0.22 + stressTimer.intensity * 0.024).toFixed(3)

  return (
    <div className="relative flex min-h-full flex-col justify-between bg-[#050304] px-5 pt-2 pb-34 text-white select-none">
      {/* Soft radial coral bloom behind Intensity dial (Ref #2) */}
      <div
        aria-hidden
        className="somna-aura-drift pointer-events-none absolute inset-0 transition-opacity duration-[var(--duration-medium)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none"
        style={{
          backgroundImage: `radial-gradient(84% 42% at 50% 62%, rgba(218, 92, 84, ${bloomAlpha}), rgba(5, 3, 4, 0) 74%)`,
        }}
      />

      {/* Symmetrical 3-slot Stress 04:00 Top Bar (Ref #2) */}
      <header className="relative z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            haptic(5)
            setActiveTab("home")
          }}
          aria-label="Назад на главную"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.07] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.14] active:scale-95 motion-reduce:transition-none"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center">
          <h1 className="text-[16px] font-medium tracking-tight text-white">
            Анти-стресс
          </h1>
          <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-white/55">
            <span>Сегодня:</span>
            <span className="font-mono text-[#e8ff1f]">+{breathMinutes} м</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic(5)
            setStressTimer((prev) => ({
              ...prev,
              running: false,
              remainingSec: prev.totalSec,
            }))
            setActiveTab("home")
          }}
          aria-label="Закрыть практику"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.07] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.14] active:scale-95 motion-reduce:transition-none"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Main Stress 04:00 Breathing Stage */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center pt-2 text-center">
        {/* Compact Breathing Technique SlidingTabs */}
        <div>
          <SlidingTabs
            items={TECHNIQUE_TABS}
            value={stressTimer.technique}
            onValueChange={(id) => {
              haptic(5)
              setStressTimer((prev) => ({ ...prev, technique: id }))
            }}
            ariaLabel="Схема дыхания"
            size="xs"
          />
        </div>

        {/* Giant Tabular Timer Readout with Live Phase-Synchronized Breathing Halo */}
        <div className="relative mt-4 flex flex-col items-center justify-center">
          <m.div
            aria-hidden
            animate={
              reduceMotion
                ? undefined
                : {
                    scale: breathMeta.scale,
                    opacity: stressTimer.running ? 0.9 : 0.35,
                  }
            }
            transition={{
              duration:
                breathMeta.kind === "exhale"
                  ? 3.2
                  : breathMeta.kind === "inhale"
                    ? 2.4
                    : 1.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="pointer-events-none absolute h-32 w-56 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(251,113,133,0.28) 0%, rgba(251,113,133,0.06) 52%, transparent 74%)",
            }}
          />
          {stressTimer.running ? (
            <span
              aria-hidden
              className="somna-pulse-ring pointer-events-none absolute h-24 w-44 rounded-full border border-rose-300/24"
            />
          ) : null}

          <div className="relative z-10 font-sans text-[54px] leading-none font-extralight tracking-tight text-white tabular-nums">
            <SubtleNumber value={`${mm}:${ss}`} />
          </div>

          {/* Subtle session progress hairline */}
          {sessionProgress > 0 ? (
            <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-rose-300 to-[#e8ff1f] transition-transform duration-700 ease-linear"
                style={{ transform: `scaleX(${sessionProgress.toFixed(4)})` }}
              />
            </div>
          ) : null}
        </div>

        {/* Live Breathing Cue / Guidance Caption */}
        <div className="mx-auto mt-2 flex min-h-[38px] max-w-[268px] flex-col items-center justify-center text-[11.5px] leading-relaxed">
          <TextStatesSwap
            value={breathMeta.label}
            className={cn(
              stressTimer.running ? "font-medium text-rose-200" : "text-white/55"
            )}
          />
          {stressTimer.running ? (
            <div className="mt-1 w-36">
              <HopArcs
                count={stressTimer.technique === "box" ? 5 : 4}
                active={breathMeta.hopStep}
                accentColor="#fb7185"
                className="h-6"
              />
            </div>
          ) : null}
        </div>

        {/* Plush Squircle -1 мин / +1 мин Pillows (Ref #2) */}
        <div className="mt-3 grid w-full grid-cols-2 gap-3">
          <m.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            transition={SOMNA_SPRINGS.snappy}
            onClick={() => adjustMinutes(-1)}
            className="h-[56px] cursor-pointer rounded-[22px] border border-white/[0.09] bg-[#140c0d]/55 text-[13px] font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-[background-color] duration-[var(--duration-quick)] hover:bg-white/[0.11] motion-reduce:transition-none"
          >
            −1 мин
          </m.button>
          <m.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            transition={SOMNA_SPRINGS.snappy}
            onClick={() => adjustMinutes(1)}
            className="h-[56px] cursor-pointer rounded-[22px] border border-white/[0.09] bg-[#140c0d]/55 text-[13px] font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-[background-color] duration-[var(--duration-quick)] hover:bg-white/[0.11] motion-reduce:transition-none"
          >
            +1 мин
          </m.button>
        </div>

        {/* Curved 140° Radial Intensity Dial (Ref #2 ExposureSlider variant="arc") */}
        <div className="mt-3.5 w-full">
          <ExposureSlider
            variant="arc"
            label="Интенсивность"
            min={1}
            max={10}
            step={1}
            value={stressTimer.intensity}
            accentColor="#fb7185"
            showDomeSteppers
            onChange={handleIntensityChange}
          />
        </div>

        {/* Smooth Grid-Collapsed Sound Mode + Authentic SL UI Library `product-volume` Slider */}
        <div
          aria-hidden={!soundMenuOpen}
          className={cn(
            "mt-1 grid w-full transition-[grid-template-rows,opacity] duration-[var(--duration-medium)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
            soundMenuOpen
              ? "grid-rows-[1fr] opacity-100"
              : "pointer-events-none grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-2.5 pt-1 pb-1.5">
              <div className="flex justify-center">
                <SlidingTabs
                  items={SOUND_OPTIONS}
                  value={stressTimer.sound}
                  onValueChange={(id) => {
                    haptic(5)
                    setStressTimer((prev) => ({ ...prev, sound: id }))
                  }}
                  ariaLabel="Фоновый звук"
                  size="xs"
                />
              </div>
              <SLSoundVolumeSlider
                value={soundVolume}
                onChange={handleVolumeChange}
                ariaLabel="Громкость фона дыхания"
                tone="rose"
              />
            </div>
          </div>
        </div>

        {/* Bottom 3 Frosted Circular Glass Orbs (Ref #2) */}
        <div className="mt-3 flex w-full items-center justify-around px-4">
          <m.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={SOMNA_SPRINGS.snappy}
            onClick={() => {
              haptic(6)
              setSoundMenuOpen((v) => !v)
            }}
            aria-label={`Фоновый звук: ${activeSoundLabel}`}
            title={`Звук: ${activeSoundLabel}`}
            className={cn(
              "relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border backdrop-blur-md transition-[background-color,border-color] duration-[var(--duration-quick)] motion-reduce:transition-none",
              stressTimer.sound !== "off" || soundMenuOpen
                ? "border-rose-300/38 bg-rose-500/[0.22] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                : "border-white/[0.12] bg-white/[0.07] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-white/[0.14]"
            )}
          >
            <IconSwap
              state={stressTimer.sound === "off" ? "a" : "b"}
              iconA={<VolumeX className="h-4.5 w-4.5" />}
              iconB={<Volume2 className="h-4.5 w-4.5 text-rose-100" />}
            />
          </m.button>

          <m.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={SOMNA_SPRINGS.bouncy}
            onClick={() => {
              haptic(10)
              setStressTimer((prev) => ({ ...prev, running: !prev.running }))
            }}
            aria-label={stressTimer.running ? "Пауза" : "Старт"}
            className={cn(
              "flex h-[58px] w-[58px] cursor-pointer items-center justify-center rounded-full border text-white backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-[var(--duration-quick)] motion-reduce:transition-none",
              stressTimer.running
                ? "border-rose-300/45 bg-rose-500/[0.28] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_32px_rgba(251,113,133,0.44)]"
                : "border-white/22 bg-white/[0.12] shadow-[inset_0_-1px_0_rgba(255,255,255,0.26),0_0_24px_rgba(251,113,133,0.24)] hover:bg-white/[0.18]"
            )}
          >
            <IconSwap
              state={stressTimer.running ? "a" : "b"}
              iconA={<Pause className="h-5.5 w-5.5" />}
              iconB={<Play className="ml-0.5 h-5.5 w-5.5" />}
            />
          </m.button>

          <m.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={SOMNA_SPRINGS.snappy}
            onClick={() => {
              haptic(6)
              setStressTimer((prev) => ({
                ...prev,
                running: false,
                remainingSec: prev.totalSec,
              }))
            }}
            aria-label="Сбросить сессию"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.07] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md transition-[background-color] duration-[var(--duration-quick)] hover:bg-white/[0.14] motion-reduce:transition-none"
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </m.button>
        </div>

        {/* Active sound indicator + Session Log Pill */}
        <div className="mt-2.5 flex min-h-[34px] flex-col items-center justify-center gap-1.5">
          <span className="text-[10.5px] text-white/45">
            Звук:{" "}
            <TextStatesSwap value={activeSoundLabel} className="text-white/75" />
            {stressTimer.sound !== "off" ? (
              <span className="ml-1 font-mono text-[10px] text-rose-200/80">
                · {soundVolume}%
              </span>
            ) : null}
          </span>

          {loggedBanner !== null ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/35 bg-emerald-500/[0.16] px-3.5 py-1.5 text-xs font-semibold text-emerald-100 backdrop-blur-md">
              <SuccessCheck show size={16} color="#a7f3d0" />
              <span>Записано +{loggedBanner} мин</span>
            </div>
          ) : elapsedMin > 0 ? (
            <button
              type="button"
              onClick={finishAndLog}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#e8ff1f]/32 bg-[#e8ff1f]/[0.14] px-4 py-1.5 text-xs font-semibold text-[#f2ff78] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-[#e8ff1f]/[0.22] active:scale-[0.98] motion-reduce:transition-none"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Записать +{Math.max(1, Math.round(elapsedMin))} мин</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default PracticesScreen
