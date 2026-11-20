import * as React from "react"
import { m, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Heart,
} from "lucide-react"
import { useIPhoneGlimm } from "@/components/iphone/IPhoneFrame"
import ShinyText from "@/components/ShinyText"
import {
  AnimatedBellRing,
  AnimatedMoonStar,
  AnimatedSparkles,
} from "@/components/animate-ui/icons/somna-animated-icons"
import { Moon as KeylineMoon } from "@/components/icons/duotone/moon"
import { Sun as KeylineSun } from "@/components/icons/duotone/sun"
import { Wind as KeylineWind } from "@/components/icons/wind"
import { AlarmClockCheck } from "@/components/icons/alarm-clock-check"
import { OrbLoader } from "@/components/ui/orb-loader"
import { BedtimeCircularSlider } from "@/components/ui/bedtime-circular-slider"
import { DotMatrix } from "@/components/ui/dot-matrix"
import { GlowCard } from "@/components/ui/glow-card"
import { WordRoll } from "@/components/ui/word-roll"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/controls"
import { Input } from "@/components/ui/tabs"
import {
  SLFocusTopics,
  SLReminderWeekdays,
} from "@/components/ui/sl-product-controls"
import {
  PopNumber,
  StaggerReveal,
  SuccessCheck,
  TextSwapSoft,
} from "@/components/ui/t-motion"
import {
  SOMNA_SPRINGS,
  SOMNA_TRANSITIONS,
  STEP_SLIDE_VARIANTS,
  haptic,
} from "@/lib/motion"
import { formatHmClock, pluralRu } from "@/lib/sleepInsights"
import { getTargetDurationMin } from "@/lib/sleepTime"
import { useSomna } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const TOTAL_STEPS = 4
const REMINDER_TIMES = ["21:30", "22:00", "22:30", "23:00"]

const FOCUS_TOPIC_OPTIONS = [
  "Засыпать быстрее",
  "Стабильный подъём",
  "Снять вечерний стресс",
  "Ясность утром",
  "Баланс эмоций",
  "Дыхание перед сном",
]

const CHRONOTYPE_CARDS: {
  id: "early" | "balanced" | "night"
  title: string
  bed: string
  wake: string
  hint: string
  icon: React.ReactNode
}[] = [
  {
    id: "early",
    title: "Ранний",
    bed: "22:30",
    wake: "06:30",
    hint: "22:30–06:30",
    icon: <KeylineSun size={14} />,
  },
  {
    id: "balanced",
    title: "Баланс",
    bed: "23:30",
    wake: "07:30",
    hint: "23:30–07:30",
    icon: <AlarmClockCheck size={14} />,
  },
  {
    id: "night",
    title: "Поздний",
    bed: "00:30",
    wake: "08:30",
    hint: "00:30–08:30",
    icon: <KeylineMoon size={14} />,
  },
]

const STEP_BACKDROPS = [
  // 0: Thermal Nocturnal Indigo + Soft Ember
  "radial-gradient(84% 52% at 50% 18%, rgba(99, 102, 241, 0.34), rgba(244, 63, 94, 0.08) 46%, rgba(5, 5, 9, 0) 76%)",
  // 1: Superpower Emerald-Lime Warm Glow
  "radial-gradient(86% 50% at 50% 14%, rgba(163, 230, 53, 0.24), rgba(52, 211, 153, 0.16) 44%, rgba(5, 5, 9, 0) 76%)",
  // 2: Deep Sleep Cobalt-Violet
  "radial-gradient(84% 54% at 50% 20%, rgba(79, 70, 229, 0.34), rgba(139, 92, 246, 0.14) 50%, rgba(5, 5, 9, 0) 78%)",
  // 3: Complete Setup Rose-Magenta Glow
  "radial-gradient(88% 52% at 50% 16%, rgba(244, 114, 182, 0.28), rgba(190, 24, 93, 0.14) 48%, rgba(5, 5, 9, 0) 78%)",
] as const

