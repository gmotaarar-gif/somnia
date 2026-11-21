import * as React from "react"
import { useLocalAccount } from "@/account/LocalAccountProvider"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, BatteryCharging, Brain, Check, Leaf, Moon, MoonStar, Smartphone, Sparkles, Sunrise, Zap } from "lucide-react"
import { cn } from "@/lib/cn"
import { onboardingWidgets } from "@/lib/onboarding"
import { wakeOptions } from "@/lib/features"
import { moodPct } from "@/lib/metrics"
import { DUR, EASE_OUT } from "@/lib/motion"
import { durationRu, hm, shiftTime, spanMinutes, timeToMinutes } from "@/lib/time"
import { getValenceLabel, sampleValencePalette } from "@/lib/valence"
import { DEFAULT_WIDGETS, useStore, type Chronotype, type Widget } from "@/store/store"
import { Card, type CardTone } from "@/ui/Card"
import { Orbits, Ring } from "@/ui/charts"
import { Button, IconButton, Segmented, Slider, Toggle } from "@/ui/controls"
import { TimeScrubber } from "@/ui/TimeScrubber"
import { Dots, DotsCount } from "@/ui/Dots"
import { usePrefersReducedMotion } from "@/ui/MotionProvider"
import { WIDGET_META } from "@/widgets/catalog"
import { WidgetTile } from "@/widgets/Widget"

const FOCUS = [
  { id: "Стабильный подъём", icon: Sunrise },
  { id: "Быстрее засыпать", icon: Moon },
  { id: "Снять вечерний стресс", icon: Leaf },
  { id: "Больше энергии утром", icon: Zap },
  { id: "Понять своё настроение", icon: Brain },
  { id: "Меньше экрана ночью", icon: Smartphone },
]

const CHRONO: { value: Chronotype; label: string; bed: string; wake: string }[] = [
  { value: "early", label: "Жаворонок", bed: "22:30", wake: "06:30" },
  { value: "balanced", label: "Голубь", bed: "23:30", wake: "07:30" },
  { value: "night", label: "Сова", bed: "00:30", wake: "08:30" },
]

const TIRED = ["Редко", "Иногда", "Часто", "Почти всегда"]
const STARTER: Widget["id"][] = ["w-streak", "w-evening", "w-water", "w-cycle", "w-rhythm", "w-debt", "w-wellbeing"]
const BUILD = ["Считаем цель сна", "Подбираем окно отбоя", "Собираем главный экран", "Настраиваем напоминание"]
const STEPS = 9

/* Intro: three cards fanned out, shuffling every few seconds */
const INTRO: { tone: CardTone; title: string; body: React.ReactNode }[] = [
  {
    tone: "violet",
    title: "Сон",
    body: (
      <>
        <span className="mt-5 text-[52px] leading-none">—</span>
        <Orbits className="-mx-5 mt-auto w-[calc(100%+40px)]" />
      </>
    ),
  },
  {
    tone: "sunset",
    title: "Состояние",
    body: (
      <>
        <span className="mt-5 text-[52px] leading-none">—</span>
        <p className="mt-auto text-[13px] text-white/70">После первого чек-ина</p>
      </>
    ),
  },
  {
    tone: "night",
    title: "Неделя",
    body: (
      <>
        <span className="mt-5 text-[52px] leading-none">—</span>
        <div className="mt-auto h-[84px]">
          <p className="text-[13px] text-white/70">Пока нет данных</p>
        </div>
      </>
    ),
  },
]

