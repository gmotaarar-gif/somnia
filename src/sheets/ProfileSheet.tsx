import * as React from "react"
import { Award as AwardIcon, Download } from "lucide-react"
import { durationRu, spanMinutes } from "@/lib/time"
import { useStore, type Chronotype } from "@/store/store"
import { Button, Segmented, Slider, TimeField, Toggle } from "@/ui/controls"
import { Field, Sheet } from "@/ui/Sheet"

export function ProfileSheet() {
  const s = useStore()
  const [confirm, setConfirm] = React.useState(false)
  const close = () => {
    setConfirm(false)
    s.openSheet(null)
  }

  return (
    <Sheet open={s.sheet === "profile"} onClose={close} title="Профиль" description="Данные хранятся только в этом браузере">
      <div className="profile-hero mb-3 flex items-center gap-4 rounded-[28px] p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#c9b9ef]/15 text-[24px] font-medium text-[#ded1fa]" aria-hidden>{(s.userName.trim()[0] ?? "S").toUpperCase()}</span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#d1c3ee]/70">Ваш ритм</div>
          <div className="mt-1 break-words text-[23px] font-semibold leading-tight tracking-[-0.035em]">{s.userName || "Место для себя"}</div>
          <div className="mt-1.5 text-[12px] text-ink-2">Маленькие шаги к спокойным ночам</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          [s.nights.length, "ночей"],
          [s.moods.length, "чек-инов"],
          [Math.round(s.sessions.reduce((a, x) => a + x.min, 0)), "мин практик"],
        ].map(([v, k]) => (
          <div key={k} className="glass rounded-[22px] px-3 py-3.5">
            <div className="text-[26px] font-medium leading-none tracking-[-0.04em] tabular-nums">{v}</div>
            <div className="mt-2 text-[11px] text-ink-2">{k}</div>
          </div>
        ))}
      </div>
      <Button variant="glass" className="mt-2.5 w-full" onClick={() => s.openSheet("awards")}>
        <AwardIcon /> Достижения
      </Button>

      <Field label="Имя">
        <input
          value={s.userName}
          maxLength={20}
          onChange={(e) => s.patch({ userName: e.target.value })}
          placeholder="Ваше имя"
          aria-label="Имя"
          className="glass h-12 w-full rounded-full px-5 text-[15px] outline-none placeholder:text-ink-3"
        />
      </Field>

      <Field label="Хронотип">
        <Segmented<Chronotype>
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

      <Field label="Цель сна" hint={durationRu(spanMinutes(s.bedGoal, s.wakeGoal))}>
        <div className="flex gap-3">
          <TimeField label="Отбой" value={s.bedGoal} onChange={(bedGoal) => s.patch({ bedGoal })} />
          <TimeField label="Подъём" value={s.wakeGoal} onChange={(wakeGoal) => s.patch({ wakeGoal })} />
        </div>
      </Field>

      <Field label="Напоминание">
        <div className="glass flex items-center justify-between gap-4 rounded-[22px] px-4 py-3">
          <span className="text-[15px]">Напоминать об отбое</span>
          <Toggle checked={s.reminder} onChange={(reminder) => s.patch({ reminder })} label="Напоминать об отбое" />
        </div>
        {s.reminder && (
          <div className="mt-3 flex">
            <TimeField label="Время" value={s.reminderTime} onChange={(reminderTime) => s.patch({ reminderTime })} />
          </div>
        )}
      </Field>

      <Field label="Громкость звуков" hint={`${s.volume}%`}>
        <Slider label="Громкость звуков" value={s.volume} onChange={(volume) => s.patch({ volume })} />
      </Field>

      {s.weeklyGoal && (
        <Field label="Цель недели">
          <div className="glass rounded-[22px] px-4 py-3 text-[15px]">{s.weeklyGoal.text}</div>
        </Field>
      )}

      <Field label="Данные">
        <div className="grid gap-2.5">
          <Button
            variant="glass"
            onClick={() => {
              s.patch({ onboarded: false })
              close()
            }}
          >
            Пройти знакомство заново
          </Button>
          <Button
            variant="glass"
            onClick={() => {
              const { nights, moods, sessions, worries, wellbeing, bedGoal, wakeGoal } = s
              const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), bedGoal, wakeGoal, nights, moods, sessions, worries, wellbeing }, null, 2)], { type: "application/json" })
              const a = document.createElement("a")
              a.href = URL.createObjectURL(blob)
              a.download = "somna-export.json"
              a.click()
              URL.revokeObjectURL(a.href)
              s.notify("Данные выгружены")
            }}
          >
            <Download /> Экспорт данных (JSON)
          </Button>
          <Button variant="glass" onClick={s.resetWidgets}>
            Вернуть виджеты по умолчанию
          </Button>
          {confirm ? (
            <div className="flex gap-2.5">
              <Button variant="glass" className="flex-1" onClick={() => setConfirm(false)}>
                Отмена
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  s.resetAll()
                  setConfirm(false)
                }}
              >
                Да, сбросить
              </Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Сбросить журнал к демо-данным
            </Button>
          )}
        </div>
      </Field>
    </Sheet>
  )
}