export function OnboardingFlow() {
  const {
    userName,
    setUserName,
    focusGoals,
    setFocusGoals,
    bedtimeGoal,
    wakeGoal,
    setSleepSchedule,
    chronotype,
    setChronotype,
    reminderEnabled,
    setReminderEnabled,
    reminderTime,
    setReminderTime,
    reminderDays,
    setReminderDays,
    eveningDetox,
    setEveningDetox,
    setOnboarded,
  } = useSomna()

  const { playPhoneSweep } = useIPhoneGlimm()
  const reduceMotion = useReducedMotion()
  const nameInputId = React.useId()

  const [step, setStep] = React.useState(0)
  const [dir, setDir] = React.useState<1 | -1>(1)
  const [calibrating, setCalibrating] = React.useState(false)
  const [calStage, setCalStage] = React.useState(0)
  const timersRef = React.useRef<number[]>([])

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  React.useEffect(() => clearTimers, [clearTimers])

  const goStep = (next: number) => {
    haptic(6)
    setDir(next >= step ? 1 : -1)
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)))
  }

  const finishOnboarding = () => {
    haptic(12)
    setCalibrating(true)
    setCalStage(1)
    clearTimers()
    if (reduceMotion) {
      timersRef.current.push(
        window.setTimeout(() => setOnboarded(true), 260)
      )
      return
    }
    timersRef.current.push(
      window.setTimeout(() => setCalStage(2), 360),
      window.setTimeout(() => setCalStage(3), 720),
      window.setTimeout(() => {
        playPhoneSweep({
          change: () => setOnboarded(true),
        })
      }, 1220)
    )
  }

  const targetDurMin = getTargetDurationMin(bedtimeGoal, wakeGoal)

  const activeBackdrop = STEP_BACKDROPS[step] ?? STEP_BACKDROPS[0]

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-x-hidden overflow-y-auto overscroll-contain bg-[#050509] px-5 pt-3 pb-8 text-white no-scrollbar">
      {/* Dynamic Per-Step Ambient OLED Canopy (GPU opacity crossfade) */}
      <AnimatePresence mode="sync">
        <m.div
          key={`onb-bg-${calibrating ? "cal" : step}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.45 }}
          aria-hidden
          className="somna-aura-drift pointer-events-none absolute inset-0"
          style={{ backgroundImage: activeBackdrop }}
        />
      </AnimatePresence>
      <div
        aria-hidden
        className="oled-grain pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
      />

      {/* Top Navigation & Segmented Progress Rail */}
      <div className="relative z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {step > 0 && !calibrating ? (
            <button
              type="button"
              onClick={() => goStep(step - 1)}
              aria-label="Предыдущий шаг"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/14 bg-white/[0.08] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.15] active:scale-95 motion-reduce:transition-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] font-mono text-[10.5px] font-semibold text-[#e8ff1f]">
              {step + 1}/{TOTAL_STEPS}
            </span>
          )}

          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, idx) => (
              <button
                key={idx}
                type="button"
                disabled={calibrating}
                onClick={() => goStep(idx)}
                aria-label={`Перейти к шагу ${idx + 1}`}
                className={cn(
                  "h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                  idx === step
                    ? "w-6 bg-[#e8ff1f] shadow-[0_0_10px_rgba(232,255,31,0.5)]"
                    : idx < step
                      ? "w-2.5 bg-white/75 hover:bg-white"
                      : "w-1.5 bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>
        </div>

        {!calibrating ? (
          <button
            type="button"
            onClick={() => setOnboarded(true)}
            className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium text-white/52 transition-colors duration-[var(--duration-quick)] hover:bg-white/[0.07] hover:text-white motion-reduce:transition-none"
          >
            Пропустить
          </button>
        ) : null}
      </div>

      {/* Main Stage — single persistent AnimatePresence outlives every exiting branch */}
      <AnimatePresence
        mode="wait"
        custom={{ dir, reduced: !!reduceMotion }}
      >
        {calibrating ? (
          <m.div
            key="calibrating"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.modalOpen}
            className="relative z-10 my-auto flex flex-col items-center text-center"
          >
            <div className="relative flex items-center justify-center">
              <span
                aria-hidden
                className="somna-pulse-ring pointer-events-none absolute h-44 w-44 rounded-full border border-indigo-300/25"
              />
              <OrbLoader size={184} speed={1.55} label="Настройка Somna" />
            </div>

            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              <ShinyText
                text="Собираем ваш профиль Somna…"
                color="rgba(255,255,255,0.72)"
                shineColor="#e8ff1f"
                speed={1.9}
                direction="right"
                disabled={!!reduceMotion}
              />
            </h2>

            <div className="mt-4 w-full max-w-[290px] space-y-2 text-left">
              {[
                {
                  id: "window",
                  done: calStage >= 1,
                  text: `Окно сна ${bedtimeGoal}–${wakeGoal} (${formatHmClock(targetDurMin)} ч)`,
                },
                {
                  id: "focus",
                  done: calStage >= 2,
                  text: `Фокус: ${focusGoals.length} ${pluralRu(focusGoals.length, ["цель", "цели", "целей"])} в приоритете`,
                },
                {
                  id: "reminder",
                  done: calStage >= 3,
                  text: reminderEnabled
                    ? `Напоминание в ${reminderTime} (${reminderDays.length} дн./нед)`
                    : "Свободный режим без уведомлений",
                },
              ].map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-xs transition-[background-color,border-color,opacity] duration-[var(--duration-fast)] motion-reduce:transition-none",
                    row.done
                      ? "border-emerald-300/25 bg-emerald-500/[0.1] text-white opacity-100"
                      : "border-white/[0.07] bg-white/[0.03] text-white/45 opacity-60"
                  )}
                >
                  <span className="truncate">{row.text}</span>
                  <SuccessCheck show={row.done} size={16} color="#6ee7b7" />
                </div>
              ))}
            </div>
          </m.div>
        ) : step === 0 ? (
          <m.div
            key="step-0"
            custom={{ dir, reduced: !!reduceMotion }}
            variants={STEP_SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative z-10 my-auto flex flex-col items-center text-center"
          >
            <div className="relative flex items-center justify-center">
              <span
                aria-hidden
                className="somna-pulse-ring pointer-events-none absolute h-44 w-44 rounded-full border border-indigo-300/20"
              />
              <span
                aria-hidden
                className="somna-pulse-ring-delayed pointer-events-none absolute h-52 w-52 rounded-full border border-white/10"
              />
              <OrbLoader size={184} speed={1.05} label="Somna Thermal Orb" />
            </div>

            <StaggerReveal index={0}>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.07] px-3 py-1 text-[11px] font-medium text-indigo-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md">
                <AnimatedSparkles size={12} className="text-[#e8ff1f]" />
                <ShinyText
                  text="Somna · Сон и ментальный баланс"
                  color="rgba(224,231,255,0.88)"
                  shineColor="#e8ff1f"
                  speed={3.2}
                  delay={1.4}
                  direction="right"
                  disabled={!!reduceMotion}
                />
              </div>
            </StaggerReveal>

            <StaggerReveal index={1}>
              <div className="mt-3 text-[22px] font-bold tracking-tight">
                <WordRoll
                  lead="Создано для"
                  words={[
                    "ровного сна",
                    "ясного утра",
                    "учёта эмоций",
                    "тихого вечера",
                  ]}
                  intervalSec={2.4}
                  leadClassName="text-white/55"
                  accentClassName="text-white"
                />
              </div>
            </StaggerReveal>

            <StaggerReveal index={2}>
              <p className="mt-2 max-w-[295px] text-xs leading-relaxed text-white/60">
                Только честные данные: время сна, утренняя бодрость, чек-ины состояния и дыхательные паузы.
              </p>
            </StaggerReveal>

            <StaggerReveal index={3} className="mt-3.5 w-full">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <KeylineMoon size={14} className="text-indigo-300" />, label: "Ритм сна" },
                  { icon: <Heart className="h-3.5 w-3.5 text-rose-300" />, label: "Чек-ины" },
                  { icon: <KeylineWind size={14} className="text-[#e8ff1f]" />, label: "Практики" },
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className="flex flex-col items-center gap-1 rounded-[16px] border border-white/10 bg-white/[0.045] px-2 py-2.5 text-[10.5px] font-medium text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  >
                    {pill.icon}
                    <span>{pill.label}</span>
                  </div>
                ))}
              </div>
            </StaggerReveal>

            <StaggerReveal index={4} className="mt-4 w-full text-left">
              <label
                htmlFor={nameInputId}
                className="ml-1 text-[11px] font-medium text-white/55"
              >
                Как к вам обращаться?
              </label>
              <Input
                id={nameInputId}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Ваше имя"
                className="mt-1.5 text-center font-medium"
              />
            </StaggerReveal>
          </m.div>
        ) : step === 1 ? (
          <m.div
            key="step-1"
            custom={{ dir, reduced: !!reduceMotion }}
            variants={STEP_SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative z-10 my-auto space-y-4"
          >
            <StaggerReveal index={0}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#e8ff1f]">
                  Шаг 2 — Приоритеты
                </span>
                <span className="rounded-full border border-[#e8ff1f]/28 bg-[#e8ff1f]/[0.12] px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-[#f3ff82]">
                  <PopNumber value={focusGoals.length} /> выбрано
                </span>
              </div>
              <h2 className="mt-1.5 text-[22px] leading-tight font-semibold tracking-tight">
                Над чем работаем в первую очередь?
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-white/58">
                Выберите 1–3 направления — под них подстроим советы CBT-I и еженедельные итоги.
              </p>
            </StaggerReveal>

            <GlowCard
              theme="emerald-lime"
              coreOpacity={0.9}
              className="rounded-[28px]"
              contentClassName="space-y-4 p-4"
            >
              <SLFocusTopics
                options={FOCUS_TOPIC_OPTIONS}
                selected={focusGoals}
                onChange={setFocusGoals}
                ariaLabel="Цели сна и состояния"
                tone="lime"
              />

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/35 px-3.5 py-2.5 text-[11px] text-white/75">
                <span>Персональный фокус</span>
                <span className="max-w-[175px] truncate font-medium text-[#e8ff1f]">
                  <TextSwapSoft
                    value={focusGoals[0] ?? "Свободный режим"}
                    align="end"
                  />
                </span>
              </div>
            </GlowCard>
          </m.div>
        ) : step === 2 ? (
          <m.div
            key="step-2"
            custom={{ dir, reduced: !!reduceMotion }}
            variants={STEP_SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative z-10 my-auto space-y-3"
          >
            <StaggerReveal index={0}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-300">
                  Шаг 3 — Режим сна
                </span>
                <div className="flex items-baseline gap-1 rounded-full border border-indigo-300/25 bg-indigo-500/15 px-2.5 py-1">
                  <DotMatrix value={formatHmClock(targetDurMin)} size="xs" />
                  <span className="font-mono text-[9.5px] text-indigo-200">ч</span>
                </div>
              </div>
              <h2 className="mt-1 text-[21px] font-semibold tracking-tight">
                Желаемое окно сна
              </h2>
              <p className="mt-0.5 text-xs text-white/58">
                Потяните 🌙 отбой и ☀️ подъём по кругу или выберите хронотип ниже
              </p>
            </StaggerReveal>

            <GlowCard
              theme="cobalt-indigo"
              coreOpacity={0.9}
              className="rounded-[28px]"
              contentClassName="p-3"
            >
              <BedtimeCircularSlider
                bedtime={bedtimeGoal}
                wakeTime={wakeGoal}
                onChange={setSleepSchedule}
                size={198}
              />
            </GlowCard>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {CHRONOTYPE_CARDS.map((card) => {
                const active = chronotype === card.id
                return (
                  <m.button
                    key={card.id}
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                    transition={SOMNA_SPRINGS.snappy}
                    onClick={() => {
                      haptic(6)
                      setChronotype(card.id)
                      setSleepSchedule(card.bed, card.wake)
                    }}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-1 rounded-[18px] border px-2 py-2.5 text-center transition-[background-color,border-color,color] duration-[var(--duration-quick)] motion-reduce:transition-none",
                      active
                        ? "border-[#e8ff1f]/45 bg-[#e8ff1f]/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                        : "border-white/10 bg-white/[0.045] text-white/70 hover:bg-white/[0.09]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full",
                        active
                          ? "bg-[#e8ff1f]/20 text-[#e8ff1f]"
                          : "bg-white/10 text-white/65"
                      )}
                    >
                      {card.icon}
                    </span>
                    <span className="text-[11.5px] font-semibold">
                      {card.title}
                    </span>
                    <span className="font-mono text-[9.5px] text-white/55">
                      {card.hint}
                    </span>
                  </m.button>
                )
              })}
            </div>
          </m.div>
        ) : (
          <m.div
            key="step-3"
            custom={{ dir, reduced: !!reduceMotion }}
            variants={STEP_SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative z-10 my-auto space-y-3"
          >
            <StaggerReveal index={0}>
              <span className="text-xs font-medium text-pink-300">
                Шаг 4 — Завершение настройки
              </span>
              <h2 className="mt-1 text-[21px] font-semibold tracking-tight">
                Вечерние ритуалы и сигнал
              </h2>
            </StaggerReveal>

            {/* Pink-Magenta Reminder Dome + SL UI Weekdays */}
            <GlowCard
              theme="crimson-rose"
              coreOpacity={0.86}
              className="rounded-[28px]"
              contentClassName="space-y-3 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <AnimatedBellRing
                    size={16}
                    trigger={reminderEnabled}
                    className="text-pink-200"
                  />
                  <span>Напоминание</span>
                </div>
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={(v) => {
                    haptic(6)
                    setReminderEnabled(v)
                  }}
                  labelOn="Вкл"
                  labelOff="Выкл"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="relative flex h-13 w-13 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 56 56" className="h-13 w-13">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const a = (i / 14) * Math.PI * 2 - Math.PI / 2
                      return (
                        <circle
                          key={i}
                          cx={(28 + Math.cos(a) * 20).toFixed(1)}
                          cy={(28 + Math.sin(a) * 20).toFixed(1)}
                          r={reminderEnabled ? 1.8 : 1.25}
                          fill={
                            reminderEnabled
                              ? "rgba(255,255,255,0.9)"
                              : "rgba(255,255,255,0.3)"
                          }
                        />
                      )
                    })}
                  </svg>
                  <AnimatedBellRing
                    size={16}
                    trigger={reminderEnabled}
                    className={cn(
                      "absolute transition-opacity duration-[var(--duration-quick)] motion-reduce:transition-none",
                      reminderEnabled
                        ? "text-pink-100 opacity-100"
                        : "text-white/40 opacity-60"
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white">
                    Время вечернего чек-ина
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {REMINDER_TIMES.map((t) => {
                      const active = reminderTime === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            haptic(5)
                            setReminderTime(t)
                          }}
                          className={cn(
                            "cursor-pointer rounded-full border px-2 py-0.5 font-mono text-[10px] transition-[background-color,border-color,color,transform] duration-[var(--duration-quick)] active:scale-[0.97] motion-reduce:transition-none",
                            active
                              ? "border-pink-200/50 bg-white/[0.22] font-semibold text-white"
                              : "border-white/12 bg-white/[0.06] text-white/65 hover:bg-white/[0.12]"
                          )}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Authentic SL UI Library `product-weekdays` */}
              <div
                className={cn(
                  "border-t border-white/10 pt-2.5 transition-opacity duration-[var(--duration-fast)]",
                  reminderEnabled ? "opacity-100" : "pointer-events-none opacity-45"
                )}
              >
                <SLReminderWeekdays
                  days={reminderDays}
                  onChange={setReminderDays}
                  ariaLabel="Дни вечернего напоминания"
                  tone="rose"
                />
              </div>
            </GlowCard>

            {/* Veri Radial Tick Dial Detox Toggle */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                haptic(8)
                setEveningDetox(!eveningDetox)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setEveningDetox(!eveningDetox)
                }
              }}
              className="relative flex cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-[26px] border border-emerald-200/18 p-3.5 transition-[border-color,transform] duration-[var(--duration-quick)] active:scale-[0.985] motion-reduce:transition-none"
              style={{
                background:
                  "radial-gradient(88% 72% at 15% 15%, rgba(110, 231, 183, 0.24), rgba(10, 18, 22, 0.88) 65%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-13 w-13 shrink-0 items-center justify-center">
                  <svg
                    viewBox="0 0 56 56"
                    className={cn("h-13 w-13", eveningDetox && "somna-dial-sweep")}
                  >
                    {Array.from({ length: 32 }).map((_, i) => {
                      const a = (i / 32) * Math.PI * 2 - Math.PI / 2
                      const isBurst = eveningDetox && i >= 14 && i <= 18
                      const r1 = 17
                      const r2 = isBurst ? 25.5 : 22
                      return (
                        <line
                          key={i}
                          x1={(28 + Math.cos(a) * r1).toFixed(1)}
                          y1={(28 + Math.sin(a) * r1).toFixed(1)}
                          x2={(28 + Math.cos(a) * r2).toFixed(1)}
                          y2={(28 + Math.sin(a) * r2).toFixed(1)}
                          stroke={
                            isBurst
                              ? "#e8ff1f"
                              : eveningDetox
                                ? "rgba(255,255,255,0.72)"
                                : "rgba(255,255,255,0.28)"
                          }
                          strokeWidth={isBurst ? 1.8 : 1.1}
                          strokeLinecap="round"
                        />
                      )
                    })}
                    <circle
                      cx="28"
                      cy="28"
                      r="11"
                      fill="rgba(255,255,255,0.12)"
                      stroke="rgba(255,255,255,0.24)"
                      strokeWidth="1"
                    />
                  </svg>
                  <AnimatedMoonStar
                    size={15}
                    trigger={eveningDetox}
                    className="absolute text-emerald-100"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">
                    Вечерний детокс экрана
                  </div>
                  <div className="text-[11px] text-white/70">
                    {eveningDetox
                      ? `Таймер тишины к отбою ${bedtimeGoal}`
                      : "Включить мягкий режим без экрана"}
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-[background-color,border-color] duration-[var(--duration-quick)] motion-reduce:transition-none",
                  eveningDetox
                    ? "border-[#e8ff1f]/40 bg-[#e8ff1f]/20 text-[#e8ff1f]"
                    : "border-white/15 bg-white/10 text-white/60"
                )}
              >
                {eveningDetox ? (
                  <SuccessCheck show size={15} color="#e8ff1f" />
                ) : (
                  <AnimatedSparkles size={14} />
                )}
              </span>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Bottom CTA */}
      {!calibrating ? (
        <div className="relative z-20 pt-3">
          <Button
            size="lg"
            variant="white"
            onClick={() => {
              if (step < TOTAL_STEPS - 1) goStep(step + 1)
              else finishOnboarding()
            }}
            className="w-full shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
          >
            <span>
              <TextSwapSoft
                value={step < TOTAL_STEPS - 1 ? "Продолжить" : "Открыть Somna"}
              />
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default OnboardingFlow
