import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ---------- shadcn Switch (`transitions.dev` 27-toggle double-bounce + optional labelOn/labelOff) ----------
export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  labelOn?: string
  labelOff?: string
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, labelOn, labelOff, onCheckedChange, onPointerDown, onKeyDown, checked, defaultChecked, ...props }, ref) => {
  const [interacted, setInteracted] = React.useState(false)
  const [internalChecked, setInternalChecked] = React.useState(Boolean(defaultChecked))
  const isOn = checked !== undefined ? checked : internalChecked
  const hasLabel = Boolean(labelOn || labelOff)
  const activeLabel = isOn ? labelOn : (labelOff ?? labelOn)
  const travelPx = hasLabel ? "34px" : "20px"

  return (
    <SwitchPrimitives.Root
      checked={checked}
      defaultChecked={defaultChecked}
      data-on={isOn ? "true" : "false"}
      style={{ "--toggle-travel": travelPx } as React.CSSProperties}
      onPointerDown={(e) => {
        setInteracted(true)
        onPointerDown?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") setInteracted(true)
        onKeyDown?.(e)
      }}
      onCheckedChange={(val) => {
        setInteracted(true)
        if (checked === undefined) setInternalChecked(val)
        onCheckedChange?.(val)
      }}
      className={cn(
        "t-toggle peer relative inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full border border-white/16 bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-white/24 data-[state=checked]:bg-white/24",
        hasLabel ? "w-16" : "w-12",
        interacted && "is-init",
        className
      )}
      {...props}
      ref={ref}
    >
      {hasLabel && activeLabel ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute text-[11px] font-medium tracking-tight transition-opacity duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)]",
            isOn ? "left-2.5 text-white/95" : "right-2.5 text-white/55"
          )}
        >
          {activeLabel}
        </span>
      ) : null}
      <SwitchPrimitives.Thumb
        className={cn(
          "t-toggle-thumb pointer-events-none ml-[3px] block h-5.5 w-5.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.9)] ring-0"
        )}
      />
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

// ---------- shadcn Slider ----------
export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  rainbow?: boolean
}

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, rainbow = false, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none items-center select-none", className)}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        "relative h-2.5 w-full grow overflow-hidden rounded-full",
        rainbow ? "" : "bg-white/12"
      )}
      style={
        rainbow
          ? {
              background:
                "linear-gradient(90deg, #8b5cf6 0%, #3b82f6 24%, #14b8a6 46%, #84cc16 68%, #facc15 84%, #f97316 100%)",
            }
          : undefined
      }
    >
      {!rainbow ? (
        <SliderPrimitive.Range className="absolute h-full bg-[#e8ff1f]" />
      ) : null}
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "block cursor-grab rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.55)] ring-offset-background transition-transform duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] focus-visible:outline-none active:scale-110 active:cursor-grabbing motion-reduce:transition-none motion-reduce:active:scale-100",
        rainbow ? "h-7 w-7 border-2 border-white" : "h-5 w-5"
      )}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

// ---------- shadcn Badge (Soft Frosted Glass ONLY) ----------
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-md transition-[background-color,border-color,color] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default:
          "border-[#e8ff1f]/30 bg-[#e8ff1f]/[0.16] text-[#f2ff78] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        secondary:
          "border-white/14 bg-white/[0.09] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
        outline: "border-white/20 bg-white/[0.03] text-white/78",
        emerald:
          "border-emerald-400/28 bg-emerald-500/[0.15] text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
        violet:
          "border-purple-400/28 bg-purple-500/[0.15] text-purple-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
