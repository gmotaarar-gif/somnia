import * as React from "react"
import { motion } from "framer-motion"
import { usePrefersReducedMotion } from "./MotionProvider"
import { DUR, EASE_OUT } from "@/lib/motion"
import { sampleValencePalette } from "@/lib/valence"

// Tight ripples open into a quiet pebble, then a full, petal-like bloom.
const SHAPES = [
  { valence: -1, lobes: 8, depth: 10, radius: 46 },
  { valence: -0.5, lobes: 4, depth: 9, radius: 48 },
  { valence: 0, lobes: 3, depth: 3, radius: 50 },
  { valence: 0.5, lobes: 5, depth: 11, radius: 50 },
  { valence: 1, lobes: 7, depth: 13, radius: 51 },
]

function orbPath(valence: number) {
  const v = Math.max(-1, Math.min(1, valence))
  const index = Math.min(SHAPES.length - 2, Math.floor((v + 1) * 2))
  const from = SHAPES[index]
  const to = SHAPES[index + 1]
  const t = (v - from.valence) / (to.valence - from.valence)
  const radius = (shape: (typeof SHAPES)[number], angle: number) =>
    shape.radius + shape.depth * Math.cos(shape.lobes * angle) + 2 * Math.sin(2 * angle + 0.6)

  // Matching cubic segments let Motion interpolate the outline in every browser.
  const points = Array.from({ length: 64 }, (_, i) => {
    const angle = (i / 64) * Math.PI * 2 - Math.PI / 2
    const r = radius(from, angle) * (1 - t) + radius(to, angle) * t
    return { x: 80 + Math.cos(angle) * r, y: 80 + Math.sin(angle) * r }
  })
  const point = (i: number) => points[(i + points.length) % points.length]
  const xy = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`
  let path = `M${xy(points[0].x, points[0].y)}`
  for (let i = 0; i < points.length; i++) {
    const prev = point(i - 1)
    const start = point(i)
    const end = point(i + 1)
    const next = point(i + 2)
    path += `C${xy(start.x + (end.x - prev.x) / 6, start.y + (end.y - prev.y) / 6)} ${xy(end.x - (next.x - start.x) / 6, end.y - (next.y - start.y) / 6)} ${xy(end.x, end.y)}`
  }
  return `${path}Z`
}

/** Decorative mood feedback; the adjacent percentage and label carry the meaning. */
export function MoodOrb({ valence }: { valence: number }) {
  const id = React.useId()
  const reducedMotion = usePrefersReducedMotion()
  const palette = sampleValencePalette(valence)
  const d = orbPath(valence)
  const transition = { duration: reducedMotion ? 0 : DUR.medium, ease: EASE_OUT }
  const rgb = (color: number[]) => `rgb(${color.join(" ")})`

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 160 160" className="size-40 shrink-0 overflow-visible">
      <defs>
        <radialGradient id={`${id}-color`} cx="43%" cy="34%" r="68%">
          <stop offset="0%" stopColor="white" stopOpacity="0.95" />
          <motion.stop initial={false} offset="20%" animate={{ stopColor: rgb(palette.core) }} transition={transition} />
          <motion.stop initial={false} offset="58%" animate={{ stopColor: rgb(palette.mid) }} transition={transition} />
          <motion.stop initial={false} offset="100%" animate={{ stopColor: rgb(palette.outer) }} transition={transition} />
        </radialGradient>
        <radialGradient id={`${id}-shade`} cx="35%" cy="22%" r="80%">
          <stop offset="0%" stopColor="white" stopOpacity="0.32" />
          <stop offset="38%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.28" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <g>
        <motion.path
          initial={false}
          animate={{ d, fill: rgb(palette.mid) }}
          transition={transition}
          opacity="0.65"
          filter={`url(#${id}-glow)`}
          transform="translate(80 80) scale(1.12) translate(-80 -80)"
        />
        <motion.path
          initial={false}
          animate={{ d, fill: rgb(palette.outer) }}
          transition={transition}
          opacity="0.32"
          transform="translate(80 80) rotate(-12) scale(1.12) translate(-80 -80)"
        />
        <motion.path
          initial={false}
          animate={{ d, fill: rgb(palette.mid) }}
          transition={transition}
          opacity="0.5"
          transform="translate(80 80) rotate(9) scale(0.96) translate(-80 -80)"
        />
        <g transform="translate(80 80) scale(0.78) translate(-80 -80)">
          <motion.path initial={false} animate={{ d }} transition={transition} fill={`url(#${id}-color)`} />
          <motion.path initial={false} animate={{ d }} transition={transition} fill={`url(#${id}-shade)`} />
        </g>
      </g>
    </svg>
  )
}
