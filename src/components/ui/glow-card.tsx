import * as React from "react"
import { TiltCard } from "@/components/ui/t-motion"
import { GLOW_PALETTES } from "@/lib/glowPalettes"
import { cn } from "@/lib/utils"
import type { GlowTheme } from "@/store/useSomnaStore"

export interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  theme?: GlowTheme
  contentClassName?: string
  coreOpacity?: number
  radialCore?: boolean
  tilt?: boolean
}

export function GlowCard({
  theme = "obsidian-neon",
  className,
  contentClassName,
  coreOpacity = 0.94,
  radialCore = true,
  tilt = false,
  children,
  ...props
}: GlowCardProps) {
  const pal = GLOW_PALETTES[theme] ?? GLOW_PALETTES["obsidian-neon"]

  const surface = (
    <div
      className={cn(
        "relative overflow-hidden rounded-[26px] text-white select-none transition-[transform,box-shadow] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none motion-reduce:transform-none",
        pal.isGlass && "bg-white/[0.045]",
        className
      )}
      {...props}
    >
      {/* Multi-lobe Vasnev luminous dome */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: pal.outer }}
      />

      {/* Zero-blur multi-stop radial OLED circular void (60fps mobile paint safe) */}
      {radialCore ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: coreOpacity,
            background: pal.isGlass
              ? "radial-gradient(circle at 50% 48%, rgba(5,5,8,0.96) 0%, rgba(5,5,8,0.82) 42%, rgba(5,5,8,0.34) 68%, transparent 88%)"
              : `radial-gradient(circle at 50% 48%, ${pal.core} 0%, ${pal.core}eb 38%, ${pal.core}80 62%, transparent 86%)`,
          }}
        />
      ) : null}

      {/* Subtle SVG film grain to prevent OLED banding */}
      <div
        aria-hidden
        className="oled-grain pointer-events-none absolute inset-0 z-10 opacity-[0.03] mix-blend-overlay"
      />

      {/* Directional 1px specular rim */}
      <div
        aria-hidden
        className="specular-rim pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
      />

      {/* Top edge crisp hairline highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          boxShadow: pal.isGlass
            ? "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(255,255,255,0.06)"
            : "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      />

      {/* Card content */}
      <div className={cn("relative z-10 h-full w-full p-4", contentClassName)}>
        {children}
      </div>
    </div>
  )

  if (tilt) {
    return (
      <TiltCard className="h-full w-full rounded-[26px]" maxTilt={10} glare>
        {surface}
      </TiltCard>
    )
  }

  return surface
}

/**
 * Unified dark-slate soft glass card for secondary data modules & pickers.
 */
export function SoftGlassCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[26px] border border-white/[0.1] bg-gradient-to-b from-[#151726]/95 to-[#0b0c14]/98 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_32px_rgba(0,0,0,0.42)]",
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="oled-grain pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/**
 * Concentric milky translucent sub-card matching nested inner score tiles (`Heart`/`Nutrients`).
 */
export function MilkySubCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-white/[0.16] bg-white/[0.13] p-3.5 text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] transition-[transform,background-color] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
