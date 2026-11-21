import * as React from "react"
import BlurText from "@/ui/BlurText"

/** A hue per feeling the check-in offers; unknown ones fall back to a quiet grey. */
export const EMOTION_COLOR: Record<string, string> = {
  "Тревога": "#ff7a59",
  "Усталость": "#8e8cf0",
  "Напряжение": "#ff5470",
  "Раздражение": "#ff4d3d",
  "Грусть": "#4f8cff",
  "Апатия": "#8a94b8",
  "Одиночество": "#7a6bf0",
  "Спокойствие": "#3ed1b8",
  "Рассеянность": "#c39bff",
  "Задумчивость": "#6aa8ff",
  "Скука": "#a7adbf",
  "Ровно": "#5fd08a",
  "Лёгкость": "#7be0ff",
  "Ясность": "#b6f27a",
  "Умиротворение": "#45d6a0",
  "Благодарность": "#ffb36b",
  "Вдохновение": "#ff7bd5",
  "Уверенность": "#f59e42",
  "Радость": "#ffe14d",
}
const colorOf = (name: string) => EMOTION_COLOR[name] ?? "#a7adbf"

const COLS = 11
const ROWS = 7
/** Where each feeling sits on the field, by how many there are (normalised 0–1). */
const RING: [number, number][] = [
  [0.16, 0.22], [0.5, 0.16], [0.84, 0.22], [0.84, 0.78], [0.5, 0.84], [0.16, 0.78],
  [0.5, 0.5], [0.3, 0.5], [0.7, 0.5], [0.5, 0.33],
]
const layout = (n: number): [number, number][] => {
  if (n <= 6) return RING.slice(0, n)
  if (n === 7) return RING.slice(0, 7)
  if (n === 8) return [...RING.slice(0, 6), RING[7], RING[8]]
  return RING.slice(0, n)
}

/**
 * The feelings laid out on a field of dots, as in a mood meter: carry the knob across it and the
 * dots near it swell in the colour of the feeling underneath, which is named above; let go to
 * add that feeling. A pointer shortcut only: the chips beside it are the same choice for keys
 * and screen readers.
 */
export function EmotionField({ options, chosen, onPick }: { options: string[]; chosen: string[]; onPick: (name: string) => void }) {
  const box = React.useRef<HTMLDivElement>(null)
  const [knob, setKnob] = React.useState<{ x: number; y: number } | null>(null)
  const held = React.useRef(false)

  const anchors = React.useMemo(() => layout(options.length).map(([x, y], i) => ({ name: options[i], x: x * COLS, y: y * ROWS })), [options])
  const nearest = (x: number, y: number) => {
    let best = anchors[0]
    let bestD = Infinity
    for (const a of anchors) {
      const d = (a.x - x) ** 2 + (a.y - y) ** 2
      if (d < bestD) {
        bestD = d
        best = a
      }
    }
    return best
  }
  const current = knob ? nearest(knob.x, knob.y) : null

  const place = (event: React.PointerEvent) => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return null
    // The dots fill the middle 88% of the field.
    const x = Math.max(0, Math.min(COLS, (((event.clientX - rect.left) / rect.width - 0.06) / 0.88) * COLS))
    const y = Math.max(0, Math.min(ROWS, (((event.clientY - rect.top) / rect.height - 0.06) / 0.88) * ROWS))
    setKnob({ x, y })
    return { x, y }
  }

  const dots = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c + 0.5
      const y = r + 0.5
      const home = nearest(x, y)
      const lit = chosen.includes(home.name) && Math.abs(home.x - x) < 0.6 && Math.abs(home.y - y) < 0.6
      const near = knob ? Math.exp(-((knob.x - x) ** 2 + (knob.y - y) ** 2) / 2.2) : 0
      const size = Math.max(lit ? 0.3 : 0, 0.07 + near * 0.27)
      const alpha = Math.max(lit ? 1 : 0, 0.32 + near * 0.68)
      dots.push(<circle key={`${r}-${c}`} cx={x} cy={y} r={size} fill={colorOf(home.name)} fillOpacity={alpha} />)
    }
  }

  return (
    <div aria-hidden>
      <div className="flex h-9 items-center justify-center">
        {current ? (
          <BlurText
            key={current.name}
            text={current.name}
            trigger="load"
            effect="focus"
            animateBy="letters"
            delay={22}
            stepDuration={0.3}
            color={colorOf(current.name)}
            className="text-[24px] font-medium tracking-[-0.03em]"
          />
        ) : (
          <span className="text-[15px] text-white/55">Проведите по полю</span>
        )}
      </div>
      <div
        ref={box}
        data-emotion-field
        className="glass relative mt-3 aspect-[11/7] w-full cursor-grab touch-none select-none overflow-hidden rounded-[28px] active:cursor-grabbing"
        style={current ? { backgroundImage: `radial-gradient(60% 60% at ${(knob!.x / COLS) * 100}% ${(knob!.y / ROWS) * 100}%, color-mix(in srgb, ${colorOf(current.name)} 22%, transparent), transparent)` } : undefined}
        onPointerDown={(event) => {
          try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* a scripted pointer */ }
          held.current = true
          place(event)
        }}
        onPointerMove={(event) => {
          if (held.current) place(event)
        }}
        onPointerUp={(event) => {
          if (!held.current) return
          held.current = false
          const at = place(event)
          if (at) onPick(nearest(at.x, at.y).name)
        }}
        onPointerCancel={() => { held.current = false }}
      >
        <svg viewBox={`0 0 ${COLS} ${ROWS}`} className="absolute inset-[6%] size-[88%]">{dots}</svg>
        {knob && (
          <span
            className="pointer-events-none absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85 shadow-[0_0_0_6px_rgb(255_255_255/0.14),0_8px_24px_rgb(0_0_0/0.35)] backdrop-blur-sm"
            style={{ left: `${6 + (knob.x / COLS) * 88}%`, top: `${6 + (knob.y / ROWS) * 88}%` }}
          />
        )}
      </div>
    </div>
  )
}
