import * as React from "react"
import { Bell, Clock, Moon, Play, RotateCcw, Sparkles } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { Input, ToggleGroup, ToggleGroupItem } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/controls"
import { Button } from "@/components/ui/button"
import { useSomna } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const REMINDER_TIMES = ["21:30", "22:00", "22:30", "23:00"]

export function ProfileDrawer() {
  const {
    profileOpen,
    setProfileOpen,
    userName,
    setUserName,
    chronotype,
    setChronotype,
    bedtimeGoal,
    wakeGoal,
    reminderEnabled,
    setReminderEnabled,
    reminderTime,
    setReminderTime,
    eveningDetox,
    setEveningDetox,
    sleepHistory,
    moodHistory,
    setActiveTab,
    setOnboarded,
    resetWidgets,
    resetDemoData,
  } = useSomna()

  return (
    <Drawer open={profileOpen} onOpenChange={setProfileOpen}>
      <DrawerContent className="max-h-[90%]">
        <DrawerHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <DrawerTitle>Профиль Somna</DrawerTitle>
              <DrawerDescription>
                Персональные цели сна, уведомлений и журнала
              </DrawerDescription>
            </div>
            <span className="rounded-full border border-white/14 bg-white/[0.08] px-2.5 py-1 font-mono text-[10px] text-white/80">
              {sleepHistory.length} н. · {moodHistory.length} чек-инов
            </span>
          </div>
        </DrawerHeader>

        <div className="space-y-3.5 overflow-y-auto px-5 pb-8 no-scrollbar">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/65">Имя</label>
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          {/* Real Sleep Schedule Summary */}
          <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.04] p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-400/25 bg-indigo-500/15 text-indigo-200">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-medium text-white/65">
                  Целевое окно сна
                </div>
                <div className="font-mono text-sm font-semibold text-white">
                  {bedtimeGoal} – {wakeGoal}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="glass"
              onClick={() => {
                setProfileOpen(false)
                setActiveTab("sleep")
              }}
              className="rounded-full"
            >
              Изменить
            </Button>
          </div>

          {/* Chronotype Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/65">
              Привычный ритм
            </label>
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

          {/* Real Evening Detox Switch */}
          <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.04] p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-400/22 bg-indigo-500/15 text-indigo-200">
                <Moon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-medium text-white">
                  Вечерний детокс экрана
                </div>
                <div className="text-xs text-white/50">
                  Отсчёт до отбоя {bedtimeGoal}
                </div>
              </div>
            </div>
            <Switch
              checked={eveningDetox}
              onCheckedChange={setEveningDetox}
              labelOn="Вкл"
              labelOff="Выкл"
            />
          </div>

          {/* Real Reminder Toggle + Wired Reminder Time */}
          <div className="space-y-2.5 rounded-[22px] border border-white/10 bg-white/[0.04] p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-pink-400/24 bg-pink-500/15 text-pink-200">
                  <Bell className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-medium text-white">
                    Вечерний чек-ин эмоций
                  </div>
                  <div className="text-xs text-white/50">
                    {reminderEnabled
                      ? `Мягкое уведомление в ${reminderTime}`
                      : "Уведомления выключены"}
                  </div>
                </div>
              </div>
              <Switch
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
                labelOn="Вкл"
                labelOff="Выкл"
              />
            </div>

            {reminderEnabled ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {REMINDER_TIMES.map((t) => {
                  const active = reminderTime === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setReminderTime(t)}
                      className={cn(
                        "cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11px] transition-[background-color,border-color,color] duration-[var(--duration-quick)] motion-reduce:transition-none",
                        active
                          ? "border-[#e8ff1f]/42 bg-[#e8ff1f]/[0.16] font-semibold text-[#f2ff78]"
                          : "border-white/12 bg-white/[0.06] text-white/65 hover:bg-white/[0.12]"
                      )}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <div className="space-y-2 border-t border-white/10 pt-3">
            <Button
              variant="glass"
              className="w-full justify-start"
              onClick={() => {
                setProfileOpen(false)
                setOnboarded(false)
              }}
            >
              <Play className="h-4 w-4 text-[#e8ff1f]" />
              <span>Пройти онбординг заново</span>
            </Button>

            <Button
              variant="glass"
              className="w-full justify-start"
              onClick={() => {
                resetWidgets()
                setProfileOpen(false)
              }}
            >
              <RotateCcw className="h-4 w-4 text-indigo-300" />
              <span>Восстановить виджеты Wide Bento</span>
            </Button>

            <Button
              variant="glass"
              className="w-full justify-start"
              onClick={() => {
                resetDemoData()
                setProfileOpen(false)
              }}
            >
              <Sparkles className="h-4 w-4 text-emerald-300" />
              <span>Обновить демо-данные</span>
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default ProfileDrawer
