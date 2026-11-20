import type { RGB } from "@/lib/valence"

const SLEEP_STOPS: { q: number; outer: RGB; mid: RGB; core: RGB }[] = [
  { q: 20, outer: [159, 44, 102], mid: [251, 113, 133], core: [255, 228, 234] },
  { q: 48, outer: [79, 70, 229], mid: [129, 140, 248], core: [224, 231, 255] },
  { q: 68, outer: [14, 116, 144], mid: [56, 189, 248], core: [224, 242, 254] },
  { q: 84, outer: [16, 138, 104], mid: [52, 211, 153], core: [236, 253, 245] },
  { q: 100, outer: [124, 166, 22], mid: [232, 255, 31], core: [252, 255, 224] },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function sampleSleepQualityPalette(quality: number) {
  const q = Math.max(20, Math.min(100, quality))
  let i = 0
  while (i < SLEEP_STOPS.length - 2 && SLEEP_STOPS[i + 1].q < q) i++
  const s0 = SLEEP_STOPS[i]
  const s1 = SLEEP_STOPS[i + 1]
  const t = (q - s0.q) / Math.max(0.0001, s1.q - s0.q)
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

export function getSleepQualityLabel(quality: number): string {
  if (quality <= 36) return "Разбитое утро"
  if (quality <= 54) return "Сонливо"
  if (quality <= 70) return "Ровный сон"
  if (quality <= 86) return "Хороший отдых"
  return "Полная бодрость"
}

export function getSleepTone(quality: number): "rose" | "indigo" | "mint" | "lime" {
  if (quality <= 45) return "rose"
  if (quality <= 68) return "indigo"
  if (quality <= 84) return "mint"
  return "lime"
}
