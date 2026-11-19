import * as React from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, Bell, Moon, Sparkles } from "lucide-react"
import { useIPhoneGlimm } from "@/components/iphone/IPhoneFrame"
import { OrbLoader } from "@/components/ui/orb-loader"
import { SpectrumGraph } from "@/components/ui/spectrum-graph"
import { BedtimeCircularSlider } from "@/components/ui/bedtime-circular-slider"
import { GlowCard } from "@/components/ui/glow-card"
import { WordRoll } from "@/components/ui/word-roll"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/controls"
import { ToggleGroup, ToggleGroupItem, Input } from "@/components/ui/tabs"
import { StaggerReveal, SuccessCheck } from "@/components/ui/t-motion"
import { MOTION_TOKENS, SOMNA_TRANSITIONS } from "@/lib/motion"
import { useSomna } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const REMINDER_TIMES = ["21:30", "22:00", "22:30", "23:00"]

const CHRONOTYPE_PRESETS: Record<
  "early" | "balanced" | "night",
  { bed: string; wake: string; label: string }
> = {
  early: { bed: "22:30", wake: "06:30", label: "22:30–06:30" },
  balanced: { bed: "23:30", wake: "07:30", label: "23:30–07:30" },
  night: { bed: "00:30", wake: "08:30", label: "00:30–08:30" },
}

