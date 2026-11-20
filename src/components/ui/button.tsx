import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[transform,background-color,border-color,box-shadow,color,opacity] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ff1f]/45 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "border border-[#e8ff1f]/28 bg-[#e8ff1f]/[0.15] text-[#f2ff78] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_4px_16px_rgba(232,255,31,0.08)] backdrop-blur-md hover:border-[#e8ff1f]/40 hover:bg-[#e8ff1f]/[0.23]",
        soft:
          "border border-white/18 bg-white/[0.13] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.26),0_4px_16px_rgba(0,0,0,0.22)] backdrop-blur-md hover:bg-white/[0.20]",
        white:
          "border border-white/22 bg-white/[0.15] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_16px_rgba(0,0,0,0.22)] backdrop-blur-md hover:bg-white/[0.22]",
        glass:
          "border border-white/14 bg-white/[0.08] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md hover:bg-white/[0.14]",
        outline:
          "border border-white/14 bg-white/[0.04] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md hover:bg-white/[0.10]",
        ghost: "text-white/75 hover:bg-white/[0.09] hover:text-white",
        destructive:
          "border border-rose-400/26 bg-rose-500/[0.15] text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md hover:bg-rose-500/[0.24]",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg:first-child]:pl-3.5 has-[>svg:last-child]:pr-3.5",
        sm: "h-8 rounded-full px-3.5 text-xs has-[>svg:first-child]:pl-2.5 has-[>svg:last-child]:pr-2.5",
        lg: "h-12 rounded-full px-6 text-[15px] has-[>svg:first-child]:pl-5 has-[>svg:last-child]:pr-5",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
