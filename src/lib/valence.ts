export type RGB = [number, number, number]

const STOPS: { v: number; outer: RGB; mid: RGB; core: RGB }[] = [
  { v: -1.0, outer: [98, 46, 215], mid: [139, 92, 246], core: [224, 204, 255] },
  { v: -0.45, outer: [37, 99, 235], mid: [56, 189, 248], core: [224, 242, 254] },
  { v: 0.0, outer: [20, 148, 138], mid: [52, 211, 153], core: [236, 253, 245] },
  { v: 0.42, outer: [95, 168, 48], mid: [154, 230, 82], core: [252, 255, 240] },
  { v: 1.0, outer: [234, 118, 28], mid: [251, 191, 36], core: [255, 253, 235] },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function sampleValencePalette(valence: number) {
  const v = Math.max(-1, Math.min(1, valence))
  let i = 0
  while (i < STOPS.length - 2 && STOPS[i + 1].v < v) i++
  const s0 = STOPS[i]
  const s1 = STOPS[i + 1]
  const t = (v - s0.v) / Math.max(0.0001, s1.v - s0.v)
  const mix = (c0: RGB, c1: RGB): RGB => [
    Math.round(lerp(c0[0], c1[0], t)),
    Math.round(lerp(c0[1], c1[1], t)),
    Math.round(lerp(c0[2], c1[2], t)),
  ]
  return {
    outer: mix(s0.outer, s1.outer),
    mid: mix(s0.mid, s1.mid),
    core: mix(s0.core, s1.core),
  }
}

export function getValenceLabel(v: number): string {
  if (v <= -0.72) return "Очень неприятно"
  if (v <= -0.38) return "Неприятно"
  if (v <= -0.12) return "Слегка неприятно"
  if (v < 0.14) return "Нейтрально"
  if (v < 0.48) return "Слегка приятно"
  if (v < 0.78) return "Приятно"
  return "Очень приятно"
}
