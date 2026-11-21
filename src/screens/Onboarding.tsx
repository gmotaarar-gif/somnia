import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Brain, LayoutGrid, MoonStar } from "lucide-react"
import { cn } from "@/lib/cn"
import { screenVariants } from "@/lib/motion"
import { durationRu, hm, shiftTime, spanMinutes } from "@/lib/time"
import { useStore, type Chronotype } from "@/store/store"
import { Card } from "@/ui/Card"
import { Orbits } from "@/ui/charts"
import { Button, Chip, IconButton, Segmented, TimeField, Toggle } from "@/ui/controls"
import { Dots } from "@/ui/Dots"

const FOCUS = [
  "Стабильный подъём",
  "Быстрее засыпать",
  "Снять вечерний стресс",
  "Больше энергии утром",
  "Понять своё настроение",
  "Меньше экрана ночью",
]

const CHRONO: { value: Chronotype; label: string; bed: string; wake: string }[] = [
  { value: "early", label: "Жаворонок", bed: "22:30", wake: "06:30" },
  { value: "balanced", label: "Голубь", bed: "23:30", wake: "07:30" },
  { value: "night", label: "Сова", bed: "00:30", wake: "08:30" },
]

const FEATURES = [
  { icon: MoonStar, title: "Сон", text: "Запись за минуту, режим и долг сна" },
  { icon: Brain, title: "Состояние", text: "Чек-ины и связь настроения со сном" },
  { icon: LayoutGrid, title: "Виджеты", text: "Главный экран, который собираете вы" },
]

const STEPS = 5

