import * as React from "react"
import { m, AnimatePresence, useReducedMotion } from "framer-motion"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { StateOfMindOrb } from "@/components/ui/state-of-mind-orb"
import { getValenceLabel, sampleValencePalette } from "@/lib/valence"
import { WordRoll } from "@/components/ui/word-roll"
import { Slider } from "@/components/ui/controls"
import { Textarea } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { SLFocusTopics } from "@/components/ui/sl-product-controls"
import { StaggerReveal } from "@/components/ui/t-motion"
import { STEP_SLIDE_VARIANTS, haptic } from "@/lib/motion"
import { useSomna } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const POSITIVE_EMOTIONS = [
  "Умиротворение",
  "Лёгкость",
  "Благодарность",
  "Ясность",
  "Тепло",
  "Вдохновение",
  "Уверенность",
  "Уют",
]

const NEGATIVE_EMOTIONS = [
  "Тревога",
  "Усталость",
  "Напряжение",
  "Перегруз",
  "Раздражение",
  "Рассеянность",
  "Грусть",
  "Выгорание",
]

const FACTORS = [
  "Сон",
  "Работа",
  "Отдых",
  "Прогулка",
  "Семья",
  "Спорт",
  "Кофеин",
  "Погода",
]

export function MoodCheckInDrawer() {
  const { moodDrawerOpen, setMoodDrawerOpen, addMoodEntry } = useSomna()
  const reduceMotion = useReducedMotion()
  const noteInputId = React.useId()

  const [step, setStep] = React.useState(0) // 0: orb slider, 1: emotions, 2: factors, 3: Записано
  const [dir, setDir] = React.useState<1 | -1>(1)
  const [valence, setValence] = React.useState(0.42)
  const [selectedEmotions, setSelectedEmotions] = React.useState<string[]>([
    "Умиротворение",
  ])
  const [selectedFactors, setSelectedFactors] = React.useState<string[]>(["Сон"])
  const [note, setNote] = React.useState("")

  const closeTimerRef = React.useRef<number | null>(null)

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (moodDrawerOpen) {
      clearCloseTimer()
      setStep(0)
      setDir(1)
      setValence(0.42)
      setSelectedEmotions(["Умиротворение"])
      setSelectedFactors(["Сон"])
      setNote("")
    } else {
      clearCloseTimer()
    }
  }, [moodDrawerOpen, clearCloseTimer])

  React.useEffect(() => {
    return () => clearCloseTimer()
  }, [clearCloseTimer])

  const label = getValenceLabel(valence)
  const pal = sampleValencePalette(valence)
  const emotionPool = valence >= -0.05 ? POSITIVE_EMOTIONS : NEGATIVE_EMOTIONS

  // Prune opposite-polarity emotions automatically when crossing neutral threshold
  const handleValenceChange = (nextVal: number) => {
    setValence(nextVal)
    const nextPoolSet = new Set(
      nextVal >= -0.05 ? POSITIVE_EMOTIONS : NEGATIVE_EMOTIONS
    )
    setSelectedEmotions((prev) => prev.filter((em) => nextPoolSet.has(em)))
  }

  const goStep = (next: number) => {
    haptic(6)
    setDir(next >= step ? 1 : -1)
    setStep(next)
  }

  const handleSave = () => {
    haptic(12)
    addMoodEntry({
      valence,
      label,
      emotions: selectedEmotions.length ? selectedEmotions : [label],
      factors: selectedFactors,
      note: note.trim() || undefined,
    })
    setDir(1)
    setStep(3)
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setMoodDrawerOpen(false)
    }, 1850)
  }

  const orbSize = step === 0 ? 196 : step === 1 ? 104 : step === 2 ? 78 : 196
  const accentColor = `rgb(${pal.mid[0]}, ${pal.mid[1]}, ${pal.mid[2]})`

  return (
    <Drawer open={moodDrawerOpen} onOpenChange={setMoodDrawerOpen}>
      <DrawerContent
        style={{
          backgroundImage: `radial-gradient(85% 55% at 50% 18%, rgba(${pal.outer[0]}, ${pal.outer[1]}, ${pal.outer[2]}, 0.34), rgba(14, 15, 19, 0.98) 72%)`,
        }}
        className="h-[92%] max-h-[92%] border-t border-white/15 bg-[#0c0d12] transition-colors duration-[var(--duration-medium)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none"
      >
        <DrawerTitle className="sr-only">Запись состояния</DrawerTitle>

        {/* Top 4-dot progress indicator */}
        <div className="mt-2 flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => {
            if (step === 3) {
              return (
                <span
                  key={i}
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 0 8px ${accentColor}`,
                  }}
                  className="h-2 w-2 rounded-full"
                />
              )
            }
            return (
              <span
                key={i}
                style={{
                  backgroundColor:
                    step >= i ? accentColor : "rgba(255,255,255,0.2)",
                }}
                className={cn(
                  "h-2 rounded-full transition-[width,background-color] duration-[var(--duration-medium)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                  step === i ? "w-6" : "w-2"
                )}
              />
            )
          })}
        </div>

        {/* Persistent StateOfMindOrb across all 4 steps */}
        <div className="mt-3 flex flex-col items-center">
          <StateOfMindOrb
            valence={valence}
            size={orbSize}
            showCheckmark={step === 3}
          />
        </div>

        <AnimatePresence mode="wait" custom={{ dir, reduced: !!reduceMotion }}>
          {/* STEP 0: ("Как вы себя чувствуете прямо сейчас?") */}
          {step === 0 && (
            <m.div
              key="checkin-0"
              custom={{ dir, reduced: !!reduceMotion }}
              variants={STEP_SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col items-center justify-between px-6 pt-2 pb-8 text-center"
            >
              <div>
                <h2 className="max-w-[290px] text-[20px] leading-snug font-bold tracking-tight text-white">
                  Как вы себя чувствуете прямо сейчас?
                </h2>
                <div className="mt-2.5 flex justify-center text-[23px] font-bold tracking-tight">
                  <WordRoll
                    lead=""
                    value={label}
                    accentClassName="text-white"
                  />
                </div>
              </div>

              <div className="w-full space-y-5">
                <div className="space-y-2.5">
                  <Slider
                    rainbow
                    min={-100}
                    max={100}
                    step={2}
                    value={[Math.round(valence * 100)]}
                    onValueChange={([v]) => handleValenceChange(v / 100)}
                  />
                  <div className="flex justify-between text-[11px] font-medium text-white/48">
                    <span>Очень неприятно</span>
                    <span>Очень приятно</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  variant="white"
                  onClick={() => goStep(1)}
                  className="h-12.5 w-full rounded-full text-[15px] font-semibold"
                >
                  Далее
                </Button>
              </div>
            </m.div>
          )}

          {/* STEP 1: Specific Emotions powered by SL UI `product-topics` */}
          {step === 1 && (
            <m.div
              key="checkin-1"
              custom={{ dir, reduced: !!reduceMotion }}
              variants={STEP_SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col justify-between px-6 pt-2 pb-8"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">
                  Что точнее описывает чувство?
                </h2>
                <p className="mt-1 text-xs text-white/55">{label}</p>

                <div className="mt-4">
                  <SLFocusTopics
                    options={emotionPool}
                    selected={selectedEmotions}
                    onChange={setSelectedEmotions}
                    ariaLabel="Выбор эмоций"
                    tone={valence >= -0.05 ? "mint" : "rose"}
                  />
                </div>
              </div>

              <div className="flex gap-2.5">
                <Button
                  size="lg"
                  variant="glass"
                  onClick={() => goStep(0)}
                  className="rounded-full px-5"
                >
                  Назад
                </Button>
                <Button
                  size="lg"
                  variant="white"
                  onClick={() => goStep(2)}
                  className="flex-1 rounded-full"
                >
                  Далее
                </Button>
              </div>
            </m.div>
          )}

          {/* STEP 2: Context Factors powered by SL UI `product-topics` + Note */}
          {step === 2 && (
            <m.div
              key="checkin-2"
              custom={{ dir, reduced: !!reduceMotion }}
              variants={STEP_SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col justify-between overflow-y-auto overscroll-contain px-6 pt-1 pb-8 no-scrollbar"
            >
              <div className="space-y-3.5">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-white">
                    Что влияет на вас больше всего?
                  </h2>
                  <p className="mt-0.5 text-xs text-white/55">
                    Факторы отразятся в аналитике сна и настроения
                  </p>
                </div>

                <SLFocusTopics
                  options={FACTORS}
                  selected={selectedFactors}
                  onChange={setSelectedFactors}
                  ariaLabel="Факторы состояния"
                  tone="lime"
                />

                <div className="pt-1">
                  <label
                    htmlFor={noteInputId}
                    className="text-xs font-medium text-white/60"
                  >
                    Короткая заметка (необязательно)
                  </label>
                  <Textarea
                    id={noteInputId}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Пара слов о моменте..."
                    rows={2}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <Button
                  size="lg"
                  variant="glass"
                  onClick={() => goStep(1)}
                  className="rounded-full px-5"
                >
                  Назад
                </Button>
                <Button
                  size="lg"
                  variant="white"
                  onClick={handleSave}
                  className="flex-1 rounded-full"
                >
                  Записать
                </Button>
              </div>
            </m.div>
          )}

          {/* STEP 3: ("Записано / Слегка приятно") */}
          {step === 3 && (
            <m.div
              key="checkin-3"
              custom={{ dir, reduced: !!reduceMotion }}
              variants={STEP_SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-1 flex-col items-center justify-start px-6 pt-4 text-center"
            >
              <StaggerReveal index={0}>
                <h2 className="text-[28px] font-bold tracking-tight text-white">
                  Записано
                </h2>
              </StaggerReveal>
              <StaggerReveal index={1}>
                <p className="mt-1 text-sm font-medium text-white/60">{label}</p>
              </StaggerReveal>
            </m.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  )
}

export default MoodCheckInDrawer