export function OnboardingFlow() {
  const {
    userName,
    setUserName,
    spectrum,
    updateSpectrumAxis,
    bedtimeGoal,
    wakeGoal,
    setSleepSchedule,
    chronotype,
    setChronotype,
    reminderEnabled,
    setReminderEnabled,
    reminderTime,
    setReminderTime,
    eveningDetox,
    setEveningDetox,
    setOnboarded,
  } = useSomna()

  const { playPhoneSweep } = useIPhoneGlimm()
  const reduceMotion = useReducedMotion()

  const [step, setStep] = React.useState(0)
  const [dir, setDir] = React.useState<1 | -1>(1)
  const [calibrating, setCalibrating] = React.useState(false)
  const finishTimerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current)
      }
    }
  }, [])

  const goStep = (next: number) => {
    setDir(next >= step ? 1 : -1)
    setStep(next)
  }

  const finishOnboarding = () => {
    setCalibrating(true)
    finishTimerRef.current = window.setTimeout(() => {
      playPhoneSweep({
        change: () => setOnboarded(true),
      })
    }, 1050)
  }

  const preset = CHRONOTYPE_PRESETS[chronotype]
  const stepTransition = reduceMotion ? { duration: 0 } : SOMNA_TRANSITIONS.pageSlide
  const slideOffset = reduceMotion ? 0 : MOTION_TOKENS.distances.base

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto bg-[#050509] px-5 pt-4 pb-8 text-white no-scrollbar">
      {/* Top Back button + Progress dots + Instant Skip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {step > 0 && !calibrating ? (
            <button
              type="button"
              onClick={() => goStep(step - 1)}
              aria-label="Предыдущий шаг"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/14 bg-white/[0.08] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.15] active:scale-95 motion-reduce:transition-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          ) : null}

          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((idx) => (
              <span
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                  idx === step
                    ? "w-6 bg-[#e8ff1f]"
                    : idx < step
                      ? "w-2.5 bg-white/75"
                      : "w-1.5 bg-white/20"
                )}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOnboarded(true)}
          className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium text-white/50 transition-colors duration-[var(--duration-quick)] hover:bg-white/[0.06] hover:text-white motion-reduce:transition-none"
        >
          Пропустить
        </button>
      </div>

      {calibrating ? (
        <div className="my-auto flex flex-col items-center text-center">
          <OrbLoader size={186} speed={1.5} label="Сохранение" />
          <h2
            data-text="Сохраняем ваши цели…"
            className="t-shimmer mt-2 text-lg font-semibold"
          >
            Сохраняем ваши цели…
          </h2>
          <p className="mt-1 max-w-[250px] text-xs text-white/55">
            Настраиваем расписание {bedtimeGoal}–{wakeGoal} и стартовый набор виджетов
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait" custom={dir}>
          {step === 0 && (
            <motion.div
              key="step-0"
              custom={dir}
              initial={{ opacity: 0, x: dir * slideOffset }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -slideOffset }}
              transition={stepTransition}
              className="my-auto flex flex-col items-center text-center"
            >
              <OrbLoader size={178} speed={1} label="Somna Orb" />
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] text-indigo-200">
                <Sparkles className="h-3 w-3 text-[#e8ff1f]" />
                <span>Somna · Осознанный сон</span>
              </div>

              <div className="mt-3 text-[21px] font-bold tracking-tight">
                <WordRoll
                  lead="Создано для"
                  words={[
                    "режима сна",
                    "ясного утра",
                    "учёта эмоций",
                    "спокойного дыхания",
                  ]}
                  intervalSec={2.4}
                  leadClassName="text-white/55"
                  accentClassName="text-white"
                />
              </div>

              <p className="mt-2 text-xs leading-relaxed text-white/55">
                Честный трекер времени сна, утреннего самочувствия, чек-инов настроения и дыхательных практик.
              </p>

              <div className="mt-5 w-full text-left">
                <label className="text-[11px] font-medium text-white/55">
                  Как к вам обращаться?
                </label>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ваше имя"
                  className="mt-1.5 text-center font-medium"
                />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              custom={dir}
              initial={{ opacity: 0, x: dir * slideOffset }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -slideOffset }}
              transition={stepTransition}
              className="my-auto space-y-3"
            >
              <StaggerReveal index={0}>
                <span className="text-[11px] font-semibold tracking-wider text-sky-400 uppercase">
                  Шаг 2 · Ваше текущее состояние
                </span>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Отметьте исходные ощущения
                </h2>
                <p className="mt-1 text-xs text-white/55">
                  Двигайте точки по шкалам — позже сможете сравнивать изменения
                </p>
              </StaggerReveal>

              <div className="rounded-[26px] border border-white/10 bg-white/[0.03] px-2 py-3">
                <SpectrumGraph
                  axes={spectrum}
                  interactive
                  onChangeAxis={(id, val) => updateSpectrumAxis(id, val, true)}
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              custom={dir}
              initial={{ opacity: 0, x: dir * slideOffset }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -slideOffset }}
              transition={stepTransition}
              className="my-auto space-y-3"
            >
              <StaggerReveal index={0}>
                <span className="text-[11px] font-semibold tracking-wider text-[#e8ff1f] uppercase">
                  Шаг 3 · Целевое расписание
                </span>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Желаемое окно сна
                </h2>
                <p className="mt-0.5 text-xs text-white/55">
                  Перетащите иконки 🌙 отбоя и ☀️ подъёма по кругу
                </p>
              </StaggerReveal>

              <BedtimeCircularSlider
                bedtime={bedtimeGoal}
                wakeTime={wakeGoal}
                onChange={setSleepSchedule}
                size={210}
              />

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-white/55">
                    Привычный ритм
                  </span>
                  <button
                    type="button"
                    onClick={() => setSleepSchedule(preset.bed, preset.wake)}
                    className="cursor-pointer rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-0.5 font-mono text-[10px] text-[#e8ff1f] transition-colors duration-[var(--duration-quick)] hover:bg-white/[0.12] motion-reduce:transition-none"
                  >
                    Применить {preset.label}
                  </button>
                </div>
                <ToggleGroup
                  type="single"
                  value={chronotype}
                  onValueChange={(v) =>
                    v && setChronotype(v as "early" | "balanced" | "night")
                  }
                  className="grid w-full grid-cols-3"
                >
                  <ToggleGroupItem value="early">Ранний</ToggleGroupItem>
                  <ToggleGroupItem value="balanced">Обычный</ToggleGroupItem>
                  <ToggleGroupItem value="night">Поздний</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              custom={dir}
              initial={{ opacity: 0, x: dir * slideOffset }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -slideOffset }}
              transition={stepTransition}
              className="my-auto space-y-3"
            >
              <StaggerReveal index={0}>
                <span className="text-[11px] font-semibold tracking-wider text-pink-300 uppercase">
                  Шаг 4 · Завершение настройки
                </span>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Вечерние ритуалы без лишнего
                </h2>
              </StaggerReveal>

              {/* Ref #3 (`70a5f7d5.jpg`) Pink-Magenta Reminder Dome + Dotted Ring Core + Inline Switch */}
              <GlowCard
                theme="crimson-rose"
                coreOpacity={0.86}
                className="rounded-[30px]"
                contentClassName="space-y-3 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Bell className="h-4 w-4 text-pink-200" />
                    <span>Напоминание</span>
                  </div>
                  <Switch
                    checked={reminderEnabled}
                    onCheckedChange={setReminderEnabled}
                    labelOn="Вкл"
                    labelOff="Выкл"
                  />
                </div>

                {/* Radial dotted ring motif inside dark hollow core */}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 56 56" className="h-14 w-14">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const a = (i / 14) * Math.PI * 2 - Math.PI / 2
                        const cx = 28 + Math.cos(a) * 20
                        const cy = 28 + Math.sin(a) * 20
                        return (
                          <circle
                            key={i}
                            cx={cx.toFixed(1)}
                            cy={cy.toFixed(1)}
                            r={reminderEnabled ? 1.8 : 1.3}
                            fill={
                              reminderEnabled
                                ? "rgba(255,255,255,0.88)"
                                : "rgba(255,255,255,0.34)"
                            }
                          />
                        )
                      })}
                    </svg>
                    <Bell
                      className={cn(
                        "absolute h-4.5 w-4.5 transition-opacity duration-[var(--duration-quick)] motion-reduce:transition-none",
                        reminderEnabled ? "text-pink-100 opacity-100" : "text-white/40 opacity-60"
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-white">
                      Вечерний чек-ин эмоций
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/65">
                      {reminderEnabled
                        ? `Мягкий сигнал в ${reminderTime}`
                        : "Уведомления отключены"}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {REMINDER_TIMES.map((t) => {
                        const active = reminderTime === t
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setReminderTime(t)}
                            className={cn(
                              "cursor-pointer rounded-full border px-2 py-0.5 font-mono text-[10px] transition-[background-color,border-color,color] duration-[var(--duration-quick)] motion-reduce:transition-none",
                              active
                                ? "border-pink-200/45 bg-white/[0.2] font-semibold text-white"
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
              </GlowCard>

              {/* Veri-inspired Concentric Radial Tick Dial for Honest Bedtime Detox Timer */}
              <GlowCard
                theme="cobalt-indigo"
                coreOpacity={0.86}
                className="rounded-[30px]"
                contentClassName="p-4"
              >
                <div
                  onClick={() => setEveningDetox(!eveningDetox)}
                  className="flex cursor-pointer items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-13 w-13 shrink-0 items-center justify-center">
                      <svg viewBox="0 0 56 56" className="h-13 w-13">
                        {Array.from({ length: 32 }).map((_, i) => {
                          const a = (i / 32) * Math.PI * 2 - Math.PI / 2
                          const isBottomBurst = eveningDetox && i >= 14 && i <= 18
                          const r1 = 17
                          const r2 = isBottomBurst ? 25.5 : 22
                          return (
                            <line
                              key={i}
                              x1={(28 + Math.cos(a) * r1).toFixed(1)}
                              y1={(28 + Math.sin(a) * r1).toFixed(1)}
                              x2={(28 + Math.cos(a) * r2).toFixed(1)}
                              y2={(28 + Math.sin(a) * r2).toFixed(1)}
                              stroke={
                                isBottomBurst
                                  ? "#e8ff1f"
                                  : eveningDetox
                                    ? "rgba(255,255,255,0.68)"
                                    : "rgba(255,255,255,0.28)"
                              }
                              strokeWidth={isBottomBurst ? 1.8 : 1.1}
                              strokeLinecap="round"
                            />
                          )
                        })}
                        <circle
                          cx="28"
                          cy="28"
                          r="11"
                          fill="rgba(255,255,255,0.12)"
                          stroke="rgba(255,255,255,0.22)"
                          strokeWidth="1"
                        />
                      </svg>
                      <Moon className="absolute h-3.5 w-3.5 text-indigo-100" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        Вечерний детокс экрана
                      </div>
                      <div className="text-[11px] text-white/70">
                        {eveningDetox
                          ? `Таймер тишины привязан к отбою ${bedtimeGoal}`
                          : "Нажмите, чтобы включить ритм без экранов"}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-[background-color,border-color] duration-[var(--duration-quick)] motion-reduce:transition-none",
                      eveningDetox
                        ? "border-emerald-300/35 bg-emerald-400/20 text-emerald-200"
                        : "border-white/15 bg-white/10 text-white/60"
                    )}
                  >
                    {eveningDetox ? (
                      <SuccessCheck show size={15} color="#a7f3d0" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </span>
                </div>
              </GlowCard>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {!calibrating ? (
        <div className="pt-3">
          <Button
            size="lg"
            variant="white"
            onClick={() => {
              if (step < 3) goStep(step + 1)
              else finishOnboarding()
            }}
            className="w-full"
          >
            <span>{step < 3 ? "Далее" : "Открыть Somna"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default OnboardingFlow
