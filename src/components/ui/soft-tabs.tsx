"use client";

// Soft Tabs by Louis Studios.
// 200 more hand-made React components at https://studios.lou15.com/?ref=21st-code

import * as React from "react"

/** Built-in icon names, all drawn as clean vector strokes on one 48 unit grid. */
export type SoftTabsIconName = "rings" | "book" | "sun" | "pin" | "heart" | "home" | "search" | "bell" | "user" | "image"

/** One tab of the bar. */
export interface SoftTab {
  /** Unique id, passed to `onValueChange` and matched against `value`. */
  id: string
  /** Visible label under the icon (also the accessible name when labels are hidden). */
  label: string
  /** A built-in icon name, or your own node filling the icon box (for example an svg with a 48 x 48 viewBox, width and height 100%, drawn in `currentColor`). */
  icon?: SoftTabsIconName | React.ReactNode
}

export interface SoftTabsProps {
  tabs?: SoftTab[]
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  onAdd?: () => void
  showAdd?: boolean
  addLabel?: string
  ariaLabel?: string
  surface?: string
  background?: string
  accent?: string
  color?: string
  iridescence?: string[]
  glassBlobs?: string[]
  glyphColor?: string
  size?: number
  labels?: "auto" | "show" | "hide"
  grain?: number
  font?: string
  autoplay?: boolean
  time?: number
  className?: string
  style?: React.CSSProperties
}

// ---------- measured geometry (ref px, 138 px tall bar) ----------
const BAR_H = 138
const PAD = 10
const PITCH = 160
const PITCH_C = 116
const WELL_INSET = 9
const WELL_SHRINK = 3
const ICON = 48
const ICON_Y = 55.5
const ICON_Y_C = 69
const LABEL_BASE = 105.8
const LABEL_PX = 19.5
const GAP = 16
const CAP_W = 222
const CAP_W_C = 176
const CAP_H = 154
const CAP_DY = -3
const CAP_M = 30
const PLUS = 36.6
const PLUS_W = 5.6
const LOOP = 10
const LABEL_FLOOR = 11

