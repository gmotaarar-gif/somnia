import * as React from "react"
import { TiltCard } from "@/components/ui/t-motion"
import { cn } from "@/lib/utils"
import type { GlowTheme } from "@/store/useSomnaStore"

/**
 * Upgraded Vasnev 180deg Multi-Lobe Dome + Zero-Blur Radial OLED Hollow-Core Palettes
 * Directly matches the 8 reference cards (`Calories`, `Water`, `Average Glucose`,
 * `Breath Volume`, `Daily Streak`, `Body Report`, `Sleep Quality`, `Training`).
 */
export const GLOW_PALETTES: Record<
  GlowTheme,
  {
    outer: string
    core: string
    accent: string
    label: string
    swatch: string
    isGlass?: boolean
  }
> = {
  "cobalt-indigo": {
    outer:
      "radial-gradient(90% 62% at 50% -6%, rgba(185,166,255,0.88) 0%, rgba(46,67,255,0.78) 42%, transparent 82%), radial-gradient(92% 62% at 50% 108%, rgba(109,125,255,0.82) 0%, rgba(29,59,148,0.68) 46%, transparent 84%), linear-gradient(180deg, #1d3b94 0%, #070b22 50%, #243fd6 100%)",
    core: "#050821",
    accent: "#a9b2ff",
    label: "Индиго",
    swatch: "#5a6cff",
  },
  "emerald-lime": {
    outer:
      "radial-gradient(85% 65% at 22% 8%, rgba(166,232,200,0.8) 0%, rgba(59,135,34,0.82) 42%, transparent 82%), radial-gradient(92% 66% at 52% 106%, rgba(179,198,103,0.88) 0%, rgba(44,126,86,0.72) 48%, transparent 84%), linear-gradient(180deg, #2d7a4a 0%, #061b12 52%, #599c58 100%)",
    core: "#05140d",
    accent: "#e8ff1f",
    label: "Изумруд",
    swatch: "#4ade80",
  },
  "plum-violet": {
    outer:
      "radial-gradient(88% 62% at 50% -4%, rgba(240,171,252,0.82) 0%, rgba(162,27,122,0.86) 40%, transparent 82%), radial-gradient(90% 64% at 50% 108%, rgba(185,147,204,0.85) 0%, rgba(107,33,168,0.72) 46%, transparent 84%), linear-gradient(180deg, #9b2278 0%, #0a0314 52%, #8e5cb5 100%)",
    core: "#0a0214",
    accent: "#f0abfc",
    label: "Пурпур",
    swatch: "#c084fc",
  },
  "burnt-copper": {
    outer:
      "radial-gradient(95% 68% at 50% 106%, rgba(229,86,52,0.94) 0%, rgba(153,44,22,0.74) 44%, transparent 82%), radial-gradient(78% 54% at 80% 12%, rgba(246,191,150,0.34) 0%, transparent 72%), linear-gradient(180deg, #1b0b06 0%, #090505 46%, #bf4f2b 100%)",
    core: "#0a0403",
    accent: "#ffb37a",
    label: "Терракота",
    swatch: "#fb923c",
  },
  "crimson-rose": {
    outer:
      "radial-gradient(85% 82% at 15% 48%, rgba(225,48,108,0.92) 0%, rgba(118,18,56,0.76) 46%, transparent 86%), radial-gradient(90% 58% at 50% -4%, rgba(255,179,214,0.76) 0%, transparent 76%), linear-gradient(180deg, #d83666 0%, #260312 52%, #a81c52 100%)",
    core: "#0d0207",
    accent: "#ffd0e6",
    label: "Рубин",
    swatch: "#ff2a85",
  },
  "rose-quartz": {
    outer:
      "radial-gradient(88% 60% at 50% -4%, rgba(240,255,179,0.78) 0%, rgba(151,186,24,0.78) 42%, transparent 82%), radial-gradient(90% 62% at 50% 106%, rgba(203,227,77,0.82) 0%, rgba(124,158,12,0.72) 44%, transparent 84%), linear-gradient(180deg, #88ab14 0%, #0d1202 52%, #a8c72e 100%)",
    core: "#0c1100",
    accent: "#e8ff1f",
    label: "Лайм",
    swatch: "#d9f99d",
  },
  "obsidian-neon": {
    outer:
      "radial-gradient(70% 60% at 88% 12%, rgba(88,80,141,0.42) 0%, transparent 72%), radial-gradient(70% 60% at 10% 92%, rgba(96,36,68,0.40) 0%, transparent 72%), linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(9,9,14,0.95) 48%, rgba(255,255,255,0.06) 100%)",
    core: "#050508",
    accent: "#e8ff1f",
    label: "Стекло",
    swatch: "#e8ff1f",
    isGlass: true,
  },
}

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
