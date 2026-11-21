import { useId } from "react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import type { ThemeMode } from "@/lib/theme"

const MODES = [
  { value: "light", label: "Светлое", icon: Sun },
  { value: "dark", label: "Тёмное", icon: Moon },
  { value: "system", label: "Как в системе", icon: Monitor },
] as const

/** Native radio inputs keep tab, arrow-key and screen-reader behavior familiar. */
export function AppearancePicker({ value, onChange }: { value: ThemeMode; onChange: (mode: ThemeMode) => void }) {
  const id = useId()
  return (
    <fieldset>
      <legend className="sr-only">Оформление</legend>
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(({ value: mode, label, icon: Icon }) => (
          <label key={mode} className="appearance-choice relative min-w-0 cursor-pointer">
            <input className="peer sr-only" type="radio" name={`appearance-${id}`} value={mode} checked={value === mode} onChange={() => onChange(mode)} />
            <span className="appearance-preview" data-mode={mode} aria-hidden="true">
              <span className="appearance-mini-header"><span /><span /></span>
              <span className="appearance-mini-hero" />
              <span className="appearance-mini-cards"><span /><span /></span>
              <span className="appearance-check"><Check size={11} strokeWidth={3} /></span>
            </span>
            <span className="mt-2 flex min-h-8 items-center justify-center gap-1 text-center text-[11px] font-medium leading-tight text-ink-2 peer-checked:text-ink">
              <Icon size={12} className="shrink-0" aria-hidden="true" />{label}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-3">{value === "system" ? "Оформление меняется вместе с настройками устройства." : "Ваш выбор сохранится. Быстро сменить тему можно значком вверху экрана."}</p>
    </fieldset>
  )
}
