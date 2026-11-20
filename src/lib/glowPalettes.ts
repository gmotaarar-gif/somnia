import type { GlowTheme } from "@/store/useSomnaStore"

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
