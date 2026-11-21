import * as React from "react"
import { LayoutGroup, motion } from "framer-motion"
import { Clock } from "lucide-react"
import { cn } from "@/lib/cn"
import { SPRING } from "@/lib/motion"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { label: string; size?: "sm" | "md" | "lg"; solid?: boolean }
>(function IconButton({ label, size = "md", solid, className, children, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "press grid shrink-0 place-items-center rounded-full text-ink [&_svg]:shrink-0",
        size === "sm" && "size-8 [&_svg]:size-[15px]",
        size === "md" && "size-11 [&_svg]:size-[18px]",
        size === "lg" && "size-14 [&_svg]:size-[22px]",
        solid ? "bg-lime text-lime-ink shadow-[0_10px_30px_-10px_rgb(217_242_74/0.7)]" : "glass",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...rest
}: ButtonProps & { variant?: "primary" | "glass" | "ghost" | "danger" }) {
  return (
    <button
      type={type}
      className={cn(
        "press inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-[-0.01em] disabled:opacity-40 [&_svg]:size-[18px]",
        variant === "primary" && "bg-lime text-lime-ink shadow-[0_14px_36px_-14px_rgb(217_242_74/0.8)]",
        variant === "glass" && "glass text-ink",
        variant === "ghost" && "text-ink-2 hover:text-ink",
        variant === "danger" && "bg-[#ff5d5d]/14 text-[#ff8f8f] ring-1 ring-inset ring-[#ff5d5d]/25",
        className
      )}
      {...rest}
    />
  )
}

export function Chip({
  active,
  className,
  type = "button",
  ...rest
}: ButtonProps & { active?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150",
        active ? "bg-ink text-black" : "glass text-ink-2 hover:text-ink",
        className
      )}
      {...rest}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn(
        "relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-250",
        checked ? "bg-lime" : "bg-white/16"
      )}
    >
      <motion.span
        initial={false}
        animate={{ x: checked ? 22 : 0 }}
        transition={SPRING}
        className={cn(
          "absolute left-[3px] top-[3px] size-6 rounded-full shadow-[0_2px_8px_rgb(0_0_0/0.4)]",
          checked ? "bg-lime-ink" : "bg-white"
        )}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
  label = "Выбор варианта",
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  /** Unique per instance: scopes the sliding thumb */
  id: string
  label?: string
  className?: string
}) {
  const instanceId = React.useId()
  return (
    <LayoutGroup id={`${id}-${instanceId}`}>
    <div role="radiogroup" aria-label={label} className={cn("glass inline-flex rounded-full p-1", className)}>
      {options.map((o, index) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (!options.some((option) => option.value === value) && index === 0) ? 0 : -1}
            onClick={() => { if (!active) onChange(o.value) }}
            onKeyDown={(event) => {
              let next: number
              switch (event.key) {
                case "ArrowRight":
                case "ArrowDown": next = (index + 1) % options.length; break
                case "ArrowLeft":
                case "ArrowUp": next = (index - 1 + options.length) % options.length; break
                case "Home": next = 0; break
                case "End": next = options.length - 1; break
                default: return
              }
              event.preventDefault()
              if (options[next].value !== value) onChange(options[next].value)
              const group = event.currentTarget.parentElement
              group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
            }}
            className={cn(
              "relative h-9 flex-1 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors duration-250",
              active ? "text-black" : "text-ink-2 hover:text-ink"
            )}
          >
            {active && (
              <motion.span layoutId="thumb" transition={SPRING} className="absolute inset-0 rounded-full bg-white" />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
    </LayoutGroup>
  )
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  track,
  className,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  label: string
  /** CSS background for the full track */
  track?: string
  className?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={cn("relative h-11 touch-none select-none rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-lime", className)}>
      <div
        className="absolute inset-x-0 top-1/2 h-[14px] -translate-y-1/2 overflow-hidden rounded-full bg-white/12"
        style={track ? { background: track } : undefined}
      >
        {!track && <div className="h-full rounded-full bg-white/85" style={{ width: `${pct}%` }} />}
      </div>
      <div
        className="pointer-events-none absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_4px_14px_rgb(0_0_0/0.5),inset_0_0_0_5px_rgb(255_255_255),inset_0_0_0_6px_rgb(0_0_0/0.12)]"
        style={{ left: `calc(14px + (100% - 28px) * ${pct / 100})` }}
      />
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label: string
}) {
  return (
    <div className="glass inline-flex h-11 items-center rounded-full p-1" role="group" aria-label={label}>
      <button
        type="button"
        aria-label="Меньше"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="press grid size-9 place-items-center rounded-full text-lg text-ink disabled:opacity-30"
      >
        −
      </button>
      <span className="w-9 text-center text-[15px] font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Больше"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="press grid size-9 place-items-center rounded-full text-lg text-ink disabled:opacity-30"
      >
        +
      </button>
    </div>
  )
}

export function TimeField({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <label className="glass relative flex min-w-0 flex-1 flex-col gap-1 rounded-[22px] px-4 py-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</span>
      <span className="flex items-center justify-between text-[26px] font-semibold tabular-nums tracking-[-0.02em]" aria-hidden>
        {value}
        <Clock className="size-[18px] text-ink-3" />
      </span>
      {/* Native picker stays invisible: the visible value is always 24-hour regardless of locale */}
      <input
        type="time"
        value={value}
        aria-label={label}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker()
          } catch {
            /* picker unavailable: typing still works */
          }
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </label>
  )
}

export function SectionHead({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.02em]">{title}</h2>
        {hint && <p className="mt-1 text-[13px] text-ink-3">{hint}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}
