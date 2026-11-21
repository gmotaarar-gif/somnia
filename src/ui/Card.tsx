import * as React from "react"
import { cn } from "@/lib/cn"

export type CardTone =
  | "plum"
  | "lime"
  | "ember"
  | "forest"
  | "moss"
  | "rose"
  | "dusk"
  | "cobalt"
  | "coral"
  | "ink"
  | "violet"
  | "mint"
  | "night"
  | "sunset"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CardTone
  r?: "sm" | "md" | "lg"
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { tone, r = "md", className, ...rest },
  ref
) {
  return <div ref={ref} data-tone={tone} data-r={r} className={cn("card", className)} {...rest} />
})

export function CardTitle({
  children,
  sub,
  className,
}: {
  children: React.ReactNode
  sub?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[17px] font-semibold leading-tight tracking-[-0.025em]">{children}</div>
      {sub != null && <div className="mt-1.5 text-[12px] leading-snug text-ink-2">{sub}</div>}
    </div>
  )
}
