import * as React from "react"
import { m, useReducedMotion } from "framer-motion"
import { MOTION_EASINGS, prefersReducedMotion } from "@/lib/motion"
import { sampleSleepQualityPalette } from "@/lib/sleepQuality"
import type { RGB } from "@/lib/valence"
import { cn } from "@/lib/utils"

export interface SleepRestOrbProps {
  /** Morning readiness / sleep quality from 20 to 100 */
  quality: number
  /** Duration in minutes (used to subtly modulate the orbital sleep arc) */
  durationMin?: number
  size?: number
  showCheckmark?: boolean
  className?: string
}

/**
 * Nocturnal sleep counterpart to `StateOfMindOrb`.
 * Renders a breathing lunar aura + soft celestial halo + sleep-arc ring in live quality palette.
 * Honors `prefers-reduced-motion` and pauses off-screen via `IntersectionObserver`.
 */
export function SleepRestOrb({
  quality,
  durationMin = 480,
  size = 192,
  showCheckmark = false,
  className,
}: SleepRestOrbProps) {
  const shouldReduceMotion = useReducedMotion()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const qualityRef = React.useRef(quality)
  const durationRef = React.useRef(durationMin)
  const redrawStaticRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => {
    qualityRef.current = quality
    durationRef.current = durationMin
  }, [quality, durationMin])

  React.useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = Math.round(size * dpr)
    cv.height = Math.round(size * dpr)

    const reduce = prefersReducedMotion()
    let raf = 0
    let visible = true
    let smoothQ = qualityRef.current
    let smoothDur = durationRef.current
    const start = performance.now()

    const drawOrganicRing = (
      cx: number,
      cy: number,
      baseR: number,
      lobes: number,
      amp: number,
      phase: number,
      t: number,
      fillStyle: CanvasGradient | string,
      alpha: number
    ) => {
      const steps = 110
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const th = (i / steps) * Math.PI * 2
        const wave = Math.sin(lobes * th + phase)
        const drift = 0.015 * Math.cos(3 * th - t * 0.85)
        const r = baseR * (1 + amp * wave + drift)
        const x = cx + r * Math.cos(th)
        const y = cy + r * Math.sin(th)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = fillStyle
      ctx.fill()
      ctx.restore()
    }

    const renderAt = (t: number, targetQ: number, targetDur: number, instant = false) => {
      smoothQ = instant ? targetQ : smoothQ + (targetQ - smoothQ) * 0.12
      smoothDur = instant ? targetDur : smoothDur + (targetDur - smoothDur) * 0.14

      const w = cv.width
      const h = cv.height
      const cx = w / 2
      const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      const pal = sampleSleepQualityPalette(smoothQ)
      const rgb = (c: RGB, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`
      const normQ = (smoothQ - 20) / 80 // 0..1

      // Soft nocturnal canopy glow
      const halo = ctx.createRadialGradient(cx, cy, w * 0.06, cx, cy, w * 0.49)
      halo.addColorStop(0, rgb(pal.mid, 0.44))
      halo.addColorStop(0.54, rgb(pal.outer, 0.22))
      halo.addColorStop(1, rgb(pal.outer, 0))
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, w, h)

      const breath = 1 + 0.022 * Math.sin(t * 1.35)
      const restlessness = (1 - normQ) * 0.045
      const lobes = normQ < 0.35 ? 5 : 4

      // Outer mist layer
      drawOrganicRing(
        cx,
        cy,
        w * 0.345 * breath,
        lobes,
        0.028 + restlessness,
        t * 0.22,
        t,
        rgb(pal.outer, 1),
        0.34
      )

      // Mid luminous cloud
      drawOrganicRing(
        cx,
        cy,
        w * 0.295 * breath,
        lobes,
        0.022 + restlessness * 0.75,
        -t * 0.18 + 0.9,
        t,
        rgb(pal.mid, 1),
        0.52
      )

      // Inner nocturnal core sphere
      const coreGrad = ctx.createRadialGradient(
        cx - w * 0.05,
        cy - h * 0.06,
        w * 0.02,
        cx,
        cy,
        w * 0.255
      )
      coreGrad.addColorStop(0, rgb(pal.core, 0.98))
      coreGrad.addColorStop(0.45, rgb(pal.mid, 0.92))
      coreGrad.addColorStop(1, rgb(pal.outer, 0.88))

      drawOrganicRing(
        cx,
        cy,
        w * 0.24 * breath,
        lobes,
        0.014 + restlessness * 0.4,
        t * 0.26,
        t,
        coreGrad,
        0.95
      )

      // Subtle crescent shadow carved softly inside the orb (scales gently with quality)
      const crescentOffset = w * (0.085 + normQ * 0.03)
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, w * 0.225 * breath, 0, Math.PI * 2)
      ctx.clip()
      const shadowGrad = ctx.createRadialGradient(
        cx + crescentOffset,
        cy - w * 0.05,
        w * 0.02,
        cx + crescentOffset,
        cy - w * 0.05,
        w * 0.22
      )
      shadowGrad.addColorStop(0, "rgba(6, 7, 15, 0.42)")
      shadowGrad.addColorStop(0.65, "rgba(6, 7, 15, 0.14)")
      shadowGrad.addColorStop(1, "rgba(6, 7, 15, 0)")
      ctx.fillStyle = shadowGrad
      ctx.fillRect(0, 0, w, h)
      ctx.restore()

      // Precision orbital sleep-window ring & 24 subtle hour dots
      const ringR = w * 0.405
      const dotCount = 24
      for (let i = 0; i < dotCount; i++) {
        const a = (i / dotCount) * Math.PI * 2 - Math.PI / 2
        const major = i % 6 === 0
        ctx.beginPath()
        ctx.arc(
          cx + Math.cos(a) * ringR,
          cy + Math.sin(a) * ringR,
          major ? 1.5 * dpr : 0.9 * dpr,
          0,
          Math.PI * 2
        )
        ctx.fillStyle = major ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.14)"
        ctx.fill()
      }

      // Luminous duration arc along the orbital ring (0..12h normalized)
      const arcFrac = Math.max(0.14, Math.min(0.95, smoothDur / 600))
      const startAng = -Math.PI / 2 - (arcFrac * Math.PI)
      const endAng = -Math.PI / 2 + (arcFrac * Math.PI)
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, ringR, startAng, endAng)
      ctx.strokeStyle = rgb(pal.core, 0.72)
      ctx.lineWidth = Math.max(1.5, 2.2 * dpr)
      ctx.lineCap = "round"
      ctx.stroke()
      ctx.restore()
    }

    if (reduce) {
      redrawStaticRef.current = () =>
        renderAt(0, qualityRef.current, durationRef.current, true)
      renderAt(0, qualityRef.current, durationRef.current, true)
      return () => {
        redrawStaticRef.current = null
      }
    }

    const frame = (now: number) => {
      raf = 0
      const t = (now - start) / 1000
      renderAt(t, qualityRef.current, durationRef.current, false)
      if (visible) raf = requestAnimationFrame(frame)
    }

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
            if (visible && !raf) raf = requestAnimationFrame(frame)
            if (!visible && raf) {
              cancelAnimationFrame(raf)
              raf = 0
            }
          })
        : null
    io?.observe(cv)

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io?.disconnect()
    }
  }, [size])

  React.useEffect(() => {
    redrawStaticRef.current?.()
  }, [quality, durationMin])

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center transition-[width,height] duration-[var(--duration-medium)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none select-none",
        className
      )}
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {showCheckmark ? (
        <m.svg
          viewBox="0 0 48 48"
          initial={
            shouldReduceMotion
              ? { scale: 1, opacity: 1, rotate: 0 }
              : { scale: 0.72, opacity: 0, rotate: 24 }
          }
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.5, ease: MOTION_EASINGS.smoothOut }
          }
          className="pointer-events-none absolute h-13 w-13 drop-shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
        >
          <m.path
            d="M14 25.5L21 32.5L35 17.5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.5, delay: 0.08, ease: MOTION_EASINGS.smoothOut }
            }
          />
        </m.svg>
      ) : null}
    </div>
  )
}
