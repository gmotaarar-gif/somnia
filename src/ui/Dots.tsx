import * as React from "react"
import { cn } from "@/lib/cn"

const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "11110", "10001", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "00100", "00100", "00100"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ":": ["0", "0", "1", "0", "1", "0", "0"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  ",": ["0", "0", "0", "0", "0", "0", "1"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
  "+": ["000", "000", "010", "111", "010", "000", "000"],
  "/": ["001", "001", "010", "010", "010", "100", "100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  " ": ["00", "00", "00", "00", "00", "00", "00"],
}

interface DotsProps {
  value: string | number
  className?: string
  /** Square pixels (bento reference) or round LEDs (widget reference) */
  shape?: "square" | "round"
  /** Skip the pop-in when the value changes every second */
  still?: boolean
}

/** Dot-matrix numerals drawn on a 5×7 grid; sized by font-size, coloured by `color`. */
export const Dots = React.memo(function Dots({ value, className, shape = "round", still }: DotsProps) {
  const text = String(value)
  const cells: { x: number; y: number }[] = []
  let cursor = 0
  for (const ch of text) {
    const glyph = GLYPHS[ch] ?? GLYPHS[" "]
    glyph.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === "1") cells.push({ x: cursor + x, y })
    })
    cursor += glyph[0].length + 1
  }
  const width = Math.max(1, cursor - 1)
  const size = shape === "square" ? 0.8 : 0.72
  const rx = shape === "square" ? 0.16 : size / 2

  return (
    <svg
      key={still ? undefined : text}
      viewBox={`0 0 ${width} 7`}
      className={cn("dots", className)}
      role="img"
      aria-label={text}
    >
      {cells.map((c, i) => (
        <rect
          key={i}
          className={still ? undefined : "d"}
          style={still ? undefined : ({ "--i": i } as React.CSSProperties)}
          x={c.x + (1 - size) / 2}
          y={c.y + (1 - size) / 2}
          width={size}
          height={size}
          rx={rx}
        />
      ))}
    </svg>
  )
})

/** Counts up to `value` on mount and whenever it changes; `format` turns the number into glyphs. */
export function DotsCount({
  value,
  format = (v) => String(Math.round(v)),
  ...rest
}: Omit<DotsProps, "value" | "still"> & { value: number; format?: (v: number) => string }) {
  const [shown, setShown] = React.useState(0)
  const from = React.useRef(0)
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value)
      from.current = value
      return
    }
    const start = from.current
    const t0 = performance.now()
    const dur = 900
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur)
      const eased = 1 - Math.pow(1 - k, 4)
      setShown(start + (value - start) * eased)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      from.current = value
    }
  }, [value])
  return <Dots value={format(shown)} still {...rest} />
}
