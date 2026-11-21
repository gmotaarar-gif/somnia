import * as React from "react"
import { Award as AwardIcon, ChevronRight, Download, LayoutGrid, RotateCcw, Sparkles, Trash2 } from "lucide-react"
import { Capacitor } from "@capacitor/core"
import { cn } from "@/lib/cn"
import { requestReminderPermission } from "@/lib/notifications"
import { saveJsonFile } from "@/lib/saveFile"
import { durationRu, pluralRu, spanMinutes } from "@/lib/time"
import { useStore, type Chronotype } from "@/store/store"
import { Button, Segmented, Slider, TimeField, Toggle } from "@/ui/controls"
import { Field, Sheet } from "@/ui/Sheet"
import { SubscriptionCard } from "@/ui/SubscriptionCard"
import { LocalAccountCard } from "@/account/LocalAccountCard"
import { AppearancePicker } from "@/ui/AppearancePicker"

function Row({
  icon,
  title,
  sub,
  danger,
  onClick,
  buttonRef,
}: {
  icon: React.ReactNode
  title: string
  sub?: string
  danger?: boolean
  onClick: () => void
  buttonRef?: React.Ref<HTMLButtonElement>
}) {
  return (
    <button ref={buttonRef} type="button" onClick={onClick} className={cn("press flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-white/5", danger && "text-danger")}>
      <span className="shrink-0 opacity-70 [&_svg]:size-[18px]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{title}</span>
        {sub && <span className="mt-0.5 block truncate text-[12px] text-ink-3">{sub}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-3" />
    </button>
  )
}

const group = "glass divide-y divide-white/6 overflow-hidden rounded-[24px]"

export function ProfileSheet() {
  const s = useStore()
  const [confirm, setConfirm] = React.useState<"widgets" | "journal" | null>(null)
  const widgetActionRef = React.useRef<HTMLButtonElement>(null)
  const journalActionRef = React.useRef<HTMLButtonElement>(null)
  const open = s.sheet === "profile"
  const remindersAvailable = Capacitor.isNativePlatform()
  const [requesting, setRequesting] = React.useState(false)
  const toggleReminder = async (key: "reminder" | "morningReminder", enabled: boolean) => {
    if (requesting) return
    if (!enabled) { s.patch({ [key]: false }); return }
    setRequesting(true)
    const granted = await requestReminderPermission()
    s.patch({ [key]: granted })
    if (!granted) s.notify("Разрешите уведомления для Somna в настройках телефона")
    setRequesting(false)
  }

  React.useEffect(() => {
    if (!open) setConfirm(null)
  }, [open])

  const cancelConfirmation = () => {
    const trigger = confirm === "widgets" ? widgetActionRef : journalActionRef
    setConfirm(null)
    trigger.current?.focus({ preventScroll: true })
  }

  const close = () => {
    setConfirm(null)
    s.openSheet(null)
  }

  const practiceMin = Math.round(s.sessions.reduce((a, x) => a + x.min, 0))
  const exportData = async () => {
    const { nights, moods, sessions, worries, wellbeing, bedGoal, wakeGoal } = s
    try {
      const data = JSON.stringify({ exportedAt: new Date().toISOString(), bedGoal, wakeGoal, nights, moods, sessions, worries, wellbeing }, null, 2)
      await saveJsonFile("somna-export.json", data, "Экспорт данных")
      s.notify("Данные выгружены")
      return true
    } catch {
      s.notify("Не удалось выгрузить данные")
      return false
    }
  }

  return (
    <Sheet open={open} onClose={close} title="Профиль" description="Данные хранятся только в этом браузере">
      <div className="profile-hero on-dark rounded-[28px] p-5">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#c9b9ef]/15 text-[24px] font-medium text-[#ded1fa]" aria-hidden>{(s.userName.trim()[0] ?? "S").toUpperCase()}</span>
          <input
            value={s.userName}
            maxLength={20}
            autoComplete="given-name"
            onChange={(e) => s.patch({ userName: e.target.value })}
            placeholder="Ваше имя"
            aria-label="Имя"
            className="min-w-0 flex-1 rounded-md bg-transparent text-[24px] font-semibold tracking-[-0.035em] outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-lime"
          />
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/8 pt-4">
          {(
            [
              [s.nights.length, pluralRu(s.nights.length, ["ночь", "ночи", "ночей"])],
              [s.moods.length, pluralRu(s.moods.length, ["чек-ин", "чек-ина", "чек-инов"])],
              [practiceMin, "мин практик"],
            ] as const
          ).map(([v, k]) => (
            <div key={k}>
              <dd className="text-[22px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{v}</dd>
              <dt className="mt-1.5 text-[12px] text-ink-3">{k}</dt>
            </div>
          ))}
        </dl>
      </div>

      <Field label="Оформление">
        <AppearancePicker value={s.theme} onChange={(theme) => s.patch({ theme })} />
      </Field>

      <div className={cn(group, "mt-3")}>
        <Row icon={<AwardIcon />} title="Достижения" sub="Серии, рекорды и первые шаги" onClick={() => s.openSheet("awards")} />
        {s.weeklyGoal && <Row icon={<Sparkles />} title="Цель недели" sub={s.weeklyGoal.text} onClick={() => s.openSheet("recap")} />}
      </div>
      <div className="mt-3 space-y-3">
        <LocalAccountCard />
        <SubscriptionCard />
      </div>

      <Field label="Цель сна" hint={durationRu(spanMinutes(s.bedGoal, s.wakeGoal))}>
        <div className="flex gap-3">
          <TimeField label="Отбой" value={s.bedGoal} onChange={(bedGoal) => s.patch({ bedGoal })} />
          <TimeField label="Подъём" value={s.wakeGoal} onChange={(wakeGoal) => s.patch({ wakeGoal })} />
        </div>
        {remindersAvailable ? (
          <>
            <div className="glass mt-3 flex items-center justify-between gap-4 rounded-[22px] px-4 py-3">
              <span className="text-[15px]">Напоминать об отбое</span>
              <Toggle checked={s.reminder} onChange={(enabled) => { void toggleReminder("reminder", enabled) }} label="Напоминать об отбое" />
            </div>
            {s.reminder && (
              <div className="mt-3 flex">
                <TimeField label="Время" value={s.reminderTime} onChange={(reminderTime) => s.patch({ reminderTime })} />
              </div>
            )}
            <div className="glass mt-3 flex items-center justify-between gap-4 rounded-[22px] px-4 py-3">
              <span className="text-[15px]">Утренний чек-ин</span>
              <Toggle checked={s.morningReminder} onChange={(enabled) => { void toggleReminder("morningReminder", enabled) }} label="Утренний чек-ин" />
            </div>
            {s.morningReminder && <div className="mt-3 flex"><TimeField label="Время чек-ина" value={s.morningReminderTime} onChange={(morningReminderTime) => s.patch({ morningReminderTime })} /></div>}
          </>
        ) : (
          <p className="glass mt-3 rounded-[22px] px-4 py-3 text-[14px] text-ink-2">Напоминания доступны только в мобильном приложении Somna.</p>
        )}
      </Field>

      <Field label="Хронотип">
        <Segmented<Chronotype>
          label="Хронотип"
          id="profile-chrono"
          className="flex w-full"
          value={s.chronotype}
          onChange={(chronotype) => s.patch({ chronotype })}
          options={[
            { value: "early", label: "Жаворонок" },
            { value: "balanced", label: "Голубь" },
            { value: "night", label: "Сова" },
          ]}
        />
      </Field>

      <Field label="Громкость звуков" hint={`${s.volume}%`}>
        <Slider label="Громкость звуков" value={s.volume} onChange={(volume) => s.patch({ volume })} />
      </Field>

      <Field label="Данные">
        <div className={group}>
          <Row icon={<Download />} title="Экспорт данных" sub="Файл JSON со всеми записями" onClick={exportData} />
          <Row buttonRef={widgetActionRef} icon={<LayoutGrid />} title="Виджеты по умолчанию" onClick={() => setConfirm("widgets")} />
          <Row
            icon={<RotateCcw />}
            title="Пройти знакомство заново"
            onClick={() => {
              s.patch({ onboarded: false })
              close()
            }}
          />
          <Row buttonRef={journalActionRef} danger icon={<Trash2 />} title="Сбросить журнал" sub="Удалит записи и сбросит настройки" onClick={() => setConfirm("journal")} />
        </div>
        {confirm && (
          <div key={confirm} role="group" aria-label={confirm === "widgets" ? "Восстановить виджеты?" : "Сбросить журнал?"} className="mt-3">
            <p className="px-1 text-[13px] leading-relaxed text-ink-2">{confirm === "widgets" ? "Порядок, размеры и оформление стандартных виджетов вернутся к начальным настройкам. Ваши привычки сохранятся." : "Все записи будут удалены, а настройки сброшены. Имя и локальный профиль сохранятся. Это нельзя отменить — сначала экспортируйте журнал."}</p>
            <div className="mt-3 flex gap-2.5">
              <Button autoFocus variant="glass" className="flex-1" onClick={cancelConfirmation}>
                Отмена
              </Button>
              <Button
                variant={confirm === "journal" ? "danger" : "primary"}
                className="flex-1"
                onClick={() => {
                  if (confirm === "widgets") s.resetWidgets()
                  else s.resetAll()
                  cancelConfirmation()
                }}
              >
                {confirm === "widgets" ? "Да, восстановить" : "Да, сбросить"}
              </Button>
            </div>
          </div>
        )}
      </Field>
    </Sheet>
  )
}
