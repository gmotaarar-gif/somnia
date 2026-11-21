import * as React from "react"
import type { Theme } from "@/lib/theme"
import { usePrefersReducedMotion } from "@/ui/MotionProvider"
import { MESH_DRIFT_FRAG } from "@/shell/meshDrift.glsl"

type Palette = [string, string, string, string]

/** Mesh colours per screen, low → high. Dark stays close to black so cards carry the colour. */
const PALETTES: Record<Theme, Record<string, Palette>> = {
  dark: {
    today: ["#080809", "#15143a", "#3a2063", "#5a3fa8"],
    sleep: ["#080809", "#0c1440", "#22318f", "#5a4fc0"],
    mind: ["#080809", "#0b2a14", "#2c6a24", "#8a9c36"],
    practices: ["#080809", "#30102a", "#8a3656", "#b05a2c"],
    onboarding: ["#0a0a24", "#2a1f78", "#7a3aa8", "#4a62e0"],
  },
  light: {
    today: ["#f2f1f6", "#e2dcf7", "#cdbcf2", "#f4cfe6"],
    sleep: ["#f1f2f8", "#d9def8", "#b9c3f4", "#d6c8f5"],
    mind: ["#f2f4ee", "#dcedcf", "#bfe0a8", "#eef0b8"],
    practices: ["#f6f1f0", "#f6d9dc", "#f2bfc6", "#f7d7b4"],
    onboarding: ["#eef0fb", "#cfd4fa", "#d9bff3", "#b8c8fb"],
  },
}

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}"
/** The mesh is soft by nature, so a third of the pixels is indistinguishable and far cheaper. */
const RES_SCALE = 1 / 3
const SETTLE_MS = 2600
const TIME_SCALE = 0.73

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const flat = (p: Palette) => p.flatMap(toRgb)

function createMesh(canvas: HTMLCanvasElement, snapshot: boolean) {
  const gl = canvas.getContext("webgl", {
    antialias: false, alpha: false, powerPreference: "low-power", preserveDrawingBuffer: snapshot,
  })
  if (!gl) return null
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
  }
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, MESH_DRIFT_FRAG)
  const prog = gl.createProgram()
  if (!vs || !fs || !prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, "a")
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u = (name: string) => gl.getUniformLocation(prog, name)
  const colors = u("u_colors")
  const scene = u("u_scene")
  // Shader Builder preset: scale, intensity, paramA, warp / detail, contrast, brightness, saturation …
  gl.uniform4f(u("u_shape"), 1.16, 0.34, 0.5, 0)
  gl.uniform4f(u("u_surface"), 2.4, 1.16, 0, 1)
  gl.uniform4f(u("u_finish"), 0, 0, 0, 0)
  gl.uniform4f(u("u_transform"), 1453, 0, 0, 0)
  gl.uniform4f(u("u_space"), 0, 0, 0, 0)
  gl.uniform4f(u("u_cursor"), 0, 2, 0.65, 0.46)
  const buf = new Float32Array(24)
  return {
    draw(rgb: number[], seconds: number) {
      const w = Math.max(1, Math.round(canvas.clientWidth * RES_SCALE))
      const h = Math.max(1, Math.round(canvas.clientHeight * RES_SCALE))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      buf.set(rgb)
      gl.uniform3fv(colors, buf)
      gl.uniform4f(scene, w, h, seconds * TIME_SCALE, 4)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
  }
}

/**
 * Backdrop behind every screen. The mesh glides to the new screen's colours and then rests:
 * a perpetual drift would force the glass chrome above to re-blur on every frame.
 * Without WebGL the CSS blobs below carry the same job.
 */
export function Aurora({ tab, theme = "dark", snapshot = false }: { tab: string; theme?: Theme; snapshot?: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const mesh = React.useRef<ReturnType<typeof createMesh>>(null)
  const shown = React.useRef<number[] | null>(null)
  const clock = React.useRef(0)
  const [webgl, setWebgl] = React.useState(false)
  const reduce = usePrefersReducedMotion()

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let created: ReturnType<typeof createMesh> = null
    try {
      created = createMesh(canvas, snapshot)
    } catch {
      created = null
    }
    if (!created) return
    mesh.current = created
    setWebgl(true)
    const lost = (e: Event) => {
      e.preventDefault()
      mesh.current = null
      setWebgl(false)
    }
    canvas.addEventListener("webglcontextlost", lost)
    return () => {
      canvas.removeEventListener("webglcontextlost", lost)
      mesh.current = null
      setWebgl(false)
    }
  }, [snapshot])

  React.useEffect(() => {
    const m = mesh.current
    if (!webgl || !m) return
    const target = flat((PALETTES[theme][tab] ?? PALETTES[theme].today) as Palette)
    const from = shown.current ?? target
    // Inside a wave the backdrop travels with the rest of the view. Keep its
    // frame readable for DOM capture instead of queueing a second GPU effect.
    if (reduce || snapshot) {
      shown.current = target
      m.draw(target, clock.current)
      const resize = () => m.draw(target, clock.current)
      window.addEventListener("resize", resize)
      return () => window.removeEventListener("resize", resize)
    }
    const drift = tab === "onboarding"
    const start = performance.now()
    let last = start
    let raf = 0
    const frame = (now: number) => {
      if (!document.hidden) clock.current += Math.min(0.05, (now - last) / 1000)
      last = now
      const k = Math.min(1, (now - start) / SETTLE_MS)
      const e = 1 - Math.pow(1 - k, 3)
      const rgb = from.map((v, i) => v + (target[i] - v) * e)
      shown.current = rgb
      m.draw(rgb, clock.current)
      if (k < 1 || drift) raf = requestAnimationFrame(frame)
    }
    m.draw(from, clock.current)
    raf = requestAnimationFrame(frame)
    const resize = () => m.draw(shown.current ?? target, clock.current)
    window.addEventListener("resize", resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [webgl, tab, theme, reduce, snapshot])

  return (
    <div className="aurora" data-tab={tab} data-webgl={webgl ? "" : undefined} aria-hidden>
      <canvas ref={canvasRef} className="aurora-mesh" />
      {!webgl && (
        <>
          <div className="aurora-blob b1" />
          <div className="aurora-blob b2" />
          <div className="aurora-blob b3" />
        </>
      )}
      <div className="aurora-veil" />
      <div className="aurora-dots" />
      <div className="grain" />
    </div>
  )
}
