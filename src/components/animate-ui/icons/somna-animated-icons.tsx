import * as React from "react"
import { m, useAnimation, useReducedMotion, type Variants } from "framer-motion"

export interface AnimatedIconProps {
  size?: number
  className?: string
  /** Plays the icon's keyframe animation whenever this value flips to true (or increments). */
  trigger?: boolean | number
  /** Enables gentle pointer-enter replay on fine-pointer desktop devices. */
  animateOnHover?: boolean
}

const MOON_STAR_VARIANTS: Record<"path1" | "group", Variants> = {
  path1: {
    initial: { rotate: 0, transition: { duration: 0.45, ease: "easeInOut" } },
    animate: {
      rotate: [0, -14, 8, -3, 0],
      transition: { duration: 0.85, ease: "easeInOut" },
    },
  },
  group: {
    initial: { scale: 1, opacity: 1 },
    animate: {
      scale: [1, 0.62, 1.2, 1],
      opacity: [1, 0.55, 1, 1],
      transition: { duration: 0.85, ease: "easeInOut", times: [0, 0.35, 0.7, 1] },
    },
  },
}

const SPARKLES_VARIANTS: Record<"group" | "plus" | "circle", Variants> = {
  group: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 0.9, 1.1, 1],
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  },
  plus: {
    initial: { scale: 1, rotate: 0 },
    animate: {
      scale: [1, 0.7, 1.2, 1],
      rotate: [0, 90],
      transition: { duration: 0.6, ease: "easeInOut", delay: 0.12 },
    },
  },
  circle: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 0.7, 1.2, 1],
      transition: { duration: 0.6, ease: "easeInOut", delay: 0.12 },
    },
  },
}

const BELL_RING_VARIANTS: Record<"group" | "clapper" | "waveRight" | "waveLeft", Variants> = {
  group: {
    initial: { rotate: 0 },
    animate: {
      rotate: [0, 18, -10, 9, -5, 3, 0],
      transition: { duration: 0.85, ease: "easeInOut" },
    },
  },
  clapper: {
    initial: { x: 0 },
    animate: {
      x: [0, -4, 4, -3.5, 3, -2, 1, 0],
      transition: { duration: 0.95, ease: "easeInOut" },
    },
  },
  waveRight: {
    initial: { y: 0, scale: 1 },
    animate: {
      y: [0, 1, -0.5, 0.5, -0.25, 0],
      scale: [1, 0.82, 0.92, 1, 1],
      transition: { duration: 0.75, ease: "easeInOut" },
    },
  },
  waveLeft: {
    initial: { y: 0, scale: 1 },
    animate: {
      y: [0, -0.5, 1, -0.5, 0.25, 0],
      scale: [1, 0.82, 0.92, 1, 1],
      transition: { duration: 0.75, ease: "easeInOut" },
    },
  },
}

function useIconTrigger(trigger: boolean | number | undefined) {
  const controls = useAnimation()
  const reduceMotion = useReducedMotion()
  const prevTriggerRef = React.useRef(trigger)

  const play = React.useCallback(() => {
    if (reduceMotion) return
    void controls.start("animate").then(() => {
      controls.set("initial")
    })
  }, [controls, reduceMotion])

  React.useEffect(() => {
    const prev = prevTriggerRef.current
    prevTriggerRef.current = trigger
    if (reduceMotion) return
    const shouldPlay =
      typeof trigger === "number"
        ? trigger !== prev && trigger > 0
        : Boolean(trigger) && !prev
    if (shouldPlay) {
      play()
    }
  }, [trigger, reduceMotion, play])

  const handlePointerEnter = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>, animateOnHover: boolean) => {
      if (!animateOnHover || e.pointerType !== "mouse") return
      play()
    },
    [play]
  )

  return { controls, handlePointerEnter }
}

/** Ported from `@animate-ui/icons-lucide-moon-star` onto Somna's unified `framer-motion` `m` runtime. */
export function AnimatedMoonStar({
  size = 18,
  className,
  trigger,
  animateOnHover = true,
}: AnimatedIconProps) {
  const { controls, handlePointerEnter } = useIconTrigger(trigger)

  return (
    <m.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      onPointerEnter={(e) => handlePointerEnter(e, animateOnHover)}
    >
      <m.path
        d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
        style={{ transformOrigin: "12px 12px" }}
        variants={MOON_STAR_VARIANTS.path1}
        initial="initial"
        animate={controls}
      />
      <m.g
        style={{ transformOrigin: "20px 5px" }}
        variants={MOON_STAR_VARIANTS.group}
        initial="initial"
        animate={controls}
      >
        <path d="M18 5h4" />
        <path d="M20 3v4" />
      </m.g>
    </m.svg>
  )
}

/** Ported from `@animate-ui/icons-lucide-sparkles` onto Somna's unified `framer-motion` `m` runtime. */
export function AnimatedSparkles({
  size = 14,
  className,
  trigger,
  animateOnHover = true,
}: AnimatedIconProps) {
  const { controls, handlePointerEnter } = useIconTrigger(trigger)

  return (
    <m.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      onPointerEnter={(e) => handlePointerEnter(e, animateOnHover)}
    >
      <m.g
        style={{ transformOrigin: "12px 12px" }}
        variants={SPARKLES_VARIANTS.group}
        initial="initial"
        animate={controls}
      >
        <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      </m.g>
      <m.path
        d="M20 2v4 M22 4h-4"
        style={{ transformOrigin: "20px 4px" }}
        variants={SPARKLES_VARIANTS.plus}
        initial="initial"
        animate={controls}
      />
      <m.circle
        cx="4"
        cy="20"
        r="2"
        style={{ transformOrigin: "4px 20px" }}
        variants={SPARKLES_VARIANTS.circle}
        initial="initial"
        animate={controls}
      />
    </m.svg>
  )
}

/** Ported from `@animate-ui/icons-lucide-bell-ring` onto Somna's unified `framer-motion` `m` runtime. */
export function AnimatedBellRing({
  size = 16,
  className,
  trigger,
  animateOnHover = true,
}: AnimatedIconProps) {
  const { controls, handlePointerEnter } = useIconTrigger(trigger)

  return (
    <m.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transformOrigin: "12px 3px" }}
      variants={BELL_RING_VARIANTS.group}
      initial="initial"
      animate={controls}
      onPointerEnter={(e) => handlePointerEnter(e, animateOnHover)}
    >
      <m.path
        d="M10.268 21a2 2 0 0 0 3.464 0"
        variants={BELL_RING_VARIANTS.clapper}
        initial="initial"
        animate={controls}
      />
      <m.path
        d="M22 8c0-2.3-.8-4.3-2-6"
        style={{ transformOrigin: "21px 5px" }}
        variants={BELL_RING_VARIANTS.waveRight}
        initial="initial"
        animate={controls}
      />
      <m.path
        d="M4 2C2.8 3.7 2 5.7 2 8"
        style={{ transformOrigin: "3px 5px" }}
        variants={BELL_RING_VARIANTS.waveLeft}
        initial="initial"
        animate={controls}
      />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </m.svg>
  )
}
