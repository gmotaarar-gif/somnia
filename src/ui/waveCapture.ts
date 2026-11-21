import { snapshot, type CaptureFunction, type CaptureRequest } from "distortion-waves"

/** One immutable pair of real DOM pictures per navigation. The library can
 * invalidate a texture while preparing/playing (focus, resize, Motion, fonts).
 * Re-upload the prepared pixels then, rather than racing a second DOM capture
 * against an already-running animation clock. A new navigation gets a new pair.
 */
export function createWaveCapture() {
  let last: CaptureRequest | undefined
  const pictures = new Map<Element, { size: string; picture: Promise<HTMLCanvasElement> }>()

  const capture: CaptureFunction = (request) => {
    last = request
    const layer = request.element.querySelector<HTMLElement>(`[data-dw-layer="${request.slot}"]`)
    if (!layer) return Promise.reject(new Error("Wave view is not mounted"))
    const scene = layer.querySelector<HTMLElement>(":scope > main") ?? layer
    const size = `${request.width}:${request.height}:${request.scale}`
    const cached = pictures.get(scene)
    if (cached?.size === size) return cached.picture

    const picture = snapshot(scene, {
      width: request.width,
      height: request.height,
      scale: request.scale,
      background: request.background,
      skip: request.ignore,
      // Each main exactly fills the borderless wave. Ignore its ancestor
      // layer's hidden state; take the scene in wave-local coordinates.
      force: (el) => el === scene ? {
        position: "absolute", left: "0", top: "0", margin: "0",
        width: `${request.width}px`, height: `${request.height}px`,
        transform: "none", opacity: "1", visibility: "visible",
      } : undefined,
    }).then(({ canvas }) => canvas).catch((error: unknown) => {
      pictures.delete(scene)
      throw error
    })
    pictures.set(scene, { size, picture })
    return picture
  }

  return {
    capture,
    async prepare() {
      // No request means no renderer (e.g. no WebGL); leave its crossfade alone.
      if (!last) return
      const request = last
      await Promise.all((["content", "revealed"] as const)
        .filter((slot) => request.element.querySelector(`[data-dw-layer="${slot}"]`))
        .map((slot) => capture({ ...request, slot })))
    },
  }
}
