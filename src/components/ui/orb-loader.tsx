"use client"

// Orb Loader by Louis Studios.
// 200 more hand-made React components at https://studios.lou15.com/?ref=21st-code

import * as React from "react"

export interface OrbLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width and height in px. The glow is drawn inside this box. */
  size?: number
  /** Playback speed. 1 = one heat cycle every 3 s, one shape cycle every 12 s. */
  speed?: number
  /** Accessible label announced to screen readers. */
  label?: string
}

// Thermal palette, one full heat cycle sampled at 30 even steps:
// blue → ink → crimson → orange → yellow → white → lavender → blue.
// prettier-ignore
const THERMAL = [
  73, 73, 254,   54, 49, 227,   39, 34, 168,   28, 25, 110,   21, 13, 60,
  23, 8, 22,     44, 7, 4,      92, 10, 3,     146, 14, 1,    225, 24, 2,
  254, 35, 4,    255, 54, 4,    254, 95, 20,   254, 152, 38,  252, 211, 69,
  255, 254, 113, 255, 254, 162, 254, 253, 206, 254, 254, 231, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 248, 254, 254,
  232, 252, 254, 206, 223, 252, 176, 185, 254, 148, 156, 254, 107, 111, 255,
]

const LUT_SIZE = 64

function buildLut() {
  const n = THERMAL.length / 3
  const out = new Uint8Array(LUT_SIZE * 4)
  for (let i = 0; i < LUT_SIZE; i++) {
    const x = (i / LUT_SIZE) * n
    const a = Math.floor(x) % n
    const b = (a + 1) % n
    const f = x - Math.floor(x)
    for (let c = 0; c < 3; c++) {
      out[i * 4 + c] = Math.round(THERMAL[a * 3 + c] * (1 - f) + THERMAL[b * 3 + c] * f)
    }
    out[i * 4 + 3] = 255
  }
  return out
}

// Shape keyframes over one 12 s loop.
// n: superellipse exponent (0.6 star, 1 diamond, 2 circle, 3+ squircle)
// rot: rotation, lobe: 4-fold notch depth, wob: organic ripple, s: scale
type Key = { t: number; n: number; rot: number; lobe: number; wob: number; s: number }
const SHAPE_LOOP = 12
const KEYS: Key[] = [
  { t: 0.0, n: 0.6, rot: 0.0, lobe: 0.0, wob: 0.0, s: 1.0 },
  { t: 2.4, n: 0.66, rot: 0.0, lobe: 0.0, wob: 0.0, s: 1.02 },
  { t: 3.1, n: 1.2, rot: 0.0, lobe: 0.0, wob: 0.0, s: 0.94 },
  { t: 3.7, n: 2.0, rot: 0.0, lobe: 0.0, wob: 0.0, s: 0.9 },
  { t: 4.7, n: 2.0, rot: 0.0, lobe: 0.0, wob: 0.0, s: 0.95 },
  { t: 5.8, n: 3.3, rot: 0.15, lobe: 0.0, wob: 0.01, s: 0.86 },
  { t: 6.8, n: 3.0, rot: 0.62, lobe: 0.0, wob: 0.0, s: 0.87 },
  { t: 7.6, n: 3.4, rot: 0.2, lobe: 0.0, wob: 0.0, s: 0.86 },
  { t: 8.4, n: 3.0, rot: 0.0, lobe: -0.14, wob: 0.0, s: 0.93 },
  { t: 9.3, n: 2.5, rot: -0.15, lobe: -0.05, wob: 0.075, s: 0.92 },
  { t: 10.1, n: 2.0, rot: -0.1, lobe: 0.0, wob: 0.03, s: 0.94 },
  { t: 10.7, n: 2.0, rot: 0.0, lobe: 0.0, wob: 0.0, s: 0.93 },
  { t: 11.35, n: 1.25, rot: 0.0, lobe: 0.0, wob: 0.0, s: 0.95 },
  { t: 12.0, n: 0.6, rot: 0.0, lobe: 0.0, wob: 0.0, s: 1.0 },
]