export function Onboarding() {
  const store = useStore()
  const [step, setStep] = React.useState(0)
  const [name, setName] = React.useState(store.userName)
  const [focus, setFocus] = React.useState<string[]>(store.focus)
  const [chronotype, setChronotype] = React.useState<Chronotype>(store.chronotype)
  const [bedGoal, setBedGoal] = React.useState(store.bedGoal)
  const [wakeGoal, setWakeGoal] = React.useState(store.wakeGoal)
  const [reminder, setReminder] = React.useState(store.reminder)
  const [reminderTime, setReminderTime] = React.useState(store.reminderTime)

  const target = spanMinutes(bedGoal, wakeGoal)
  const canNext = step !== 1 || name.trim().length > 0

  const next = () => {
    if (step < STEPS - 1) return setStep(step + 1)
    store.finishOnboarding({ userName: name.trim(), focus, chronotype, bedGoal, wakeGoal, reminder, reminderTime })
  }

  const pickChrono = (c: Chronotype) => {
    const preset = CHRONO.find((x) => x.value === c)!
    setChronotype(c)
    setBedGoal(preset.bed)
    setWakeGoal(preset.wake)
    setReminderTime(shiftTime(preset.bed, -60))
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[520px] flex-col px-5 pb-[max(var(--safe-bottom),24px)] pt-[max(var(--safe-top),18px)]">
      <header className="flex h-11 items-center gap-4">
        <IconButton label="Назад" onClick={() => setStep(step - 1)} className={cn(step === 0 && "invisible")}>
          <ArrowLeft />
        </IconButton>
        <div className="flex flex-1 gap-1.5" aria-label={`Шаг ${step + 1} из ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <span
                className="block h-full rounded-full bg-white transition-transform duration-500 ease-out-smooth"
                style={{ transform: `scaleX(${i <= step ? 1 : 0})`, transformOrigin: "left" }}
              />
            </span>
          ))}
        </div>
        <span className="w-11 text-right text-[13px] tabular-nums text-ink-3">
          {step + 1}/{STEPS}
        </span>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={step}
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex flex-1 flex-col pt-7"
        >
          {step === 0 && (
            <>
              <Card tone="violet" r="lg">
                <div className="flex h-[300px] flex-col items-center p-6">
                  <span className="self-start text-[15px] font-medium">Somna</span>
                  <Dots value="7:42" className="mt-6 text-[60px]" />
                  <span className="mt-3 text-[13px] text-ink-2">часов спокойного сна</span>
                  <Orbits className="-mx-6 mt-auto w-[calc(100%+48px)]" />
                </div>
              </Card>
              <h1 className="mt-8 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em]">
                Сон и состояние
                <br />
                в одном ритме
              </h1>
              <ul className="mt-6 space-y-3">
                {FEATURES.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-center gap-4">
                    <span className="glass grid size-11 shrink-0 place-items-center rounded-full">
                      <Icon className="size-[18px]" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-medium">{title}</span>
                      <span className="block text-[13px] text-ink-3">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {step === 1 && (
            <>
              <Title title="Как к вам обращаться?" text="Имя останется только на этом устройстве." />
              <input
                autoFocus
                value={name}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canNext && next()}
                placeholder="Ваше имя"
                aria-label="Ваше имя"
                className="glass mt-8 h-16 w-full rounded-full px-7 text-[22px] font-medium tracking-[-0.02em] outline-none placeholder:text-ink-3"
              />
            </>
          )}

          {step === 2 && (
            <>
              <Title title="Что хотите улучшить?" text="Выберите до трёх целей: под них подберём советы." />
              <div className="mt-8 flex flex-wrap gap-2.5">
                {FOCUS.map((f) => {
                  const on = focus.includes(f)
                  return (
                    <Chip
                      key={f}
                      active={on}
                      className="h-12 px-5 text-[15px]"
                      onClick={() => setFocus(on ? focus.filter((x) => x !== f) : focus.length < 3 ? [...focus, f] : focus)}
                    >
                      {f}
                    </Chip>
                  )
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Title title="Ваш режим" text="Хронотип подставит время, его можно поправить вручную." />
              <Segmented
                id="chrono"
                className="mt-8 flex w-full"
                value={chronotype}
                onChange={pickChrono}
                options={CHRONO.map(({ value, label }) => ({ value, label }))}
              />
              <div className="mt-3 flex gap-3">
                <TimeField label="Отбой" value={bedGoal} onChange={setBedGoal} />
                <TimeField label="Подъём" value={wakeGoal} onChange={setWakeGoal} />
              </div>
              <Card tone="night" className="mt-3">
                <div className="flex items-end justify-between gap-4 p-5">
                  <div>
                    <div className="text-[12px] text-ink-2">Цель сна</div>
                    <Dots value={hm(target)} shape="square" className="mt-3 text-[44px]" />
                  </div>
                  <p className="max-w-[170px] pb-1 text-right text-[12px] leading-relaxed text-ink-2">
                    {target < 420 ? "Меньше 7 часов: взрослым обычно нужно 7–9." : target > 570 ? "Больше 9,5 часов: проверьте время." : `${durationRu(target)} в постели: в пределах нормы.`}
                  </p>
                </div>
              </Card>
            </>
          )}

          {step === 4 && (
            <>
              <Title title="Вечернее напоминание" text="Мягкий сигнал, что пора замедляться." />
              <div className="glass mt-8 flex items-center justify-between gap-4 rounded-[28px] p-5">
                <div>
                  <div className="text-[16px] font-medium">Напоминать об отбое</div>
                  <div className="mt-0.5 text-[13px] text-ink-3">Вечерний режим на главном экране</div>
                </div>
                <Toggle checked={reminder} onChange={setReminder} label="Напоминать об отбое" />
              </div>
              <div className={cn("mt-3 flex transition-opacity duration-250", !reminder && "pointer-events-none opacity-40")}>
                <TimeField label="Время напоминания" value={reminderTime} onChange={setReminderTime} />
              </div>
              <Card tone="forest" className="mt-3">
                <div className="p-5 text-[14px] leading-relaxed text-ink-2">
                  <span className="text-ink">{name.trim() || "Готово"}</span>, ваш план: отбой в{" "}
                  <span className="text-ink">{bedGoal}</span>, подъём в <span className="text-ink">{wakeGoal}</span>,{" "}
                  {durationRu(target)} сна. Мы добавили две недели демо-данных, чтобы экраны не были пустыми: их можно сбросить в профиле.
                </div>
              </Card>
            </>
          )}
        </motion.main>
      </AnimatePresence>

      <Button className="mt-8 h-14 w-full text-[16px]" disabled={!canNext} onClick={next}>
        {step === 0 ? "Начать" : step === STEPS - 1 ? "Открыть Somna" : "Далее"}
        <ArrowRight />
      </Button>
    </div>
  )
}

function Title({ title, text }: { title: string; text: string }) {
  return (
    <>
      <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.04em]">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{text}</p>
    </>
  )
}
