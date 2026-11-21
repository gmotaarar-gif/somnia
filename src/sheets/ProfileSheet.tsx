import * as React from "react"
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