// Cyclic Catmull-Rom through the keys: velocity never drops to zero at a key,
// so the outline keeps gliding instead of settling and restarting.
function shapeAt(time: number) {
  const loop = KEYS.slice(0, -1)
  const n = loop.length
  const t = ((time % SHAPE_LOOP) + SHAPE_LOOP) % SHAPE_LOOP
  let i = 0
  while (i < n - 1 && loop[i + 1].t <= t) i++
  const t1 = loop[i].t
  const t2 = i + 1 < n ? loop[i + 1].t : SHAPE_LOOP
  const u = (t - t1) / (t2 - t1)
  const k = (j: number) => loop[((j % n) + n) % n]
  const [a, b, c, d] = [k(i - 1), k(i), k(i + 1), k(i + 2)]
  const cr = (p0: number, p1: number, p2: number, p3: number) =>
    0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u)
  const pick = (f: (x: Key) => number) => cr(f(a), f(b), f(c), f(d))
  return {
    // Exponent moves in log space so star → diamond → circle reads evenly.
    n: Math.max(0.55, Math.exp(pick((x) => Math.log(x.n)))),
    rot: pick((x) => x.rot),
    lobe: Math.min(0, pick((x) => x.lobe)),
    wob: Math.max(0, pick((x) => x.wob)),
    s: pick((x) => x.s),
  }
}

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uHeat;
uniform vec4 uShape; // n, rot, lobe, wob
uniform float uScale;
uniform sampler2D uLut;

const float R = 0.55;
const float TIP = 0.25;

vec3 thermal(float u) { return texture2D(uLut, vec2(fract(u), 0.5)).rgb; }

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// Superellipse radius with softened tips, plus lobes and ripple.
float radius(float th) {
  float a = th - uShape.y;
  float e = TIP * smoothstep(1.6, 0.7, uShape.x);
  float norm = sqrt(1.0 + e * e) - e;
  float c = max(sqrt(cos(a) * cos(a) + e * e) - e, 0.0) / norm;
  float s = max(sqrt(sin(a) * sin(a) + e * e) - e, 0.0) / norm;
  float n = uShape.x;
  float r = pow(pow(c, n) + pow(s, n), -1.0 / n);
  r *= 1.0 + uShape.z * cos(4.0 * a);
  r *= 1.0 + uShape.w * (0.6 * sin(5.0 * th + uTime * 1.3) + 0.4 * sin(3.0 * th - uTime * 0.9 + 1.0));
  return R * uScale * r;
}

const int N = 64;
const float TAU = 6.2831853;

// Exact signed distance to the outline, traced as a closed 64-point polygon.
float shapeDist(vec2 p, float sc) {
  // Same expression as the loop's last vertex, so the polygon closes exactly.
  float th0 = float(N - 1) * TAU / float(N);
  vec2 prev = radius(th0) * sc * vec2(cos(th0), sin(th0));
  float best = 1e9;
  float sgn = 1.0;
  for (int i = 0; i < N; i++) {
    float th = float(i) * TAU / float(N);
    vec2 cur = radius(th) * sc * vec2(cos(th), sin(th));
    vec2 e = cur - prev;
    vec2 w = p - prev;
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    best = min(best, dot(b, b));
    bvec3 c = bvec3(p.y >= prev.y, p.y < cur.y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) sgn = -sgn;
    prev = cur;
  }
  return sgn * sqrt(best);
}