// ---------- colour helpers ----------
type RGB = [number, number, number]
function rgbOf(c: string): RGB {
  const s = (c || "").trim()
  if (s[0] === "#") {
    let h = s.slice(1)
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((x) => x + x).join("")
    const n = parseInt(h.slice(0, 6), 16)
    if (!isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
  if (m) return [+m[1], +m[2], +m[3]]
  return [128, 128, 128]
}
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const rgba = (c: RGB, a = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${+a.toFixed(4)})`
const WHITE: RGB = [255, 255, 255]
const BLACK: RGB = [0, 0, 0]
const lum = (c: RGB) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255

// ---------- motion helpers ----------
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v: number) => {
  const t = clamp01(v)
  return t * t * (3 - 2 * t)
}
const smoother = (v: number) => {
  const t = clamp01(v)
  return t * t * t * (t * (t * 6 - 15) + 10)
}
type Seg = { t0: number; from: number; v0: number; to: number; w: number; z: number }
function springAt(s: Seg, t: number): [number, number] {
  const dt = Math.max(0, t - s.t0)
  const x0 = s.from - s.to
  const v0 = s.v0
  const w = s.w
  const z = s.z
  if (z >= 1) {
    const e = Math.exp(-w * dt)
    const B = v0 + w * x0
    return [s.to + e * (x0 + B * dt), e * (B - w * (x0 + B * dt))]
  }
  const a = z * w
  const wd = w * Math.sqrt(1 - z * z)
  const B = (v0 + a * x0) / wd
  const e = Math.exp(-a * dt)
  const c = Math.cos(wd * dt)
  const sn = Math.sin(wd * dt)
  return [s.to + e * (x0 * c + B * sn), e * ((-a * x0 + B * wd) * c + (-a * B - x0 * wd) * sn)]
}
function track(events: [number, number, number, number][], t: number, init: number): [number, number] {
  let seg: Seg = { t0: -1e9, from: init, v0: 0, to: init, w: 10, z: 1 }
  for (const [te, to, w, z] of events) {
    if (te > t) break
    const [x, v] = springAt(seg, te)
    seg = { t0: te, from: x, v0: v, to, w, z }
  }
  return springAt(seg, t)
}

const SEL_W = 12.5
const SEL_Z = 0.66
const DOWN_W = 34
const DOWN_Z = 1
const UP_W = 15
const UP_Z = 0.42

const SHEEN_T = 1.6
function sheenAt(s: number): [number, number] {
  if (s < 0 || s > SHEEN_T) return [0, 0]
  const x = s / SHEEN_T
  return [-1.5 + 3 * smoother(x), Math.sin(Math.PI * x) ** 2]
}

function showcase(n: number, start: number) {
  const changes: { t: number; to: number }[] = []
  const plusAt = 3.0
  if (n > 1) {
    changes.push({ t: 1.5, to: (start + 1) % n })
    const rest = n - 1
    for (let k = 0; k < rest; k++) changes.push({ t: rest === 1 ? 5.6 : 4.8 + (k * 2.6) / (rest - 1), to: (start + 2 + k) % n })
  }
  return { changes, plusAt }
}

// ---------- icons ----------
const HEX_DX = 17.3
const HEX_DY = 14.98
const RINGS: [number, number][] = [
  [24 - HEX_DX / 2, 24 - HEX_DY], [24 + HEX_DX / 2, 24 - HEX_DY],
  [24 - HEX_DX, 24], [24, 24], [24 + HEX_DX, 24],
  [24 - HEX_DX / 2, 24 + HEX_DY], [24 + HEX_DX / 2, 24 + HEX_DY],
]
const BOOK_L = "M24 11.6C21 8.4 15.6 6.5 10.2 6.6C4.6 6.7 1.9 9.2 1.9 13.2V35.6C1.9 38.7 3.8 40.1 6.4 39.4C12 34.2 19.4 35 24 41.6"
const BOOK_R = "M24 11.6C27 8.4 32.4 6.5 37.8 6.6C43.4 6.7 46.1 9.2 46.1 13.2V35.6C46.1 38.7 44.2 40.1 41.6 39.4C36 34.2 28.6 35 24 41.6"

function BuiltInIcon({ name }: { name: SoftTabsIconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (name) {
    case "rings":
      return (
        <g {...common} strokeWidth={4.4}>
          {RINGS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={5.5} />
          ))}
        </g>
      )
    case "book":
      return (
        <g {...common} strokeWidth={4.5}>
          <path d={BOOK_L} />
          <path d={BOOK_R} />
          <path d="M24 11.6V41.6" />
        </g>
      )
    case "sun":
      return (
        <g {...common} strokeWidth={4.3}>
          <circle cx={24} cy={24} r={8.2} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return <path key={i} d={`M${24 + Math.cos(a) * 15.2} ${24 + Math.sin(a) * 15.2}L${24 + Math.cos(a) * 20.6} ${24 + Math.sin(a) * 20.6}`} />
          })}
        </g>
      )
    case "pin":
      return (
        <g {...common} strokeWidth={4.3}>
          <path d="M24 43.2C24 43.2 9.6 30.6 9.6 19.6C9.6 11.3 16 5.2 24 5.2C32 5.2 38.4 11.3 38.4 19.6C38.4 30.6 24 43.2 24 43.2Z" />
          <circle cx={24} cy={19.4} r={5.3} />
        </g>
      )
    case "heart":
      return (
        <g {...common} strokeWidth={4.3}>
          <path d="M24 40.6C24 40.6 4.6 29.8 4.6 17.4C4.6 11.6 9 7.4 14.3 7.4C18.4 7.4 21.9 9.8 24 13.4C26.1 9.8 29.6 7.4 33.7 7.4C39 7.4 43.4 11.6 43.4 17.4C43.4 29.8 24 40.6 24 40.6Z" />
        </g>
      )
    case "home":
      return (
        <g {...common} strokeWidth={4.3}>
          <path d="M6.4 21.4L24 6.6L41.6 21.4V38.6C41.6 40.6 40.2 42 38.2 42H30.4V30.2H17.6V42H9.8C7.8 42 6.4 40.6 6.4 38.6Z" />
        </g>
      )
    case "search":
      return (
        <g {...common} strokeWidth={4.3}>
          <circle cx={21} cy={21} r={13.6} />
          <path d="M31.2 31.2L42 42" />
        </g>
      )
    case "bell":
      return (
        <g {...common} strokeWidth={4.3}>
          <path d="M11 33.6V21.4C11 13.9 16.8 7.8 24 7.8C31.2 7.8 37 13.9 37 21.4V33.6L40.4 37.2H7.6Z" />
          <path d="M19.6 42.4C20.6 43.9 22.2 44.6 24 44.6C25.8 44.6 27.4 43.9 28.4 42.4" />
          <path d="M24 3.6V7.8" />
        </g>
      )
    case "user":
      return (
        <g {...common} strokeWidth={4.3}>
          <circle cx={24} cy={15.8} r={9} />
          <path d="M7.4 42.4C8.6 33.6 15.4 28.6 24 28.6C32.6 28.6 39.4 33.6 40.6 42.4" />
        </g>
      )
    case "image":
      return (
        <g {...common} strokeWidth={4.3}>
          <rect x={4.6} y={8.6} width={38.8} height={30.8} rx={6.4} />
          <circle cx={16.6} cy={19.2} r={3.6} />
          <path d="M6 35.6L17.6 25.6L26.4 32.4L32.4 27.4L42 35" />
        </g>
      )
    default:
      return null
  }
}

const REACT: Record<string, [number, number, number, number]> = {
  rings: [0.12, 3.5, 60, 0],
  sun: [0.12, 3.5, 45, 0],
  book: [0.08, 4, 0, 0.16],
  pin: [0.06, 7, 0, 0],
  heart: [0.18, 2, 0, 0],
  home: [0.1, 5, 0, 0],
  search: [0.1, 3, -18, 0],
  bell: [0.08, 3, 16, 0],
  user: [0.1, 4, 0, 0],
  image: [0.1, 4, 0, 0],
  custom: [0.12, 4, 0, 0],
}

// ---------- the glass (WebGL) ----------
const VERT = `attribute vec2 aPos;
uniform vec2 uFull;
varying vec2 vP;
void main() {
  vP = vec2(aPos.x, -aPos.y) * 0.5 * uFull;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`
const FRAG = `precision highp float;
varying vec2 vP;
uniform vec2 uHalf;
uniform float uRad;
uniform float uPx;
uniform float uIris;
uniform float uPress;
uniform float uGrain;
uniform float uGlow;
uniform vec2 uSheen;
uniform vec4 uDrift;
uniform vec3 uMistCol;
uniform vec3 uSkyCol;
uniform vec3 uPeriCol;
uniform vec3 uRoseCol;
uniform vec3 uTealCol;
uniform vec3 uSlateCol;
uniform vec3 uDeepCol;
uniform vec3 uShadowCol;

float sdBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float blob(vec2 p, vec2 c, vec2 h, float r, float soft) {
  return 1.0 - smoothstep(-soft, soft, sdBox(p - c, h, r));
}
vec3 satb(vec3 c, float k) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return clamp(vec3(l) + (c - vec3(l)) * k, 0.0, 1.0);
}
vec4 over(vec4 top, vec4 under) {
  return top + under * (1.0 - top.a);
}

void main() {
  vec2 p = vP;
  float d = sdBox(p, uHalf, uRad);
  vec2 u = p / uHalf;

  float ds = sdBox(p - vec2(0.0, 12.0), uHalf - vec2(4.0, 6.0), uRad - 6.0);
  float sh = (1.0 - smoothstep(-10.0, 16.0, ds)) * 0.55 * (1.0 - 0.25 * uPress);
  vec4 res = vec4(uShadowCol * sh, sh);

  float ang = atan(p.y / uHalf.y, p.x / uHalf.x) - uIris;
  float wRose = pow(max(cos(ang - 0.1), 0.0), 1.75);
  float wMist = pow(max(cos(ang + 2.25), 0.0), 1.6);
  float wTop = pow(max(-sin(ang), 0.0), 2.0);
  float wLeft = pow(max(-cos(ang), 0.0), 2.0);
  float wCy = pow(max(cos(ang + 2.0), 0.0), 1.5);
  vec3 cyanCol = satb(uMistCol, 2.0);
  vec3 rimCol = mix(vec3(1.0, 1.0, 1.0), mix(uSkyCol, uPeriCol, 0.5), 0.4);
  rimCol = mix(rimCol, uRoseCol, wRose);
  rimCol = mix(rimCol, uMistCol, wMist * 0.9);
  float rimStr = (1.0 - 0.6 * wTop * (1.0 - wRose)) * (1.0 + 0.22 * uGlow);
  float rimW = 13.0 + 12.0 * wRose + 12.0 * wLeft;

  float og = exp(-max(d, 0.0) / 3.6) * step(0.0, d);
  vec3 glowCol = mix(rimCol, cyanCol, wCy * 0.6);
  glowCol = mix(glowCol, mix(uPeriCol, uRoseCol, 0.4), max(sin(ang), 0.0) * 0.6);
  float ga = min(og * (0.55 * wRose + 0.25 * (1.0 - wRose)) * rimStr, 1.0);
  res = over(vec4(glowCol * ga, ga), res);

  vec3 col = mix(uSkyCol, uPeriCol, smoothstep(-0.55, 0.53, u.y));
  float hl = 1.0 - smoothstep(0.0, 1.0, length((u - vec2(-0.98, -0.6)) * vec2(0.95, 1.3)));
  col = mix(col, uMistCol, hl * 0.85);
  col = mix(col, cyanCol, (1.0 - smoothstep(0.0, 0.55, length((u - vec2(-0.62, -0.05)) * vec2(1.0, 0.8)))) * 0.35);
  col = mix(col, satb(uSkyCol, 2.2), (1.0 - smoothstep(0.0, 0.5, length((u - vec2(0.0, -0.1)) * vec2(1.0, 0.8)))) * 0.8);

  float lensE = smoothstep(-17.6, 0.0, d);
  vec2 pl = p * (0.95 * (1.0 - 0.28 * lensE * lensE));
  vec2 q = pl * vec2(111.0 / uHalf.x, 1.0);
  float soft = 0.0;

  vec2 cl = vec2(-52.0, 16.5) + uDrift.xy;
  float bL = blob(q, cl, vec2(25.0, 40.0), 22.0, 14.0 + soft);
  vec3 lobe = satb(uPeriCol * 0.78, 1.24);
  vec3 cL = mix(uTealCol, lobe, smoothstep(-14.0, 34.0, q.y - cl.y));
  cL = mix(cL, lobe, smoothstep(4.0, 26.0, q.x - cl.x) * smoothstep(0.0, 30.0, q.y - cl.y) * 0.85);
  col = mix(col, cL, bL * 0.874);

  vec2 cs = vec2(49.0, -19.5) + uDrift.zw;
  col = mix(col, uSlateCol, blob(q, cs, vec2(27.0, 24.0), 14.0, 15.0 + soft) * 0.9);
  vec2 cd = vec2(54.0, 2.0) + uDrift.zw * 1.15;
  float notch = -6.0 * exp(-pow((q.x - cd.x + 15.4) / 8.0, 2.0));
  float bD = blob(q, cd, vec2(28.5, 32.0), 13.5, 5.0 + soft) * smoothstep(-21.0 + notch, 3.0 + notch, q.y - cd.y);
  vec3 cD = mix(mix(uDeepCol, uTealCol, 0.5), uDeepCol * 0.8, smoothstep(-15.0, 21.8, q.y - cd.y));
  col = mix(col, cD, bD);

  vec3 mistLight = mix(uMistCol, vec3(1.0, 1.0, 1.0), 0.45);
  col = mix(col, mistLight, uGlow * 0.07);
  float sa = u.x * 0.86 + u.y * 0.42;
  float sw = exp(-pow((sa - uSheen.x) / 0.34, 2.0)) * uSheen.y * smoothstep(1.0, -6.0, d) * (1.0 - 0.8 * bD) * (1.0 - 0.5 * bL);
  col = mix(col, mistLight, clamp(sw * 0.3, 0.0, 1.0));

  float band = exp(-pow(max(-d - 1.5, 0.0) / rimW, 2.2));
  col = mix(col, rimCol, band * rimStr);
  float wc = pow(max(cos(ang - 3.3416), 0.0), 3.0);
  float cres = exp(-pow(max(-d - 2.0, 0.0) / 16.0, 2.5)) * wc;
  col = mix(col, vec3(1.0, 1.0, 1.0), clamp(cres, 0.0, 1.0));
  float cyb = exp(-pow((d + 2.0) / 6.0, 2.0)) * wCy;
  col = mix(col, cyanCol, clamp(cyb * 0.6, 0.0, 1.0));
  float line = exp(-pow((d + 4.7) / 3.0, 2.0)) * smoothstep(0.15, 0.75, u.y) * (1.0 - wRose * 0.6);
  col = mix(col, vec3(1.0, 1.0, 1.0), line * 0.4);

  col = mix(col, uPeriCol, uPress * 0.2 * smoothstep(-26.0, -2.0, d) * smoothstep(0.4, -0.9, u.y));
  col += (hash(floor(gl_FragCoord.xy)) - 0.5) * 0.018 * uGrain;

  float e = max(3.0 - 1.5 * wLeft, 0.75 / uPx);
  float cov = smoothstep(e, -e, d);
  res = over(vec4(clamp(col, 0.0, 1.0) * cov, cov), res);
  gl_FragColor = res;
}`

type GlassGL = {
  gl: WebGLRenderingContext
  u: Record<string, WebGLUniformLocation | null>
  pr: WebGLProgram
  buf: WebGLBuffer | null
}
function makeGlass(canvas: HTMLCanvasElement): GlassGL | null {
  let gl: WebGLRenderingContext | null = null
  try {
    gl = (canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null
  } catch {
    gl = null
  }
  if (!gl || gl.isContextLost()) return null
  const sh = (type: number, src: string) => {
    const s = gl!.createShader(type)
    if (!s) return null
    gl!.shaderSource(s, src)
    gl!.compileShader(s)
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) return null
    return s
  }
  const vs = sh(gl.VERTEX_SHADER, VERT)
  const fs = sh(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const pr = gl.createProgram()
  if (!pr) return null
  gl.attachShader(pr, vs)
  gl.attachShader(pr, fs)
  gl.linkProgram(pr)
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null
  gl.useProgram(pr)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(pr, "aPos")
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const names = ["uFull", "uHalf", "uRad", "uPx", "uIris", "uPress", "uGrain", "uGlow", "uSheen", "uDrift", "uMistCol", "uSkyCol", "uPeriCol", "uRoseCol", "uTealCol", "uSlateCol", "uDeepCol", "uShadowCol"]
  const u: Record<string, WebGLUniformLocation | null> = {}
  for (const n of names) u[n] = gl.getUniformLocation(pr, n)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  return { gl, u, pr, buf }
}

let grainUrl: string | null = null
function grainTile(): string {
  if (grainUrl !== null) return grainUrl
  grainUrl = ""
  try {
    const N = 128
    const c = document.createElement("canvas")
    c.width = c.height = N
    const x = c.getContext("2d")
    if (!x) return grainUrl
    const img = x.createImageData(N, N)
    let s = 1234567
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    for (let i = 0; i < img.data.length; i += 4) {
      const g = (rnd() + rnd() + rnd() + rnd() - 2) * 0.5
      const v = Math.max(0, Math.min(255, Math.round(128 + g * 46)))
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    x.putImageData(img, 0, 0)
    grainUrl = c.toDataURL("image/png")
  } catch {
    grainUrl = ""
  }
  return grainUrl
}

function useReducedMotion() {
  const [r, setR] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setR(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])
  return r
}

const useIso = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

const CSS = `
.lsst-tab,.lsst-add{-webkit-tap-highlight-color:transparent;touch-action:manipulation;outline:none}
.lsst-tab .lsst-ring,.lsst-add .lsst-ring{opacity:0;transition:opacity .18s ease}
.lsst-tab:focus-visible .lsst-ring,.lsst-add:focus-visible .lsst-ring{opacity:1}
.lsst-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;padding:0}
`

const DEFAULT_TABS: SoftTab[] = [
  { id: "today", label: "today", icon: "sun" },
  { id: "places", label: "places", icon: "pin" },
  { id: "memories", label: "memories", icon: "rings" },
  { id: "journal", label: "journal", icon: "book" },
]

export function SoftTabs({
  tabs = DEFAULT_TABS,
  value,
  defaultValue,
  onValueChange,
  onAdd,
  showAdd = true,
  addLabel = "Add",
  ariaLabel = "Sections",
  surface = "#f8f9fb",
  background = "#eceff4",
  accent = "#160811",
  color = "#1a1b1d",
  iridescence = ["#e8f8ff", "#dbe9fd", "#a3c0f6", "#ffd0f4"],
  glassBlobs = ["#6599a7", "#9db2c6", "#003752"],
  glyphColor = "#ffffff",
  size = 96,
  labels = "auto",
  grain = 1,
  font = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  autoplay = false,
  time,
  className,
  style,
}: SoftTabsProps) {
  const n = Math.max(1, tabs.length)
  const reduced = useReducedMotion()
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")

  const fallbackId = (tabs[Math.min(2, tabs.length - 1)] || tabs[0])?.id
  const [inner, setInner] = React.useState<string | undefined>(defaultValue ?? fallbackId)
  const selId = value !== undefined ? value : inner
  const selIndex = Math.max(0, tabs.findIndex((t) => t.id === selId))
  const [stoppedShowcase, setStoppedShowcase] = React.useState(false)
  const showcaseOn = autoplay && !stoppedShowcase
  const startIndex = React.useRef(selIndex)

  const select = React.useCallback(
    (i: number) => {
      const t = tabs[i]
      if (!t) return
      if (value === undefined) setInner(t.id)
      if (t.id !== selId) onValueChange?.(t.id)
    },
    [tabs, value, selId, onValueChange],
  )

  const rootRef = React.useRef<HTMLDivElement>(null)
  const [boxW, setBoxW] = React.useState(0)
  useIso(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => setBoxW(el.clientWidth)
    measure()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const avail = Math.max(120, (boxW || 720) - 32)
  const capFull = showAdd ? GAP + CAP_W : 0
  const capCompact = showAdd ? GAP + CAP_W_C : 0
  const kWant = Math.max(0.2, size / BAR_H)
  const kFull = Math.min(kWant, avail / (2 * PAD + n * PITCH + capFull))
  const compact = labels === "hide" || (labels === "auto" && LABEL_PX * kFull < LABEL_FLOOR)
  const k = compact ? Math.min(kWant, avail / (2 * PAD + n * PITCH_C + capCompact)) : kFull
  const pitch = compact ? PITCH_C : PITCH
  const capW = compact ? CAP_W_C : CAP_W
  const barW = 2 * PAD + n * pitch
  const totalW = barW + (showAdd ? GAP + capW : 0)

  const irKey = iridescence.join(",")
  const blKey = glassBlobs.join(",")
  const C = React.useMemo(() => {
    const irList = irKey.split(",")
    const blList = blKey.split(",")
    const sf = rgbOf(surface)
    const bg = rgbOf(background)
    const dark = lum(sf) < 0.45
    const shade = mixRgb(bg, BLACK, dark ? 0.75 : 0.6)
    const light = mixRgb(sf, WHITE, dark ? 0.25 : 0.85)
    const well = mixRgb(sf, bg, 0.25)
    const ink = rgbOf(color)
    const muted = mixRgb(ink, sf, 0.585)
    const acc = rgbOf(accent)
    const ir = [0, 1, 2, 3].map((i) => rgbOf(irList[i] || irList[irList.length - 1] || "#d7e6fc"))
    const bl = [0, 1, 2].map((i) => rgbOf(blList[i] || blList[blList.length - 1] || "#6aa0b2"))
    const glassShadow = mixRgb(ir[2], BLACK, 0.18)
    return { sf, bg, shade, light, well, ink, muted, acc, ir, bl, glassShadow, dark }
  }, [surface, background, color, accent, irKey, blKey])

  const wellRef = React.useRef<HTMLDivElement>(null)
  const tabEls = React.useRef<(HTMLButtonElement | null)[]>([])
  const contentEls = React.useRef<(HTMLSpanElement | null)[]>([])
  const iconEls = React.useRef<(HTMLSpanElement | null)[]>([])
  const boldEls = React.useRef<(HTMLSpanElement | null)[]>([])
  const softEls = React.useRef<(HTMLSpanElement | null)[]>([])
  const pressWellEls = React.useRef<(HTMLSpanElement | null)[]>([])
  const capRef = React.useRef<HTMLDivElement>(null)
  const plusRef = React.useRef<SVGSVGElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const glassRef = React.useRef<GlassGL | null>(null)
  const [noGL, setNoGL] = React.useState(false)

  const live = React.useRef({
    sel: { t0: -1e9, from: selIndex, v0: 0, to: selIndex, w: SEL_W, z: SEL_Z } as Seg,
    chosenAt: tabs.map(() => -1e9) as number[],
    tabPress: tabs.map(() => ({ t0: -1e9, from: 0, v0: 0, to: 0, w: UP_W, z: UP_Z }) as Seg),
    plus: { t0: -1e9, from: 0, v0: 0, to: 0, w: UP_W, z: UP_Z } as Seg,
    hoverPlus: false,
    glow: 0,
    sheenAt: -1e9,
    lastT: 0,
    mounted: false,
    showWx: selIndex,
    showV: 0,
  })
  const timeRef = React.useRef(time)
  useIso(() => {
    timeRef.current = time
  }, [time])
  const now = () => (timeRef.current !== undefined ? timeRef.current : typeof performance !== "undefined" ? performance.now() / 1000 : 0)

  useIso(() => {
    if (live.current.chosenAt.length !== tabs.length) {
      live.current.chosenAt = tabs.map(() => -1e9)
      live.current.tabPress = tabs.map(() => ({ t0: -1e9, from: 0, v0: 0, to: 0, w: UP_W, z: UP_Z }))
    }
  }, [tabs.length])

  useIso(() => {
    const L = live.current
    if (!L.mounted) {
      L.mounted = true
      L.sel = { t0: -1e9, from: selIndex, v0: 0, to: selIndex, w: SEL_W, z: SEL_Z }
      return
    }
    if (L.sel.to === selIndex) return
    const t = now()
    const [x, v] = springAt(L.sel, t)
    L.sel = reduced ? { t0: -1e9, from: selIndex, v0: 0, to: selIndex, w: SEL_W, z: SEL_Z } : { t0: t, from: x, v0: v, to: selIndex, w: SEL_W, z: SEL_Z }
    if (!reduced) L.chosenAt[selIndex] = t
  }, [selIndex, reduced])

  const stopShowcase = () => {
    if (!showcaseOn) return
    const L = live.current
    const idx = Math.max(0, Math.min(n - 1, Math.round(L.showWx)))
    L.sel = { t0: now(), from: L.showWx, v0: L.showV, to: idx, w: SEL_W, z: SEL_Z }
    L.chosenAt = tabs.map(() => -1e9)
    setStoppedShowcase(true)
    if (tabs[idx] && tabs[idx].id !== selId) {
      if (value === undefined) setInner(tabs[idx].id)
      onValueChange?.(tabs[idx].id)
    }
  }

  const frameRef = React.useRef<(t: number) => void>(() => {})
  const renderFrame = (tAbs: number) => {
    const L = live.current
    const still = reduced
    const tm = ((tAbs % LOOP) + LOOP) % LOOP
    const sc = showcaseOn && !still
    let wx: number
    let wv: number
    const chosen: number[] = sc ? tabs.map(() => -1e9) : L.chosenAt.slice()
    const press: number[] = tabs.map(() => 0)
    let plusP = 0
    let glow = 0
    let sheenX = 0
    let sheenA = 0
    if (sc) {
      const s0 = Math.min(startIndex.current, n - 1)
      const { changes, plusAt } = showcase(n, s0)
      const ev = changes.map((c) => [c.t, c.to, SEL_W, SEL_Z] as [number, number, number, number])
      ;[wx, wv] = track(ev, tm, s0)
      for (const c of changes) if (c.t <= tm) chosen[c.to] = c.t + (tAbs - tm)
      for (let i = 0; i < n; i++) chosen[i] = chosen[i] > tAbs ? -1e9 : chosen[i]
      for (const c of changes) {
        const evs: [number, number, number, number][] = [[c.t - 0.2, 1, DOWN_W, DOWN_Z], [c.t + 0.04, 0, UP_W, UP_Z]]
        const [p] = track(evs, tm, 0)
        press[c.to] = Math.max(press[c.to], p)
      }
      ;[plusP] = track([[plusAt - 0.18, 1, DOWN_W, DOWN_Z], [plusAt + 0.16, 0, UP_W, UP_Z]], tm, 0)
      ;[sheenX, sheenA] = sheenAt(tm - plusAt + 0.05)
      L.showWx = wx
      L.showV = wv
    } else {
      ;[wx, wv] = still ? [L.sel.to, 0] : springAt(L.sel, tAbs)
      for (let i = 0; i < n; i++) press[i] = still ? L.tabPress[i]?.to ?? 0 : springAt(L.tabPress[i], tAbs)[0]
      plusP = still ? L.plus.to : springAt(L.plus, tAbs)[0]
      const dt = Math.min(0.05, Math.max(0, tAbs - L.lastT))
      L.lastT = tAbs
      const gTo = L.hoverPlus ? 1 : 0
      if (still || time !== undefined) L.glow = gTo
      else L.glow += (gTo - L.glow) * (1 - Math.exp(-dt * 5))
      glow = L.glow
      if (!still) [sheenX, sheenA] = sheenAt(tAbs - L.sheenAt)
    }

    const speed = Math.min(1, Math.abs(wv) / 7)
    const over = wx < 0 ? wx : wx > n - 1 ? wx - (n - 1) : 0
    const ov = Math.min(0.25, Math.abs(over))
    const sx = (1 + 0.1 * speed) * (1 - 1.1 * ov)
    const sy = (1 - 0.075 * speed) * (1 + 0.35 * ov)
    const wallShift = over === 0 ? 0 : Math.sign(over) * (0.12 * ov * pitch - ((1 - sx) * (pitch - WELL_SHRINK)) / 2)
    const wxd = wx - over
    const well = wellRef.current
    if (well) well.style.transform = `translate3d(${((wxd * pitch + wallShift) * k).toFixed(3)}px,0,0) scale(${sx.toFixed(4)},${sy.toFixed(4)})`

    for (let i = 0; i < n; i++) {
      const w = smooth(1 - Math.abs(wx - i))
      const icon = iconEls.current[i]
      const content = contentEls.current[i]
      const p = press[i] || 0
      if (icon) {
        const ic = mixRgb(C.muted, C.acc, w)
        icon.style.color = rgba(ic)
        const tau = tAbs - chosen[i]
        const tab = tabs[i]
        const key = typeof tab?.icon === "string" ? (tab.icon as string) : "custom"
        const [amt, lift, rotDeg, squeeze] = REACT[key] || REACT.custom
        let tr = ""
        if (!still && tau >= 0 && tau < 1.6) {
          const pop = Math.exp(-5.2 * tau) * Math.sin(13 * tau)
          const turn = rotDeg ? rotDeg * (1 - Math.exp(-6 * tau) * (1 + 6 * tau)) : 0
          const sq = squeeze ? 1 - squeeze * Math.exp(-6 * tau) * Math.sin(Math.PI * Math.min(1, tau / 0.5)) : 1
          tr = `translate3d(0,${(-lift * k * pop).toFixed(3)}px,0) rotate(${turn.toFixed(2)}deg) scale(${((1 + amt * pop) * sq).toFixed(4)},${(1 + amt * pop).toFixed(4)})`
        }
        icon.style.transform = tr
      }
      const b = boldEls.current[i]
      const s = softEls.current[i]
      if (b) b.style.opacity = w.toFixed(3)
      if (s) s.style.opacity = (1 - w).toFixed(3)
      if (content) content.style.transform = p > 0.001 || p < -0.001 ? `translate3d(0,${(1.6 * k * p).toFixed(3)}px,0) scale(${(1 - 0.045 * p).toFixed(4)})` : ""
      const pw = pressWellEls.current[i]
      if (pw) pw.style.opacity = (clamp01(p) * 0.75 * (1 - w)).toFixed(3)
    }

    const cap = capRef.current
    if (cap) {
      const pz = plusP
      cap.style.transform = Math.abs(pz) > 0.0005 ? `scale(${(1 - 0.035 * pz).toFixed(4)},${(1 - 0.06 * pz).toFixed(4)})` : ""
    }
    const plus = plusRef.current
    if (plus) {
      plus.style.transform = `translate(-50%,-50%) scale(${(1 - 0.08 * plusP).toFixed(4)})`
    }
    const G = glassRef.current
    const cv = canvasRef.current
    if (G && cv) {
      const { gl, u } = G
      const dpr = cv.width / Math.max(1, cv.clientWidth || 1)
      gl.viewport(0, 0, cv.width, cv.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      const dTm = still ? 0 : tm
      const ph = (Math.PI * 2 * dTm) / LOOP
      gl.uniform2f(u.uFull, capW + 2 * CAP_M, CAP_H + 2 * CAP_M)
      gl.uniform2f(u.uHalf, capW / 2, CAP_H / 2)
      gl.uniform1f(u.uRad, CAP_H / 2 - 2)
      gl.uniform1f(u.uPx, k * dpr)
      gl.uniform1f(u.uIris, 0.32 * Math.sin(ph))
      gl.uniform1f(u.uPress, clamp01(plusP))
      gl.uniform1f(u.uGrain, grain)
      gl.uniform1f(u.uGlow, clamp01(glow))
      gl.uniform2f(u.uSheen, sheenX, sheenA)
      gl.uniform4f(u.uDrift, 2.5 * Math.sin(ph), 2 * Math.sin(2 * ph + 0.6) - 2 * Math.sin(0.6), -1.5 * Math.sin(ph + 0.9) + 1.5 * Math.sin(0.9), 1 * Math.sin(2 * ph))
      const f = (c: RGB) => [c[0] / 255, c[1] / 255, c[2] / 255] as const
      gl.uniform3f(u.uMistCol, ...f(C.ir[0]))
      gl.uniform3f(u.uSkyCol, ...f(C.ir[1]))
      gl.uniform3f(u.uPeriCol, ...f(C.ir[2]))
      gl.uniform3f(u.uRoseCol, ...f(C.ir[3]))
      gl.uniform3f(u.uTealCol, ...f(C.bl[0]))
      gl.uniform3f(u.uSlateCol, ...f(C.bl[1]))
      gl.uniform3f(u.uDeepCol, ...f(C.bl[2]))
      gl.uniform3f(u.uShadowCol, ...f(C.glassShadow))
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
  }

  useIso(() => {
    frameRef.current = renderFrame
  })

  useIso(() => {
    const cv = canvasRef.current
    if (!cv || !showAdd) return
    const onLost = () => {
      glassRef.current = null
      setNoGL(true)
    }
    if (!glassRef.current) {
      const g = makeGlass(cv)
      if (!g) {
        setNoGL(true)
        return
      }
      glassRef.current = g
    }
    cv.addEventListener("webglcontextlost", onLost, { once: true })
    const dpr = Math.min(3, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
    cv.width = Math.round((capW + 2 * CAP_M) * k * dpr)
    cv.height = Math.round((CAP_H + 2 * CAP_M) * k * dpr)
    frameRef.current(time !== undefined ? time : now())
    return () => {
      cv.removeEventListener("webglcontextlost", onLost)
    }
  }, [k, capW, showAdd])

  useIso(() => {
    return () => {
      const g = glassRef.current
      if (g) {
        g.gl.deleteBuffer(g.buf)
        g.gl.deleteProgram(g.pr)
      }
      glassRef.current = null
    }
  }, [])

  useIso(() => {
    if (time !== undefined) frameRef.current(time)
  })
  React.useEffect(() => {
    if (time !== undefined) return
    const el = rootRef.current
    let raf = 0
    let onScreen = true
    const t0 = now()
    const loop = () => {
      raf = 0
      if (!onScreen || (typeof document !== "undefined" && document.hidden)) return
      frameRef.current(now() - (showcaseOn ? t0 : 0))
      raf = requestAnimationFrame(loop)
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }
    let io: IntersectionObserver | null = null
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((es) => {
        onScreen = es.some((e) => e.isIntersecting)
        if (onScreen) kick()
      })
      io.observe(el)
    }
    const vis = () => kick()
    document.addEventListener("visibilitychange", vis)
    kick()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      io?.disconnect()
      document.removeEventListener("visibilitychange", vis)
    }
  }, [time, showcaseOn, reduced])

  const pressTab = (i: number, down: boolean) => {
    const L = live.current
    const t = now()
    const s = L.tabPress[i]
    if (!s) return
    const [x, v] = springAt(s, t)
    L.tabPress[i] = down ? { t0: t, from: x, v0: v, to: 1, w: DOWN_W, z: DOWN_Z } : { t0: t, from: x, v0: v, to: 0, w: UP_W, z: UP_Z }
  }
  const pressPlus = (down: boolean) => {
    const L = live.current
    const t = now()
    const [x, v] = springAt(L.plus, t)
    L.plus = down ? { t0: t, from: x, v0: v, to: 1, w: DOWN_W, z: DOWN_Z } : { t0: t, from: x, v0: v, to: 0, w: UP_W, z: UP_Z }
  }
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    let next = -1
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = n - 1
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      stopShowcase()
      select(i)
      return
    }
    if (next >= 0) {
      e.preventDefault()
      stopShowcase()
      tabEls.current[next]?.focus()
      select(next)
    }
  }

  const px = (v: number) => `${+(v * k).toFixed(3)}px`
  const { shade, light, sf, bg } = C
  const barShadow = [
    `0 ${px(-7)} ${px(15)} ${rgba(light, C.dark ? 0.12 : 0.75)}`,
    `0 ${px(2.5)} ${px(3.5)} ${rgba(light, C.dark ? 0.1 : 0.8)}`,
    `0 ${px(13)} ${px(16)} ${px(-3)} ${rgba(shade, 0.22)}`,
    `${px(5)} ${px(4)} ${px(16)} ${rgba(shade, 0.045)}`,
    `0 ${px(26)} ${px(46)} ${px(-12)} ${rgba(shade, 0.09)}`,
    `inset 0 ${px(2)} ${px(2)} ${rgba(light, 0.9)}`,
    `inset ${px(-3)} ${px(-5)} ${px(10)} ${rgba(shade, 0.045)}`,
    `inset 0 ${px(-1.5)} ${px(1)} ${rgba(light, 0.7)}`,
  ].join(", ")
  const wellH = BAR_H - 2 * WELL_INSET
  const wellW = pitch - WELL_SHRINK
  const wellShadow = [
    `inset 0 ${px(4)} ${px(5)} ${px(-1)} ${rgba(shade, 0.08)}`,
    `inset 0 ${px(8)} ${px(12)} ${px(-2)} ${rgba(shade, 0.17)}`,
    `inset ${px(-3)} ${px(3)} ${px(9)} ${rgba(shade, 0.03)}`,
    `inset 0 ${px(-2)} ${px(2)} ${rgba(light, 0.85)}`,
    `0 ${px(1.2)} ${px(1)} ${rgba(light, 0.8)}`,
  ].join(", ")
  const pressShadow = [`inset 0 ${px(3)} ${px(6)} ${rgba(shade, 0.1)}`, `inset 0 ${px(-1.5)} ${px(2)} ${rgba(light, 0.7)}`].join(", ")
  const ringShadow = `0 0 0 ${px(2.2)} ${rgba(C.acc, 0.16)}, 0 0 ${px(16)} ${px(3)} ${rgba(C.acc, 0.1)}`
  const tile = typeof document !== "undefined" ? grainTile() : ""
  const iconY = compact ? ICON_Y_C : ICON_Y
  const capLeft = barW + GAP
  const capTop = (BAR_H - CAP_H) / 2 + CAP_DY
  const fbIr = C.ir
  const fbBl = C.bl

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 360,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background: rgba(bg),
        fontFamily: font,
        ...style,
      }}
    >
      <style>{CSS}</style>
      {grain > 0 && tile ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: `url(${tile})`,
            backgroundSize: "128px 128px",
            mixBlendMode: "overlay",
            opacity: Math.min(1, grain),
          }}
        />
      ) : null}
      <div style={{ position: "relative", width: px(totalW), height: px(BAR_H) }}>
        <div
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation="horizontal"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: px(barW),
            height: px(BAR_H),
            borderRadius: px(BAR_H / 2),
            background: `linear-gradient(160deg, ${rgba(mixRgb(sf, WHITE, C.dark ? 0.08 : 0.25))} 0%, ${rgba(sf)} 45%, ${rgba(mixRgb(sf, bg, 0.12))} 100%)`,
            boxShadow: barShadow,
          }}
        >
          <div
            ref={wellRef}
            aria-hidden
            style={{
              position: "absolute",
              left: px(PAD + WELL_SHRINK / 2),
              top: px(WELL_INSET),
              width: px(wellW),
              height: px(wellH),
              borderRadius: px(wellH / 2),
              background: rgba(C.well),
              boxShadow: wellShadow,
              transformOrigin: "50% 50%",
            }}
          />
          {tabs.map((tab, i) => {
            const selected = i === selIndex
            const icon = tab.icon
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabEls.current[i] = el
                }}
                id={`${uid}-tab-${i}`}
                className="lsst-tab"
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={compact ? tab.label : undefined}
                tabIndex={selected ? 0 : -1}
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  stopShowcase()
                  pressTab(i, true)
                }}
                onPointerUp={() => pressTab(i, false)}
                onPointerCancel={() => pressTab(i, false)}
                onPointerLeave={() => pressTab(i, false)}
                onClick={() => {
                  stopShowcase()
                  select(i)
                }}
                onKeyDown={(e) => onTabKey(e, i)}
                style={{
                  position: "absolute",
                  left: px(PAD + i * pitch),
                  top: 0,
                  width: px(pitch),
                  height: px(BAR_H),
                  margin: 0,
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                <span
                  className="lsst-ring"
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: px(WELL_SHRINK / 2),
                    top: px(WELL_INSET),
                    width: px(wellW),
                    height: px(wellH),
                    borderRadius: px(wellH / 2),
                    boxShadow: ringShadow,
                    pointerEvents: "none",
                  }}
                />
                <span
                  ref={(el) => {
                    pressWellEls.current[i] = el
                  }}
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: px(WELL_SHRINK / 2 + 6),
                    top: px(WELL_INSET + 5),
                    width: px(wellW - 12),
                    height: px(wellH - 10),
                    borderRadius: px(wellH / 2),
                    background: rgba(C.well, 0.6),
                    boxShadow: pressShadow,
                    opacity: 0,
                    pointerEvents: "none",
                  }}
                />
                <span
                  ref={(el) => {
                    contentEls.current[i] = el
                  }}
                  style={{ position: "absolute", inset: 0, display: "block", pointerEvents: "none", transformOrigin: `50% ${px(iconY)}` }}
                >
                  <span
                    ref={(el) => {
                      iconEls.current[i] = el
                    }}
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: `calc(50% - ${px(ICON / 2)})`,
                      top: px(iconY - ICON / 2),
                      width: px(ICON),
                      height: px(ICON),
                      display: "block",
                      color: rgba(selected ? C.acc : C.muted),
                      transformOrigin: "50% 50%",
                    }}
                  >
                    {typeof icon === "string" ? (
                      <svg viewBox="0 0 48 48" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
                        <BuiltInIcon name={icon as SoftTabsIconName} />
                      </svg>
                    ) : (
                      icon
                    )}
                  </span>
                  {compact ? (
                    <span className="lsst-sr">{tab.label}</span>
                  ) : (
                    <>
                      <span
                        ref={(el) => {
                          softEls.current[i] = el
                        }}
                        style={labelStyle(k, LABEL_BASE, 560, rgba(C.muted), selected ? 0 : 1)}
                      >
                        {tab.label}
                      </span>
                      <span
                        ref={(el) => {
                          boldEls.current[i] = el
                        }}
                        aria-hidden
                        style={labelStyle(k, LABEL_BASE, 650, rgba(C.ink), selected ? 1 : 0)}
                      >
                        {tab.label}
                      </span>
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>
        {showAdd ? (
          <button
            type="button"
            className="lsst-add"
            aria-label={addLabel}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              stopShowcase()
              pressPlus(true)
            }}
            onPointerUp={() => pressPlus(false)}
            onPointerCancel={() => pressPlus(false)}
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse") return
              const L = live.current
              L.hoverPlus = true
              const t = now()
              if (t - L.sheenAt > SHEEN_T) L.sheenAt = t
            }}
            onPointerLeave={() => {
              live.current.hoverPlus = false
              pressPlus(false)
            }}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") pressPlus(true)
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") pressPlus(false)
            }}
            onClick={() => {
              stopShowcase()
              const L = live.current
              const t = now()
              if (t - L.sheenAt > SHEEN_T * 0.6) L.sheenAt = t
              onAdd?.()
            }}
            style={{
              position: "absolute",
              left: px(capLeft),
              top: px(capTop),
              width: px(capW),
              height: px(CAP_H),
              margin: 0,
              padding: 0,
              border: 0,
              borderRadius: px(CAP_H / 2),
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <span
              className="lsst-ring"
              aria-hidden
              style={{
                position: "absolute",
                inset: px(-5),
                borderRadius: px(CAP_H / 2 + 5),
                boxShadow: `0 0 0 ${px(2.4)} ${rgba(fbIr[2], 0.75)}, 0 0 ${px(16)} ${px(2)} ${rgba(fbIr[3], 0.5)}`,
                pointerEvents: "none",
              }}
            />
            <div ref={capRef} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", transformOrigin: "50% 60%" }}>
              {noGL ? (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: px(CAP_H / 2),
                    overflow: "hidden",
                    background: `radial-gradient(60% 70% at 22% 22%, ${rgba(fbIr[0])} 0%, ${rgba(fbIr[0], 0)} 100%), linear-gradient(180deg, ${rgba(fbIr[1])} 20%, ${rgba(fbIr[2])} 100%)`,
                    boxShadow: `inset ${px(-4)} 0 ${px(8)} ${rgba(fbIr[3])}, inset ${px(5)} ${px(-3)} ${px(8)} ${rgba(WHITE, 0.9)}, 0 ${px(9)} ${px(18)} ${rgba(C.glassShadow, 0.45)}`,
                  }}
                >
                  <span style={{ position: "absolute", left: "13%", top: "25%", width: "27%", height: "55%", borderRadius: px(22), background: rgba(fbBl[0]), filter: `blur(${px(8)})` }} />
                  <span style={{ position: "absolute", left: "61%", top: "17%", width: "30%", height: "28%", borderRadius: px(14), background: rgba(fbBl[1]), filter: `blur(${px(8)})` }} />
                  <span style={{ position: "absolute", left: "62%", top: "43%", width: "27%", height: "30%", borderRadius: px(14), background: rgba(fbBl[2]), filter: `blur(${px(6)})` }} />
                </span>
              ) : (
                <canvas
                  ref={canvasRef}
                  style={{
                    position: "absolute",
                    left: px(-CAP_M),
                    top: px(-CAP_M),
                    width: px(capW + 2 * CAP_M),
                    height: px(CAP_H + 2 * CAP_M),
                    display: "block",
                  }}
                />
              )}
              <svg
                ref={plusRef}
                viewBox="0 0 48 48"
                style={{
                  position: "absolute",
                  left: `calc(50% - ${px(1.5)})`,
                  top: `calc(50% + ${px(2.5)})`,
                  width: px(PLUS + 8),
                  height: px(PLUS + 8),
                  overflow: "visible",
                  transform: "translate(-50%,-50%)",
                  filter: `drop-shadow(0 ${px(5)} ${px(1.8)} ${rgba(mixRgb(C.bl[2], BLACK, 0.3), 0.26)})`,
                }}
              >
                <path
                  d={`M24 ${24 - (PLUS / 2) * (48 / (PLUS + 8))}V${24 + (PLUS / 2) * (48 / (PLUS + 8))}M${24 - (PLUS / 2) * (48 / (PLUS + 8))} 24H${24 + (PLUS / 2) * (48 / (PLUS + 8))}`}
                  stroke={glyphColor}
                  strokeWidth={PLUS_W * (48 / (PLUS + 8))}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </button>
        ) : null}
      </div>
    </div>
  )
}

function labelStyle(k: number, base: number, weight: number, col: string, op: number): React.CSSProperties {
  const fs = LABEL_PX * k
  return {
    position: "absolute",
    left: "-20%",
    right: "-20%",
    top: `${+(base * k - fs * 0.86).toFixed(3)}px`,
    textAlign: "center",
    fontSize: `${+fs.toFixed(3)}px`,
    lineHeight: 1,
    fontWeight: weight,
    letterSpacing: "0.005em",
    color: col,
    whiteSpace: "nowrap",
    opacity: op,
    WebkitFontSmoothing: "antialiased",
  }
}

export default SoftTabs
