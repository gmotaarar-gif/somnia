import * as React from "react"
import "@/components/sl-ui/product-topics/buttons.css"
import "@/components/sl-ui/product-weekdays/buttons.css"
import "@/components/sl-ui/product-checklist/buttons.css"
import "@/components/sl-ui/product-volume/buttons.css"
import { haptic, prefersReducedMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Source-faithful React adapters for SL UI Library Product Controls:
 * - `product-topics`    (`product-topics/index.html`, `buttons.css`)
 * - `product-weekdays`  (`product-weekdays/index.html`, `buttons.css`, `buttons.js`)
 * - `product-checklist` (`product-checklist/index.html`, `buttons.css`)
 * - `product-volume`    (`product-volume/index.html`, `buttons.css`, `buttons.js`)
 *
 * Preserves every class hook, inline SVG path/viewBox/pathLength, keyboard contract,
 * exponential glide controller, and `prefers-reduced-motion` guard from installed packages.
 */

export type SLProductTone = "lime" | "rose" | "indigo" | "mint"

function toneClass(tone: SLProductTone): string {
  if (tone === "rose") return "somna-sl-product somna-sl-product--rose"
  if (tone === "indigo") return "somna-sl-product somna-sl-product--indigo"
  if (tone === "mint") return "somna-sl-product somna-sl-product--mint"
  return "somna-sl-product"
}

/* ── 1. SL UI `product-topics`: Swelling-fill multi-select chips ── */
export interface SLFocusTopicsProps {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  ariaLabel?: string
  tone?: SLProductTone
  className?: string
}

export function SLFocusTopics({
  options,
  selected,
  onChange,
  ariaLabel = "Выбор фокусов",
  tone = "lime",
  className,
}: SLFocusTopicsProps) {
  const selectedSet = React.useMemo(() => new Set(selected), [selected])

  const toggle = (item: string) => {
    haptic(6)
    const exists = selectedSet.has(item)
    onChange(exists ? selected.filter((x) => x !== item) : [...selected, item])
  }

  return (
    <div className={cn(toneClass(tone), className)}>
      <div className="pb pb-f pb-topics ck" role="group" aria-label={ariaLabel}>
        {options.map((opt) => {
          const checked = selectedSet.has(opt)
          return (
            <label key={opt} className="ck-chip">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt)}
              />
              <i />
              <b>{opt}</b>
            </label>
          )
        })}
      </div>
    </div>
  )
}

/* ── 2. SL UI `product-weekdays`: Seven swelling circular days + in-place rolling label ── */
const WEEKDAY_ITEMS = [
  { idx: 0, short: "Пн", full: "Понедельник" },
  { idx: 1, short: "Вт", full: "Вторник" },
  { idx: 2, short: "Ср", full: "Среда" },
  { idx: 3, short: "Чт", full: "Четверг" },
  { idx: 4, short: "Пт", full: "Пятница" },
  { idx: 5, short: "Сб", full: "Суббота" },
  { idx: 6, short: "Вс", full: "Воскресенье" },
] as const

function describeWeekdaysRu(days: number[]): string {
  const set = new Set(days)
  const n = set.size
  if (n === 7) return "Каждый день"
  if (n === 0) return "Дни не выбраны"
  const work = [0, 1, 2, 3, 4].every((d) => set.has(d)) && !set.has(5) && !set.has(6)
  if (work) return "По будням"
  const rest = set.has(5) && set.has(6) && n === 2
  if (rest) return "По выходным"
  if (n === 1) return "1 раз в неделю"
  if (n >= 2 && n <= 4) return `${n} дня в неделю`
  return `${n} дней в неделю`
}

export interface SLReminderWeekdaysProps {
  days: number[]
  onChange: (next: number[]) => void
  ariaLabel?: string
  tone?: SLProductTone
  className?: string
}

