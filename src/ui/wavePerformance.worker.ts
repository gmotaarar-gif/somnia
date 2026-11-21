import { defaultStyle, rimLumps, waveFront, WaveRenderer } from "distortion-waves"

// This is an opt-in performance check, never a reason to delay a screen. A
// missing/slow worker, software GPU, or missing renderer information stays on
// the live-DOM path. Test the actual shader/texture path, not WebGL presence.
self.onmessage = (event: MessageEvent<{ width: number; height: number }>) => {
  let renderer: WaveRenderer | undefined
  let gl: WebGL2RenderingContext | null = null
  let ready = false
  try {
    const started = performance.now()
    const { width, height } = event.data
    const canvas = new OffscreenCanvas(width, height)
    gl = canvas.getContext("webgl2", {
      failIfMajorPerformanceCaveat: true, antialias: false, alpha: true, depth: false, stencil: false,
    })
    const info = gl?.getExtension("WEBGL_debug_renderer_info")
    const name = info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ""
    if (!gl || !name || /swiftshader|llvmpipe|lavapipe|softpipe|software|basic render/i.test(name)) return

    // The library types its canvas as HTMLCanvasElement, but its low-level
    // renderer only uses the WebGL canvas API, also provided by OffscreenCanvas.
    renderer = new WaveRenderer(canvas as unknown as HTMLCanvasElement, { alpha: true })
    if (!renderer.ok) return
    const picture = new OffscreenCanvas(width, height)
    const context = picture.getContext("2d")
    if (!context) return
    context.fillStyle = "#151720"
    context.fillRect(0, 0, width, height)
    const style = defaultStyle("vertical")
    renderer.setScreen(picture, width, height, style.blur, "content")
    renderer.setScreen(picture, width, height, style.blur, "revealed")
    const front = waveFront(0.4, { x: width / 2, y: height, w: 40, h: 40 }, width, height, style)
    renderer.render(front, style, rimLumps(0, width, height, style.cornerRadius, style.rimPulse), null)
    gl.finish()
    ready = !gl.isContextLost() && gl.getError() === gl.NO_ERROR && performance.now() - started < 200
  } catch {
    // Unsupported worker WebGL or renderer failure is ordinary DOM navigation.
  } finally {
    renderer?.dispose()
    gl?.getExtension("WEBGL_lose_context")?.loseContext()
    self.postMessage(ready)
  }
}
