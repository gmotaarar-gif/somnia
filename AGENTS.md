# Somna

## Verify

- `npm run typecheck`
- `npm test` (CI runs Node 24). On Node 25+ the built-in `localStorage` shadows jsdom's and most suites fail: run `NODE_OPTIONS=--no-webstorage npm test`.
- `npm run build`

## Screen wave (`src/ui/ScreenTransition.tsx`)

- Tab changes run a `distortion-waves` wave. The library pictures the DOM from computed styles, so `src/index.css` keeps `border-style: none` on untouched elements; a border needs its style set together with its width (Tailwind's border utilities do this).
- Anything that must stay live above the wave goes in `overlay` (the dock).

## Design language

- Reference: dot-matrix bento widgets on a deep colour field. The field is the per-tab Aurora palette (`src/shell/Aurora.tsx`, `[data-tab]` tokens in `src/index.css`); cards carry the black: `.card` is smoked black, `data-tone` adds a gradient under a dark core, `.tile` nests inside a card.
- Lime is a marker only: current position, lit LED, done state. Actions are white (`bg-white text-black`), which flips by itself in the light theme outside `.card`.
- Titles are `font-medium` in sentence case; headline numbers are `Dots`.
- Instruments: `DotTrack`, `Bars` (LED columns), `Ruler` in `src/ui/charts.tsx`, `NightLine` in `src/ui/NightLine.tsx`.