export function SLReminderWeekdays({
  days,
  onChange,
  ariaLabel = "Дни напоминаний",
  tone = "rose",
  className,
}: SLReminderWeekdaysProps) {
  const summary = describeWeekdaysRu(days)
  const [slotState, setSlotState] = React.useState<{ live: 0 | 1; slots: [string, string] }>(
    () => ({ live: 0, slots: [summary, ""] })
  )

  React.useEffect(() => {
    setSlotState((prev) => {
      if (prev.slots[prev.live] === summary) return prev
      const nextLive: 0 | 1 = prev.live === 0 ? 1 : 0
      const nextSlots: [string, string] = [...prev.slots] as [string, string]
      nextSlots[nextLive] = summary
      return { live: nextLive, slots: nextSlots }
    })
  }, [summary])

  const toggleDay = (idx: number) => {
    haptic(6)
    const exists = days.includes(idx)
    const next = exists
      ? days.filter((d) => d !== idx)
      : [...days, idx].sort((a, b) => a - b)
    onChange(next)
  }

  return (
    <div className={cn(toneClass(tone), className)}>
      <div className="pb pb-f pb-weekdays ck">
        <div className="ck-days" role="group" aria-label={ariaLabel}>
          {WEEKDAY_ITEMS.map((day) => {
            const checked = days.includes(day.idx)
            return (
              <label key={day.idx} className="ck-day">
                <input
                  type="checkbox"
                  checked={checked}
                  aria-label={day.full}
                  onChange={() => toggleDay(day.idx)}
                />
                <i />
                <b aria-hidden="true">{day.short}</b>
              </label>
            )
          })}
        </div>
        <div className="ck-swap" aria-live="polite">
          <span className={slotState.live === 0 ? "on" : undefined}>
            {slotState.slots[0]}
          </span>
          <span className={slotState.live === 1 ? "on" : undefined}>
            {slotState.slots[1]}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── 3. SL UI `product-checklist`: Progress rail + path-drawn SVG ticks + in-place status ── */
export interface SLChecklistItem {
  id: string
  label: string
}

export interface SLRitualChecklistProps {
  items: SLChecklistItem[]
  checkedIds: string[]
  onChange: (nextIds: string[]) => void
  emptyLabel?: string
  doneLabel?: string
  tone?: SLProductTone
  className?: string
}

export function SLRitualChecklist({
  items,
  checkedIds,
  onChange,
  emptyLabel = "Начните вечерний ритуал",
  doneLabel = "Готовы ко сну",
  tone = "lime",
  className,
}: SLRitualChecklistProps) {
  const total = Math.max(1, items.length)
  const checkedSet = React.useMemo(() => new Set(checkedIds), [checkedIds])
  const doneCount = items.filter((it) => checkedSet.has(it.id)).length

  const toggleItem = (id: string) => {
    haptic(8)
    const exists = checkedSet.has(id)
    onChange(exists ? checkedIds.filter((x) => x !== id) : [...checkedIds, id])
  }

  const headings = Array.from({ length: total + 1 }, (_, n) => {
    if (n === 0) return emptyLabel
    if (n === total) return doneLabel
    return `${n} из ${total} выполнено`
  })

  return (
    <div className={cn(toneClass(tone), className)}>
      <div
        className="pb pb-f pb-checklist ck ck-plate"
        style={{ "--n": doneCount, "--total": total } as React.CSSProperties}
      >
        <div className="ck-progress">
          <div className="ck-swap" aria-live="polite">
            {headings.map((text, idx) => (
              <span key={text} className={idx === doneCount ? "on" : undefined}>
                {text}
              </span>
            ))}
          </div>
          <span className="ck-rail">
            <i />
          </span>
        </div>

        {items.map((item) => {
          const checked = checkedSet.has(item.id)
          return (
            <label key={item.id} className="ck-row">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleItem(item.id)}
              />
              <span className="ck-box">
                <svg viewBox="0 0 22 22" aria-hidden="true">
                  <path
                    className="ck-tick"
                    pathLength={1}
                    d="M6 11.5l3.5 3.5L16 7.5"
                  />
                </svg>
              </span>
              <span className="ck-text">{item.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

/* ── 4. SL UI `product-volume`: Exponential-glide slider + live animated speaker waves SVG ── */
export interface SLSoundVolumeSliderProps {
  value: number // 0..100
  onChange: (next: number) => void
  ariaLabel?: string
  tone?: SLProductTone
  className?: string
}

export function SLSoundVolumeSlider({
  value,
  onChange,
  ariaLabel = "Громкость фона",
  tone = "rose",
  className,
}: SLSoundVolumeSliderProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const rootRef = React.useRef<HTMLDivElement>(null)
  const railRef = React.useRef<HTMLSpanElement>(null)
  const glideRef = React.useRef({
    current: clamped / 100,
    target: clamped / 100,
    held: false,
    frame: 0,
    last: 0,
  })

  const driveGlide = React.useCallback((nextFrac: number, isHeld: boolean) => {
    const g = glideRef.current
    g.target = Math.max(0, Math.min(1, nextFrac))
    g.held = isHeld
    const root = rootRef.current
    if (!root) return

    if (prefersReducedMotion()) {
      g.current = g.target
      root.style.setProperty("--p", g.current.toFixed(4))
      return
    }
    if (!g.frame) {
      g.last = performance.now()
      const tick = (now: number) => {
        const dt = Math.min(0.05, Math.max(0, (now - g.last) / 1000))
        g.last = now
        g.current += (g.target - g.current) * (1 - Math.exp(-dt * (g.held ? 36 : 15)))
        if (Math.abs(g.target - g.current) < 0.0007) g.current = g.target
        rootRef.current?.style.setProperty("--p", g.current.toFixed(4))
        g.frame = g.current === g.target ? 0 : requestAnimationFrame(tick)
      }
      g.frame = requestAnimationFrame(tick)
    }
  }, [])

  React.useEffect(() => {
    driveGlide(clamped / 100, false)
  }, [clamped, driveGlide])

  React.useEffect(() => {
    const g = glideRef.current
    return () => {
      if (g.frame) cancelAnimationFrame(g.frame)
    }
  }, [])

  const fracFromEvent = (clientX: number) => {
    const rail = railRef.current
    if (!rail) return clamped / 100
    const box = rail.getBoundingClientRect()
    const inset = 12
    return Math.min(1, Math.max(0, (clientX - box.left - inset) / Math.max(1, box.width - inset * 2)))
  }

  const commit = (next: number, held: boolean) => {
    const snapped = Math.max(0, Math.min(100, Math.round(next)))
    driveGlide(snapped / 100, held)
    if (snapped !== clamped) onChange(snapped)
  }

  return (
    <div className={cn(toneClass(tone), className)}>
      <div
        ref={rootRef}
        className="pb pb-f pb-volume sd sd-plate sd-row"
        style={{ "--p": (clamped / 100).toFixed(4) } as React.CSSProperties}
      >
        <svg
          className="sd-speaker"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500H4Z" />
          <path className="w1" d="M15.200 9.500a3.600 3.600 0 0 1 0 5" />
          <path className="w2" d="M17.800 7a7.200 7.200 0 0 1 0 10" />
          <path
            className="cross"
            pathLength={1}
            d="M15.500 9.500l5 5M20.500 9.500l-5 5"
          />
        </svg>
        <span
          ref={railRef}
          className="sd-rail"
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clamped}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            e.currentTarget.dataset.held = ""
            commit(fracFromEvent(e.clientX) * 100, true)
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
            commit(fracFromEvent(e.clientX) * 100, true)
          }}
          onPointerUp={(e) => {
            delete e.currentTarget.dataset.held
            driveGlide(clamped / 100, false)
          }}
          onPointerCancel={(e) => {
            delete e.currentTarget.dataset.held
            driveGlide(clamped / 100, false)
          }}
          onKeyDown={(e) => {
            const deltas: Record<string, number> = {
              ArrowLeft: -2,
              ArrowDown: -2,
              ArrowRight: 2,
              ArrowUp: 2,
              PageDown: -10,
              PageUp: 10,
            }
            if (e.key === "Home") {
              e.preventDefault()
              commit(0, false)
            } else if (e.key === "End") {
              e.preventDefault()
              commit(100, false)
            } else if (deltas[e.key] !== undefined) {
              e.preventDefault()
              commit(clamped + deltas[e.key], false)
            }
          }}
        >
          <span className="sd-line">
            <i />
          </span>
          <span className="sd-run">
            <span className="sd-thumb" />
          </span>
        </span>
        <span className="sd-num">{clamped}</span>
      </div>
    </div>
  )
}
