import * as React from "react"
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
import {
  IconSwap,
  SlidingTabs,
  SubtleNumber,
  SuccessCheck,
  TextStatesSwap,
} from "@/components/ui/t-motion"
import { setSoundVolume, type SoundMode } from "@/lib/audioEngine"
import { useSomna, type StressTimerState } from "@/store/useSomnaStore"
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
    stressTimer,
    setStressTimer,
    breathMinutes,
    addBreathMinutes,
    setActiveTab,
  } = useSomna()

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

  // Synchronized breathing cue per technique (`stress` 4-4-6 = 14s, `478` = 19s, `box` 4-4-4-4 = 16s)
  const breathPhase = React.useMemo(() => {
    if (!stressTimer.running) {
      return "При напряжении попробуйте 4 минуты. При сильном стрессе — 6 минут."
    }
    const elapsed = stressTimer.totalSec - stressTimer.remainingSec
    if (stressTimer.technique === "478") {
      const m = elapsed % 19
      if (m < 4) return "Вдох носом · 4 сек"
      if (m < 11) return "Задержка · 7 сек"
      return "Плавный выдох · 8 сек"
    }
    if (stressTimer.technique === "box") {
      const m = elapsed % 16
      if (m < 4) return "Вдох · 4 сек"
      if (m < 8) return "Пауза на вдохе · 4 сек"
      if (m < 12) return "Выдох · 4 сек"
      return "Пауза на выдохе · 4 сек"
    }
    const m = elapsed % 14
    if (m < 4) return "Глубокий вдох · 4 сек"
    if (m < 8) return "Спокойная пауза · 4 сек"
    return "Длинный выдох · 6 сек"
  }, [
    stressTimer.running,
    stressTimer.remainingSec,
    stressTimer.totalSec,
    stressTimer.technique,
  ])

  const mm = String(Math.floor(stressTimer.remainingSec / 60)).padStart(2, "0")
  const ss = String(stressTimer.remainingSec % 60).padStart(2, "0")
  const elapsedMin = +((stressTimer.totalSec - stressTimer.remainingSec) / 60).toFixed(1)

  const adjustMinutes = (deltaMin: number) => {
    setStressTimer((prev) => {
      const nextTotal = Math.max(60, Math.min(900, prev.totalSec + deltaMin * 60))
      const nextRem = Math.max(30, Math.min(nextTotal, prev.remainingSec + deltaMin * 60))
      return { ...prev, totalSec: nextTotal, remainingSec: nextRem }
    })
  }

  const handleIntensityChange = (val: number) => {
    setStressTimer((prev) => ({ ...prev, intensity: val }))
    setSoundVolume(0.12 + val * 0.06)
  }

  const finishAndLog = () => {
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
        className="pointer-events-none absolute inset-0 transition-opacity duration-[var(--duration-medium)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none"
        style={{
          backgroundImage: `radial-gradient(84% 42% at 50% 62%, rgba(218, 92, 84, ${bloomAlpha}), rgba(5, 3, 4, 0) 74%)`,
        }}
      />

      {/* Symmetrical 3-slot Stress 04:00 Top Bar (Ref #2) */}
      <header className="relative z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveTab("home")}
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
        <SlidingTabs
          items={TECHNIQUE_TABS}
          value={stressTimer.technique}
          onValueChange={(id) =>
            setStressTimer((prev) => ({ ...prev, technique: id }))
          }
          ariaLabel="Схема дыхания"
          size="xs"
        />

        {/* Giant Tabular Timer Readout */}
        <div className="mt-4 font-sans text-[54px] leading-none font-extralight tracking-tight text-white tabular-nums">
          <SubtleNumber value={`${mm}:${ss}`} />
        </div>

        {/* Live Breathing Cue / Guidance Caption */}
        <div className="mx-auto mt-2.5 flex min-h-[38px] max-w-[264px] items-center justify-center text-[11.5px] leading-relaxed">
          <TextStatesSwap
            value={breathPhase}
            className={cn(
              stressTimer.running ? "font-medium text-rose-200" : "text-white/55"
            )}
          />
        </div>

        {/* Plush Squircle -1 мин / +1 мин Pillows (Ref #2) */}
        <div className="mt-3.5 grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => adjustMinutes(-1)}
            className="h-[58px] cursor-pointer rounded-[22px] border border-white/[0.09] bg-[#140c0d]/55 text-[13px] font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.11] active:scale-[0.97] motion-reduce:transition-none"
          >
            −1 мин
          </button>
          <button
            type="button"
            onClick={() => adjustMinutes(1)}
            className="h-[58px] cursor-pointer rounded-[22px] border border-white/[0.09] bg-[#140c0d]/55 text-[13px] font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.11] active:scale-[0.97] motion-reduce:transition-none"
          >
            +1 мин
          </button>
        </div>

        {/* Curved 140° Radial Intensity Dial (Ref #2 ExposureSlider variant="arc") */}
        <div className="mt-4 w-full">
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

        {/* Smooth Grid-Collapsed Sound Palette Pills */}
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
            <div className="flex justify-center pt-1 pb-1">
              <SlidingTabs
                items={SOUND_OPTIONS}
                value={stressTimer.sound}
                onValueChange={(id) =>
                  setStressTimer((prev) => ({ ...prev, sound: id }))
                }
                ariaLabel="Фоновый звук"
                size="xs"
              />
            </div>
          </div>
        </div>

        {/* Bottom 3 Frosted Circular Glass Orbs (Ref #2) */}
        <div className="mt-3 flex w-full items-center justify-around px-4">
          <button
            type="button"
            onClick={() => setSoundMenuOpen((v) => !v)}
            aria-label={`Фоновый звук: ${activeSoundLabel}`}
            title={`Звук: ${activeSoundLabel}`}
            className={cn(
              "relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border backdrop-blur-md transition-[background-color,border-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-95 motion-reduce:transition-none",
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
          </button>

          <button
            type="button"
            onClick={() =>
              setStressTimer((prev) => ({ ...prev, running: !prev.running }))
            }
            aria-label={stressTimer.running ? "Пауза" : "Старт"}
            className={cn(
              "flex h-[58px] w-[58px] cursor-pointer items-center justify-center rounded-full border text-white backdrop-blur-md transition-[background-color,border-color,box-shadow,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-95 motion-reduce:transition-none",
              stressTimer.running
                ? "border-rose-300/45 bg-rose-500/[0.28] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_32px_rgba(251,113,133,0.42)]"
                : "border-white/22 bg-white/[0.12] shadow-[inset_0_-1px_0_rgba(255,255,255,0.26),0_0_24px_rgba(251,113,133,0.24)] hover:bg-white/[0.18]"
            )}
          >
            <IconSwap
              state={stressTimer.running ? "a" : "b"}
              iconA={<Pause className="h-5.5 w-5.5" />}
              iconB={<Play className="ml-0.5 h-5.5 w-5.5" />}
            />
          </button>

          <button
            type="button"
            onClick={() =>
              setStressTimer((prev) => ({
                ...prev,
                running: false,
                remainingSec: prev.totalSec,
              }))
            }
            aria-label="Сбросить сессию"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.07] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.14] active:scale-95 motion-reduce:transition-none"
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Active sound indicator + Session Log Pill */}
        <div className="mt-2.5 flex min-h-[34px] flex-col items-center justify-center gap-1.5">
          <span className="text-[10.5px] text-white/45">
            Звук: <TextStatesSwap value={activeSoundLabel} className="text-white/75" />
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