function IntroStack() {
  const [top, setTop] = React.useState(0)
  React.useEffect(() => {
    const id = window.setInterval(() => setTop((t) => (t + 1) % INTRO.length), 2600)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="relative mx-auto h-[310px] w-[236px]" aria-hidden>
      {INTRO.map((c, i) => {
        const pos = (i - top + INTRO.length) % INTRO.length
        return (
          <motion.div
            key={c.title}
            className="absolute inset-0"
            initial={false}
            animate={{
              rotate: pos === 0 ? 0 : pos === 1 ? 9 : -9,
              x: pos === 0 ? 0 : pos === 1 ? 54 : -54,
              y: pos === 0 ? 0 : 18,
              scale: pos === 0 ? 1 : 0.86,
              opacity: pos === 0 ? 1 : 0.55,
              zIndex: pos === 0 ? 3 : 1,
            }}
            transition={{ type: "spring", stiffness: 170, damping: 22 }}
          >
            <Card tone={c.tone} r="lg" className="h-full shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)]">
              <div className="flex h-full flex-col items-center p-5">
                <span className="self-start text-[15px] font-medium">{c.title}</span>
                {c.body}
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

/* 24-hour dial with the sleep window drawn as an arc */
function SleepDial({ bed, wake }: { bed: string; wake: string }) {
  const r = 82
  const c = 2 * Math.PI * r
  const start = timeToMinutes(bed) / 1440
  const len = spanMinutes(bed, wake) / 1440
  const pos = (t: number, rad = r) => {
    const a = t * 2 * Math.PI - Math.PI / 2
    return { x: 100 + Math.cos(a) * rad, y: 100 + Math.sin(a) * rad }
  }
  const b = pos(start)
  const w = pos(start + len)
  return (
    <div className="relative mx-auto size-[230px]">
      <svg viewBox="0 0 200 200" className="size-full" aria-hidden>
        {Array.from({ length: 48 }, (_, i) => {
          const p = pos(i / 48, 97)
          return <circle key={i} cx={p.x} cy={p.y} r={i % 12 === 0 ? 1.8 : 0.9} fill="currentColor" fillOpacity={i % 12 === 0 ? 0.7 : 0.3} />
        })}
        <circle cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="13" />
        <motion.circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="url(#dial)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - len), rotate: start * 360 - 90 }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
          style={{ transformOrigin: "100px 100px" }}
        />
        <defs>
          <linearGradient id="dial" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#7c8cff" />
            <stop offset="1" stopColor="#d9f24a" />
          </linearGradient>
        </defs>
        <motion.circle r="8" fill="currentColor" initial={false} animate={{ cx: b.x, cy: b.y }} transition={{ type: "spring", stiffness: 90, damping: 18 }} />
        <motion.circle r="8" fill="#d9f24a" initial={false} animate={{ cx: w.x, cy: w.y }} transition={{ type: "spring", stiffness: 90, damping: 18 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Dots value={hm(spanMinutes(bed, wake))} still shape="square" className="text-[40px]" />
        <span className="mt-2 text-[12px] text-ink-2">часов сна</span>
      </div>
      <span className="absolute left-1/2 top-[18px] -translate-x-1/2 text-[10px] text-ink-3">00</span>
      <span className="absolute bottom-[18px] left-1/2 -translate-x-1/2 text-[10px] text-ink-3">12</span>
    </div>
  )
}

function Building({ onDone }: { onDone: () => void }) {
  const [n, setN] = React.useState(0)
  React.useEffect(() => {
    if (n >= BUILD.length) {
      const id = window.setTimeout(onDone, 500)
      return () => window.clearTimeout(id)
    }
    const id = window.setTimeout(() => setN(n + 1), 620)
    return () => window.clearTimeout(id)
  }, [n, onDone])
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Ring value={n / BUILD.length} size={170} stroke={4}>
        <DotsCount value={Math.round((n / BUILD.length) * 100)} format={(v) => `${Math.round(v)}%`} className="text-[40px]" />
      </Ring>
      <h1 className="mt-9 text-[28px] font-semibold tracking-[-0.03em]">Собираем ваш план</h1>
      <ul className="mt-6 w-full max-w-[280px] space-y-3 text-left">
        {BUILD.map((label, i) => (
          <motion.li
            key={label}
            className="flex items-center gap-3 text-[15px]"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: i <= n ? 1 : 0.3, x: 0 }}
            transition={{ duration: DUR.medium, ease: EASE_OUT, delay: i * 0.06 }}
          >
            <span className={cn("grid size-6 place-items-center rounded-full transition-colors duration-250", i < n ? "bg-lime text-lime-ink" : "ring-1 ring-inset ring-white/25 text-transparent")}>
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            {label}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

export function Onboarding() {
  const reduce = usePrefersReducedMotion()
  const store = useStore()
  const { account, openRegistration } = useLocalAccount()
  const [step, setStep] = React.useState(0)
  const [dir, setDir] = React.useState(1)
  const [name, setName] = React.useState(store.userName)
  const [focus, setFocus] = React.useState<string[]>(store.focus)
  const [hours, setHours] = React.useState(6.5)
  const [tired, setTired] = React.useState(1)
  const [chronotype, setChronotype] = React.useState<Chronotype>(store.chronotype)
  const [bedGoal, setBedGoal] = React.useState(store.bedGoal)
  const [wakeGoal, setWakeGoal] = React.useState(store.wakeGoal)
  const [valence, setValence] = React.useState(0.3)
  const [moodAnswered, setMoodAnswered] = React.useState(false)
  const [picked, setPicked] = React.useState<string[]>(() => STARTER.filter((id) => store.widgets.some((w) => w.id === id && w.visible)))
  const [reminder, setReminder] = React.useState(store.reminder)
  const [reminderTime, setReminderTime] = React.useState(store.reminderTime)
  const [finishing, setFinishing] = React.useState(false)

  const target = spanMinutes(bedGoal, wakeGoal)
  const gain = Math.max(0, target - hours * 60)
  const canNext = step !== 1 || name.trim().length > 0
  const building = step === 7
  const [r, g, b] = sampleValencePalette(valence).mid

  const go = (d: number) => {
    setDir(d)
    setStep((s) => s + d)
  }

  const finish = async () => {
    if (finishing) return
    setFinishing(true)
    const widgets = onboardingWidgets(store.widgets, picked)
    const granted = await store.finishOnboarding({ userName: name.trim(), focus, chronotype, bedGoal, wakeGoal, reminder, reminderTime, widgets })
    if (moodAnswered) store.addMood({ valence, emotions: [], factors: [] })
    if (granted) store.notify(name.trim() ? `Добро пожаловать, ${name.trim()}` : "Добро пожаловать!")
  }

  const pickChrono = (c: Chronotype) => {
    const preset = CHRONO.find((x) => x.value === c)!
    setChronotype(c)
    setBedGoal(preset.bed)
    setWakeGoal(preset.wake)
    setReminderTime(shiftTime(preset.bed, -60))
  }

  return (
    <div className="relative z-10 flex min-h-full w-full flex-col px-5 pb-[max(var(--safe-bottom),24px)] pt-[max(var(--safe-top),18px)]">
      <header className={cn("flex h-11 items-center gap-4 transition-opacity duration-250", building && "pointer-events-none opacity-0")}>
        <IconButton label="Назад" onClick={() => go(-1)} className={cn(step === 0 && "invisible")}>
          <ArrowLeft />
        </IconButton>
        <div className="flex flex-1 gap-1" aria-label={`Шаг ${step + 1} из ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <span
                className="block h-full origin-left rounded-full bg-white transition-transform duration-500 ease-out-smooth"
                style={{ transform: `scaleX(${i <= step ? 1 : 0})` }}
              />
            </span>
          ))}
        </div>
        <button type="button" className={cn("w-11 text-right text-[13px] text-ink-3", step === 0 || step >= 7 ? "invisible" : "")} onClick={() => { setDir(1); setStep(7) }}>
          Позже
        </button>
      </header>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.main
          key={step}
          custom={dir}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: 36 * d }),
            center: { opacity: 1, x: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
            exit: (d: number) => ({ opacity: 0, x: -28 * d, transition: { duration: DUR.quick, ease: EASE_OUT } }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex flex-1 flex-col pt-6"
        >
          {step === 0 && (
            <>
              <IntroStack />
              <h1 className="mt-10 text-center text-[34px] font-semibold leading-[1.05] tracking-[-0.04em]">
                Сон и состояние
                <br />в одном ритме
              </h1>
              <p className="mx-auto mt-4 max-w-[300px] text-center text-[15px] leading-relaxed text-ink-2">
                Минута утром и 20 секунд вечером. Somna покажет, как ночи меняют ваши дни.
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <Title title="Как к вам обращаться?" text="Имя останется только на этом устройстве." />
              <div className="mt-8 flex items-center gap-4">
                <motion.span
                  key={name.trim()[0] ?? ""}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className="grid size-16 shrink-0 place-items-center rounded-full bg-lime text-[26px] font-semibold text-lime-ink"
                >
                  {(name.trim()[0] ?? "?").toUpperCase()}
                </motion.span>
                <input
                  autoFocus
                  value={name}
                  maxLength={20}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canNext && go(1)}
                  placeholder="Ваше имя"
                  aria-label="Ваше имя"
                  className="glass h-16 min-w-0 flex-1 rounded-full px-6 text-[22px] font-medium tracking-[-0.02em] outline-none placeholder:text-ink-3"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Title title="Что хотите улучшить?" text="Выберите до трёх целей: под них подберём советы." />
              <div className="mt-7 grid grid-cols-2 gap-2.5">
                {FOCUS.map(({ id, icon: Icon }, i) => {
                  const on = focus.includes(id)
                  return (
                    <motion.button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: DUR.medium, ease: EASE_OUT, delay: 0.05 * i }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setFocus(on ? focus.filter((x) => x !== id) : focus.length < 3 ? [...focus, id] : focus)}
                      className={cn(
                        "flex h-[104px] flex-col justify-between rounded-[26px] p-4 text-left transition-colors duration-250",
                        on ? "bg-lime text-lime-ink" : "glass"
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <Icon className="size-5" />
                        <span className={cn("grid size-5 place-items-center rounded-full transition-opacity duration-250", on ? "bg-lime-ink text-lime" : "opacity-0")}>
                          <Check className="size-3" strokeWidth={3.5} />
                        </span>
                      </span>
                      <span className="text-[14px] font-medium leading-tight">{id}</span>
                    </motion.button>
                  )
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Title title="Как вы спите сейчас?" text="Отсюда посчитаем, сколько сна можно вернуть." />
              <Card tone="night" className="mt-7">
                <div className="p-5">
                  <div className="text-[12px] text-ink-2">В среднем за ночь</div>
                  <div className="mt-3 flex items-end gap-2">
                    <Dots value={hm(hours * 60)} still shape="square" className="text-[56px]" />
                    <span className="pb-1 text-[13px] text-ink-2">ч</span>
                  </div>
                  <Slider label="Сколько часов вы спите" className="mt-6" min={4} max={10} step={0.5} value={hours} onChange={setHours} />
                </div>
              </Card>
              <div className="mt-6 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.08em] text-ink-3">
                <BatteryCharging className="size-4" /> Просыпаетесь разбитым
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {TIRED.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tired === i}
                    onClick={() => setTired(i)}
                    className={cn("press rounded-[18px] px-1 py-3 text-[12px] font-medium transition-colors duration-250", tired === i ? "bg-white text-black" : "glass text-ink-2")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <Title title="Ваш режим" text="Хронотип подставит время, его можно поправить вручную." />
              <div className="mt-5">
                <SleepDial bed={bedGoal} wake={wakeGoal} />
              </div>
              <Segmented id="chrono" label="Хронотип" className="mt-5 flex w-full" value={chronotype} onChange={pickChrono} options={CHRONO.map(({ value, label }) => ({ value, label }))} />
              <div className="mt-3 space-y-3">
                <TimeScrubber label="Отбой" value={bedGoal} onChange={setBedGoal} />
                <TimeScrubber label="Подъём" value={wakeGoal} onChange={setWakeGoal} />
              </div>
              <p className="mt-3 text-center text-[12px] text-ink-3">
                {target < 420 ? "Меньше 7 часов: взрослым обычно нужно 7–9." : `Лучший подъём по циклам: ${wakeOptions(bedGoal).find((o) => o.best)!.time}`}
              </p>
            </>
          )}

          {step === 5 && (
            <>
              <Title title="Как вы сейчас?" text="Первый чек-ин: дальше будем сравнивать с ним." />
              <div className="mt-6 flex flex-1 flex-col items-center justify-center">
                <motion.div
                  key={String(reduce)}
                  className="size-[190px] rounded-full"
                  animate={{ scale: reduce ? 1 : [1, 1.06, 1] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    background: `radial-gradient(circle at 35% 28%, rgb(255 255 255 / 0.85), rgb(${r} ${g} ${b}) 42%, rgb(${r} ${g} ${b} / 0.5) 100%)`,
                    boxShadow: `0 0 90px -10px rgb(${r} ${g} ${b} / 0.8)`,
                    transition: "background 0.3s, box-shadow 0.3s",
                  }}
                />
                <Dots value={`${moodPct(valence)}%`} still className="mt-9 text-[40px]" />
                <div className="mt-3 text-[18px] font-semibold">{getValenceLabel(valence)}</div>
              </div>
              <Slider
                label="Состояние"
                min={-1}
                max={1}
                step={0.02}
                value={valence}
                onChange={(value) => { setValence(value); setMoodAnswered(true) }}
                track="linear-gradient(90deg,#5b3fd9,#3b82f6,#34d399,#d9f24a,#fb923c)"
              />
              <div className="mt-2 flex justify-between text-[12px] text-ink-3">
                <span>Неприятно</span>
                <span>Приятно</span>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <Title title="Соберите главный экран" text="Выберите виджеты. Их можно менять в любой момент." />
              <div className="mt-6 grid grid-cols-2 gap-3">
                {STARTER.map((id, i) => {
                  const w = DEFAULT_WIDGETS.find((x) => x.id === id)!
                  const on = picked.includes(id)
                  return (
                    <motion.div key={id} className="relative" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: DUR.medium, ease: EASE_OUT, delay: 0.04 * i }}>
                      <div className={cn("pointer-events-none h-[150px] transition-[opacity,transform] duration-250 [&_[data-widget-action]]:hidden", !on && "scale-[0.96] opacity-45")} inert>
                        <WidgetTile widget={{ ...w, size: "1x1" }} interactive={false} />
                      </div>
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={WIDGET_META[w.kind as keyof typeof WIDGET_META].title}
                        onClick={() => setPicked(on ? picked.filter((x) => x !== id) : [...picked, id])}
                        className="absolute inset-0 rounded-[34px]"
                      >
                        <span className={cn("absolute right-3 top-3 grid size-7 place-items-center rounded-full transition-colors duration-250", on ? "bg-lime text-lime-ink" : "bg-white/15 text-transparent ring-1 ring-inset ring-white/30")}>
                          <Check className="size-4" strokeWidth={3} />
                        </span>
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </>
          )}

          {step === 7 && <Building onDone={() => { setDir(1); setStep(8) }} />}

          {step === 8 && (
            <>
              <Title title={`${name.trim() || "Ваш"}${name.trim() ? ", ваш" : ""} план готов`} text="Его можно изменить в профиле." />
              <Card tone="violet" r="lg" className="mt-6">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-ink-2">Цель сна</span>
                    <MoonStar className="size-4 text-ink-2" />
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <DotsCount value={target} format={(v) => hm(Math.round(v))} className="text-[56px]" />
                    <span className="pb-1 text-[13px] text-ink-2">ч</span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Отбой", bedGoal],
                      ["Подъём", wakeGoal],
                      ["Сигнал", reminder ? reminderTime : "выкл"],
                    ].map(([k, v]) => (
                      <div key={k} className="glass-inset rounded-[18px] py-2.5">
                        <div className="text-[11px] text-ink-2">{k}</div>
                        <div className="mt-0.5 text-[16px] font-semibold tabular-nums">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <div className="glass mt-3 flex items-center justify-between gap-4 rounded-[26px] p-4">
                <div>
                  <div className="text-[15px] font-medium">Напоминать об отбое</div>
                  <div className="mt-0.5 text-[12px] text-ink-3">Вечерний режим за час до сна</div>
                </div>
                <Toggle checked={reminder} onChange={setReminder} label="Напоминать об отбое" />
              </div>
              <ul className="mt-4 space-y-2.5 text-[14px] leading-snug text-ink-2">
                {[
                  gain >= 20 ? `Вернём до ${durationRu(gain)} сна за ночь` : "Закрепим ваш текущий объём сна",
                  tired >= 2 ? "Сфокусируемся на утренней бодрости" : "Будем держать стабильный подъём",
                  focus[0] ? `Главная цель: ${focus[0].toLowerCase()}` : "Цель можно выбрать позже",
                ].map((t, i) => (
                  <motion.li key={t} className="flex items-center gap-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR.medium, ease: EASE_OUT, delay: 0.25 + i * 0.1 }}>
                    <Sparkles className="size-4 shrink-0 text-lime" /> {t}
                  </motion.li>
                ))}
              </ul>
            </>
          )}
        </motion.main>
      </AnimatePresence>

      {!building && (
        <>
          <Button className="mt-7 h-14 w-full shrink-0 text-[16px]" disabled={!canNext || finishing} onClick={async () => {
            if (step !== STEPS - 1) {
              if (step === 5) setMoodAnswered(true)
              return go(1)
            }
            await finish()
            if (!account) openRegistration()
          }}>
            {step === 0 ? "Начать" : step === STEPS - 1 ? account ? "Открыть Somna" : "Создать профиль" : "Далее"}
            <ArrowRight />
          </Button>
          {step === STEPS - 1 && !account && (
            <Button variant="ghost" className="mt-2 w-full shrink-0" disabled={finishing} onClick={finish}>Продолжить без регистрации</Button>
          )}
        </>
      )}
    </div>
  )
}

function Title({ title, text }: { title: string; text: string }) {
  return (
    <>
      <h1 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.04em]">{title}</h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2">{text}</p>
    </>
  )
}
