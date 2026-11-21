import * as React from "react"
import { ArrowUpRight, Award, Bell, Check, ChevronDown, ChevronRight, Download, LayoutGrid, Moon, RotateCcw, ShieldCheck, Sun, Sunrise, Target, Volume2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { durationRu, spanMinutes } from "@/lib/time"
import { useStore, type Chronotype } from "@/store/store"
import { Button, Slider, TimeField, Toggle } from "@/ui/controls"
import { Sheet } from "@/ui/Sheet"
import { SubscriptionCard } from "@/ui/SubscriptionCard"
import { LocalAccountCard } from "@/account/LocalAccountCard"

const CHRONOTYPES: { value: Chronotype; label: string; hint: string; icon: LucideIcon; description: string }[] = [
  { value: "early", label: "Жаворонок", hint: "Раннее утро", icon: Sunrise, description: "Больше энергии утром. Оставьте вечер для спокойных дел." },
  { value: "balanced", label: "Голубь", hint: "Свой баланс", icon: Sun, description: "Вам подходит гибкий ритм. Старайтесь просыпаться в одно время." },
  { value: "night", label: "Сова", hint: "Тихий вечер", icon: Moon, description: "Ваша энергия раскрывается к вечеру. Дайте себе время замедлиться перед сном." },
]

export function ProfileSheet() {
  const s = useStore()
  const [confirm, setConfirm] = React.useState<"widgets" | "journal" | null>(null)
  const widgetActionRef = React.useRef<HTMLDivElement>(null)
  const journalActionRef = React.useRef<HTMLDivElement>(null)
  const restoreFocus = React.useRef<"widgets" | "journal" | null>(null)
  const open = s.sheet === "profile"
  const nameId = React.useId()
  const chronoId = React.useId()
  const sleepGoal = spanMinutes(s.bedGoal, s.wakeGoal)
  const chronotype = CHRONOTYPES.find((item) => item.value === s.chronotype) ?? CHRONOTYPES[1]
  const initial = (Array.from(s.userName.trim())[0] ?? "S").toUpperCase()

  React.useEffect(() => {
    if (!open) setConfirm(null)
  }, [open])

  React.useLayoutEffect(() => {
    const action = restoreFocus.current
    if (confirm || !action) return
    restoreFocus.current = null
    if (!open) return
    const container = action === "widgets" ? widgetActionRef.current : journalActionRef.current
    container?.querySelector("button")?.focus({ preventScroll: true })
  }, [confirm, open])

  const cancelConfirmation = () => {
    restoreFocus.current = confirm
    setConfirm(null)
  }

  const close = () => {
    setConfirm(null)
    s.openSheet(null)
  }
  const exportData = () => {
    const { nights, moods, sessions, worries, wellbeing, bedGoal, wakeGoal } = s
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), bedGoal, wakeGoal, nights, moods, sessions, worries, wellbeing }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "somna-export.json"
    a.click()
    URL.revokeObjectURL(url)
    s.notify("Данные выгружены")
  }

  return (
    <Sheet open={open} onClose={close} title="Профиль" description="Ваш ритм. Ваше пространство." className="h-[93%]">
      <div className="space-y-6 pb-2">
        <section aria-label="Личный профиль" className="relative overflow-hidden rounded-[28px] border border-white/12 bg-linear-to-br from-[#393056] via-[#211d36] to-[#15141f] p-5">
          <div aria-hidden className="pointer-events-none absolute -right-9 -top-12 size-40 rounded-full border border-white/8" />
          <div aria-hidden className="pointer-events-none absolute -right-2 -top-5 size-26 rounded-full border border-white/8" />
          <div className="relative flex items-center gap-4">
            <div aria-hidden className="grid size-16 shrink-0 place-items-center rounded-[23px] border border-white/20 bg-white/10 text-[28px] font-medium text-[#e0d6ff] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">{initial}</div>
            <div className="min-w-0 flex-1">
              <label htmlFor={nameId} className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#d0c6e7]">Как к вам обращаться</label>
              <input id={nameId} value={s.userName} maxLength={20} autoComplete="given-name" onChange={(e) => s.patch({ userName: e.target.value })} placeholder="Ваше имя" className="mt-1 block h-10 w-full min-w-0 rounded-md border-b border-white/20 bg-transparent px-1 text-[24px] font-semibold tracking-[-0.03em] outline-none placeholder:text-white/50 focus-visible:border-lime" />
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#d0c6e7]"><Check aria-hidden className="size-3 shrink-0" /> Изменения сохраняются автоматически</p>
            </div>
          </div>
          <dl className="relative mt-6 grid grid-cols-3 divide-x divide-white/12 border-t border-white/12 pt-4">
            {[[s.nights.length, "ночей в журнале"], [s.moods.length, "отметок настроения"], [Math.round(s.sessions.reduce((a, x) => a + x.min, 0)), "минут практик"]].map(([value, label]) => (
              <div key={label} className="flex min-w-0 flex-col px-2.5 first:pl-0 last:pr-0">
                <dt className="order-last mt-2 text-[11px] leading-snug text-[#d0c6e7]">{label}</dt>
                <dd className="text-[25px] font-semibold leading-none tabular-nums tracking-[-0.03em]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-3">
          <LocalAccountCard />
          <SubscriptionCard />
        </div>
        <ProfileRow icon={Award} title="Мои достижения" description="Маленькие шаги, которые важны" onClick={() => s.openSheet("awards")} accent />

        <ProfileSection title="Мой ритм" description="Настройте Somna под себя">
          <div className="rounded-[26px] border border-hair bg-white/3 p-4">
            <fieldset aria-describedby={chronoId}>
              <legend className="mb-3 text-[14px] font-medium">Хронотип</legend>
              <div className="grid grid-cols-3 gap-2">
                {CHRONOTYPES.map(({ value, label, hint, icon: Icon }) => (
                  <label key={value} className="relative min-w-0 cursor-pointer">
                    <input type="radio" name="profile-chronotype" value={value} checked={s.chronotype === value} onChange={() => s.patch({ chronotype: value })} className="peer sr-only" />
                    <span className={cn("flex min-h-25 flex-col items-center justify-center gap-1 rounded-[19px] border px-1 py-3 text-center transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime", s.chronotype === value ? "border-lime/40 bg-lime/10 text-lime" : "border-white/8 bg-white/3 text-ink-2 hover:bg-white/6")}>
                      <Icon aria-hidden className="mb-1 size-5" />
                      <span className="text-[12px] font-medium">{label}</span>
                      <span className={cn("text-[10px]", s.chronotype === value ? "text-lime/75" : "text-ink-3")}>{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p id={chronoId} className="mt-3 min-h-10 text-[12px] leading-relaxed text-ink-2">{chronotype.description}</p>
            </fieldset>
            <div className="my-4 border-t border-hair" />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[14px] font-medium">Расписание сна</h3>
              <span className="rounded-full bg-[#cbc0ff]/10 px-2.5 py-1 text-[12px] font-medium text-[#d0c5ff]">{durationRu(sleepGoal)} на сон</span>
            </div>
            <div className="flex gap-2.5">
              <TimeField label="Отбой" value={s.bedGoal} onChange={(bedGoal) => s.patch({ bedGoal })} />
              <TimeField label="Подъём" value={s.wakeGoal} onChange={(wakeGoal) => s.patch({ wakeGoal })} />
            </div>
            {sleepGoal > 12 * 60 && <p className="mt-3 text-[12px] leading-relaxed text-[#edc28c]">Получилось больше 12 часов. Проверьте время отбоя и подъёма.</p>}
          </div>
          {s.weeklyGoal && <ProfileRow icon={Target} title="Моя цель недели" description={s.weeklyGoal.text} onClick={() => s.openSheet("recap")} />}
        </ProfileSection>

        <ProfileSection title="Для спокойного вечера" description="Меньше отвлечений перед сном">
          <div className="divide-y divide-white/8 rounded-[26px] border border-hair bg-white/3 px-4">
            <div className="py-4">
              <div className="flex items-center gap-3">
                <Bell aria-hidden className="size-5 shrink-0 text-[#d0c5ff]" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-medium">Напоминать об отбое</h3>
                  <p className="mt-1 text-[12px] leading-snug text-ink-2">Время для вечернего ритуала</p>
                </div>
                <Toggle checked={s.reminder} onChange={(reminder) => s.patch({ reminder })} label="Напоминать об отбое" />
              </div>
              {s.reminder && <div className="mt-4 flex"><TimeField label="Время напоминания" value={s.reminderTime} onChange={(reminderTime) => s.patch({ reminderTime })} /></div>}
            </div>
            <div className="py-4">
              <div className="mb-4 flex items-center gap-3">
                <Volume2 aria-hidden className="size-5 text-[#d0c5ff]" />
                <h3 className="flex-1 text-[14px] font-medium">Громкость звуков</h3>
                <span className="text-[13px] tabular-nums text-ink-2">{s.volume}%</span>
              </div>
              <Slider label="Громкость звуков" value={s.volume} onChange={(volume) => s.patch({ volume })} />
            </div>
          </div>
        </ProfileSection>

        <ProfileSection title="Данные и настройки">
          <div className="flex gap-3 rounded-[22px] bg-[#b9c3ff]/6 p-4">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-[#c3ccff]" />
            <div>
              <h3 className="text-[13px] font-medium text-[#e0e4ff]">Хранятся на этом устройстве</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-2">Журнал сохраняется в этом браузере. Экспортируйте записи, прежде чем очищать его данные.</p>
            </div>
          </div>
          <ProfileRow icon={Download} title="Экспортировать журнал" description="Сон, настроение и практики · JSON" onClick={exportData} />
          <details className="group rounded-[24px] border border-hair bg-white/3">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-[24px] px-4 py-4 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
              Дополнительные настройки <ChevronDown aria-hidden className="size-4 text-ink-2 group-open:rotate-180" />
            </summary>
            <div className="space-y-2 border-t border-hair px-3 pb-3 pt-2">
              <div ref={widgetActionRef}>
                {confirm === "widgets" ? (
                  <ConfirmAction title="Восстановить виджеты?" description="Порядок, размеры и оформление стандартных виджетов вернутся к начальным настройкам." label="Да, восстановить" onCancel={cancelConfirmation} onConfirm={() => { s.resetWidgets(); setConfirm(null); s.notify("Виджеты восстановлены") }} />
                ) : <ProfileRow icon={LayoutGrid} title="Восстановить виджеты" description="Вернуть стандартный набор и порядок" onClick={() => setConfirm("widgets")} />}
              </div>
              <ProfileRow icon={RotateCcw} title="Пройти знакомство заново" description="Ещё раз настроить свой ритм" onClick={() => { s.patch({ onboarded: false }); close() }} />
              <div ref={journalActionRef} className="px-1 pt-3">
                {confirm === "journal" ? (
                  <ConfirmAction title="Заменить журнал демо-данными?" description="Ваши записи и настройки будут заменены. Имя сохранится. Это нельзя отменить — сначала экспортируйте журнал." label="Да, заменить" danger onCancel={cancelConfirmation} onConfirm={() => { s.resetAll(); setConfirm(null); s.notify("Демо-данные восстановлены") }} />
                ) : <Button variant="danger" className="h-auto min-h-12 w-full py-3 text-[13px]" onClick={() => setConfirm("journal")}>Сбросить журнал к демо-данным</Button>}
              </div>
            </div>
          </details>
        </ProfileSection>
        <p className="pb-1 text-center text-[11px] tracking-[0.04em] text-ink-3">Somna · В своём ритме</p>
      </div>
    </Sheet>
  )
}

function ConfirmAction({ title, description, label, danger, onCancel, onConfirm }: { title: string; description: string; label: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div role="group" aria-label={title} className={cn("rounded-[20px] border p-4", danger ? "border-[#ff8f8f]/20 bg-[#ff5d5d]/5" : "border-hair bg-white/3")}>
      <h3 className={cn("text-[14px] font-medium", danger && "text-[#ffb5b5]")}>{title}</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button autoFocus variant="glass" className="flex-1 px-4 text-[13px]" onClick={onCancel}>Отмена</Button>
        <Button variant={danger ? "danger" : "primary"} className="flex-1 px-4 text-[13px]" onClick={onConfirm}>{label}</Button>
      </div>
    </div>
  )
}

function ProfileSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]">{title}</h2>
        {description && <p className="mt-1 text-[12px] text-ink-2">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function ProfileRow({ icon: Icon, title, description, onClick, accent }: { icon: LucideIcon; title: string; description: string; onClick: () => void; accent?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("press flex w-full items-center gap-3 rounded-[23px] border p-4 text-left transition-colors duration-150", accent ? "border-lime/15 bg-lime/6 hover:bg-lime/10" : "border-hair bg-white/3 hover:bg-white/6")}>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-[14px]", accent ? "bg-lime/10 text-lime" : "bg-white/5 text-ink-2")}><Icon aria-hidden className="size-[19px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium">{title}</span>
        <span className="mt-1 block text-[12px] leading-snug text-ink-2">{description}</span>
      </span>
      {accent ? <ArrowUpRight aria-hidden className="size-[18px] shrink-0 text-lime" /> : <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" />}
    </button>
  )
}
