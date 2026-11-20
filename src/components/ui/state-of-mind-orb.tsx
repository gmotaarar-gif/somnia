import * as React from "react"
import { m, useReducedMotion } from "framer-motion"
import { MOTION_EASINGS, prefersReducedMotion } from "@/lib/motion"
import { sampleValencePalette, type RGB } from "@/lib/valence"
import { cn } from "@/lib/utils"

export interface StateOfMindOrbProps {
  /** Mood valence from -1 (Очень неприятно) to +1 (Очень приятно) */
  valence: number
  size?: number
  showCheckmark?: boolean
  className?: string
}

/**
 * Multi-layered organic luminous shape matching iOS State of Mind.
 * Honors `prefers-reduced-motion` and pauses off-screen via `IntersectionObserver`.
 * Includes `transitions.dev` `10-success-check` stroke-draw (500ms / 80ms) on `showCheckmark`.
 */
export function StateOfMindOrb({
  valence,
  size = 210,
  showCheckmark = false,
  className,
}: StateOfMindOrbProps) {
  const shouldReduceMotion = useReducedMotion()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const valenceRef = React.useRef(valence)
  const redrawStaticRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => {
    valenceRef.current = valence
  }, [valence])

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
    let smoothV = valenceRef.current
    const start = performance.now()

    const drawLayer = (
      cx: number,
      cy: number,
      baseR: number,
      lobes: number,
      amp: number,
      sharpness: number,
      phase: number,
      wobble: number,
      t: number,
      fillStyle: CanvasGradient | string,
      alpha: number
    ) => {
      const steps = 120
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const th = (i / steps) * Math.PI * 2
        const wave = Math.cos(lobes * th + phase)
        const shaped =
          sharpness > 0
            ? Math.sign(wave) * Math.pow(Math.abs(wave), 1 + sharpness)
            : wave
        const organic =
          wobble * (0.6 * Math.sin(3 * th - t * 1.1) + 0.4 * Math.cos(5 * th + t * 0.8))
        const r = baseR * (1 + amp * shaped + organic)
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

    const renderAt = (t: number, targetV: number, instant = false) => {
      smoothV = instant ? targetV : smoothV + (targetV - smoothV) * 0.12

      const w = cv.width
      const h = cv.height
      const cx = w / 2
      const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      const pal = sampleValencePalette(smoothV)
      const rgb = (c: RGB, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`

      const halo = ctx.createRadialGradient(cx, cy, w * 0.05, cx, cy, w * 0.49)
      halo.addColorStop(0, rgb(pal.mid, 0.44))
      halo.addColorStop(0.55, rgb(pal.outer, 0.2))
      halo.addColorStop(1, rgb(pal.outer, 0))
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, w, h)

      const neg = Math.max(0, -smoothV)
      const pos = Math.max(0, smoothV)
      const lobes = smoothV < -0.15 ? 7 : 6
      const amp = 0.035 + neg * 0.085 + pos * 0.055
      const sharpness = neg * 1.1
      const breath = 1 + 0.025 * Math.sin(t * 1.7)

      drawLayer(
        cx,
        cy,
        w * 0.355 * breath,
        lobes,
        amp * 1.15,
        sharpness,
        t * 0.28 + 0.35,
        0.022,
        t,
        rgb(pal.outer, 1),
        0.36
      )

      drawLayer(
        cx,
        cy,
        w * 0.31 * breath,
        lobes,
        amp,
        sharpness * 0.8,
        -t * 0.22 + 0.85,
        0.018,
        t,
        rgb(pal.mid, 1),
        0.54
      )

      const innerGrad = ctx.createRadialGradient(
        cx - w * 0.03,
        cy - h * 0.06,
        w * 0.02,
        cx,
        cy,
        w * 0.28
      )
      innerGrad.addColorStop(0, rgb(pal.core, 0.98))
      innerGrad.addColorStop(0.42, rgb(pal.mid, 0.95))
      innerGrad.addColorStop(1, rgb(pal.outer, 0.9))

      drawLayer(
        cx,
        cy,
        w * 0.255 * breath,
        lobes,
        amp * 0.85,
        sharpness * 0.5,
        t * 0.32,
        0.012,
        t,
        innerGrad,
        0.95
      )
    }

    if (reduce) {
      redrawStaticRef.current = () => renderAt(0, valenceRef.current, true)
      renderAt(0, valenceRef.current, true)
      return () => {
        redrawStaticRef.current = null
      }
    }

    const frame = (now: number) => {
      raf = 0
      const t = (now - start) / 1000
      renderAt(t, valenceRef.current, false)
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
  }, [valence])

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
            shouldReduceMotion ? { scale: 1, opacity: 1, rotate: 0 } : { scale: 0.72, opacity: 0, rotate: 24 }
          }
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.5, ease: MOTION_EASINGS.smoothOut }
          }
          className="pointer-events-none absolute h-13 w-13 drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
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