void main() {
  float m = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * m);
  float px = 2.0 / m;

  float len = length(p);
  // Star tips: shrink, then inflate along the distance field for round ends.
  float round = 0.08 * smoothstep(1.5, 0.7, uShape.x);
  float d = shapeDist(p, 1.0 - round) - round * R * uScale;

  float soft = max(px, 0.006);
  float inside = 1.0 - smoothstep(-soft, soft, d);

  // Heat phase: a warm front rolls from top to bottom, the edge runs ahead.
  float ga = 1.75 + 0.35 * sin(uTime * 0.37);
  vec2 dir = vec2(cos(ga), sin(ga));
  float n1 = noise(p * 2.2 + vec2(uTime * 0.25, -uTime * 0.18)) - 0.5;
  float base = uHeat + 0.17 * dot(p / R, dir) + 0.06 * n1;

  float din = max(-d, 0.0);
  float body = base + 0.30 * exp(-din / (0.045 * R)) + 0.05 * exp(-din / (0.25 * R));
  vec3 bodyCol = thermal(body);

  // Outside: the glow answers the body. A cool body throws a lavender glow,
  // a hot body throws an orange-red one.
  float od = max(d, 0.0);
  float hb = fract(base);
  float warm = smoothstep(0.36, 0.5, hb) * (1.0 - smoothstep(0.88, 1.0, hb));
  vec3 near = mix(vec3(0.42, 0.43, 1.0), vec3(1.0, 0.3, 0.12), warm);
  vec3 far = mix(vec3(0.2, 0.18, 0.66), vec3(0.62, 0.07, 0.04), warm);
  vec3 glow = mix(near, far, smoothstep(0.0, 0.24 * R, od)) * exp(-od / (0.15 * R));
  glow += vec3(0.14, 0.12, 0.34) * (1.0 - 0.6 * warm) * exp(-od / (0.4 * R));
  glow *= smoothstep(0.99, 0.8, len);

  vec3 col = mix(glow, bodyCol, inside);
  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0)) - 0.5) * (3.0 / 255.0);
  col = clamp(col, 0.0, 1.0);

  float alpha = max(inside, max(col.r, max(col.g, col.b)));
  gl_FragColor = vec4(col, alpha);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s))
  }
  return s
}

/** Thermal-camera orb that morphs star → circle → clover while heat rolls through it. */
export function OrbLoader({
  size = 160,
  speed = 1,
  label = "Loading",
  className,
  style,
  ...props
}: OrbLoaderProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = React.useState(false)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: false,
    })
    if (!gl) {
      setFallback(true)
      return
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LUT_SIZE, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, buildLut())
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const uRes = gl.getUniformLocation(prog, "uRes")
    const uTime = gl.getUniformLocation(prog, "uTime")
    const uHeat = gl.getUniformLocation(prog, "uHeat")
    const uShape = gl.getUniformLocation(prog, "uShape")
    const uScale = gl.getUniformLocation(prog, "uScale")
    gl.uniform1i(gl.getUniformLocation(prog, "uLut"), 0)

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = Math.round(size * dpr)
    canvas.width = px
    canvas.height = px
    gl.viewport(0, 0, px, px)

    let raf = 0
    let visible = true
    const start = performance.now()
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(frame)
    })
    io.observe(canvas)

    function frame(now: number) {
      raf = 0
      const t = ((now - start) / 1000) * Math.max(speed, 0.01) * (reduce ? 0.3 : 1)
      const s = shapeAt(t)
      gl!.uniform2f(uRes, px, px)
      gl!.uniform1f(uTime, t)
      gl!.uniform1f(uHeat, t / 3)
      gl!.uniform4f(uShape, s.n, s.rot, s.lobe, s.wob)
      gl!.uniform1f(uScale, s.s)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
      if (visible) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      gl.deleteProgram(prog)
      gl.deleteBuffer(buf)
      gl.deleteTexture(tex)
    }
  }, [size, speed])

  return (
    <div
      role="status"
      aria-label={label}
      className={className}
      style={{ width: size, height: size, position: "relative", ...style }}
      {...props}
    >
      {fallback ? (
        <div
          style={{
            position: "absolute",
            inset: "22%",
            borderRadius: "50%",
            background: "linear-gradient(180deg, #ff2304, #ffd345, #ffffff, #4949fe, #170816)",
            backgroundSize: "100% 400%",
            boxShadow: "0 0 0 2px #ff3a0a, 0 0 30px 10px #5557ff88",
            animation: "orb-loader-heat 3s linear infinite",
          }}
        />
      ) : (
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      )}
      <style>{`@keyframes orb-loader-heat{from{background-position:0 0}to{background-position:0 100%}}`}</style>
    </div>
  )
}

export default OrbLoader
