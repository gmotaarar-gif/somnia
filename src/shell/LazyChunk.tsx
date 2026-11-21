import { Component, lazy, useState, type ComponentType, type ReactNode } from "react"
import { RecoveryButton, RecoveryPanel } from "@/shell/RecoveryPanel"
import { downloadSavedDataCopy } from "@/shell/savedDataCopy"
import { resetSavedData } from "@/store/store"

/** A code chunk that could not be fetched, as opposed to a screen that failed while rendering. */
class ChunkLoadError extends Error {
  constructor(readonly reason: unknown) {
    super("Chunk failed to load")
  }
}

export async function loadWithRetry<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load()
  } catch {
    return load()
  }
}

function loadChunk<T>(load: () => Promise<T>): Promise<T> {
  return loadWithRetry(load).catch((cause: unknown) => {
    throw new ChunkLoadError(cause)
  })
}

// The app has no server: once code has loaded, a crash means stored data the screen cannot show.
function SavedDataFailure() {
  const [copy, setCopy] = useState<"idle" | "saved" | "failed">("idle")
  const [confirmReset, setConfirmReset] = useState(false)
  const download = async () => setCopy((await downloadSavedDataCopy()) ? "saved" : "failed")
  const reset = () => {
    if (!confirmReset) return setConfirmReset(true)
    resetSavedData()
    window.location.reload()
  }
  return (
    <RecoveryPanel>
      <p className="font-medium">Не удалось открыть экран: похоже, сохранённые данные повреждены.</p>
      <p className="mt-1 text-ink-2">
        {confirmReset
          ? "Записи на этом устройстве будут удалены, копия останется. Нажмите ещё раз, чтобы начать заново."
          : copy === "failed"
            ? "Не удалось сохранить копию. Попробуйте ещё раз."
            : "Скачайте копию данных, затем начните заново."}
      </p>
      <div className="mt-3 flex justify-center gap-3">
        <RecoveryButton onClick={download}>{copy === "saved" ? "Копия сохранена" : "Скачать копию"}</RecoveryButton>
        <RecoveryButton onClick={reset}>{confirmReset ? "Удалить и начать" : "Начать заново"}</RecoveryButton>
      </div>
    </RecoveryPanel>
  )
}

class ChunkBoundary extends Component<{
  children: ReactNode
  onRetry: () => void
  onError?: () => void
}, { failed: null | "load" | "render" }> {
  state: { failed: null | "load" | "render" } = { failed: null }

  static getDerivedStateFromError(error: unknown) {
    return { failed: error instanceof ChunkLoadError ? "load" : "render" }
  }

  componentDidCatch() {
    this.props.onError?.()
  }

  render() {
    if (!this.state.failed) return this.props.children
    if (this.state.failed === "render") return <SavedDataFailure />
    return (
      <RecoveryPanel>
        <p>Не удалось загрузить. Проверьте подключение.</p>
        <div className="mt-3 flex justify-center gap-3">
          <RecoveryButton onClick={this.props.onRetry}>Повторить</RecoveryButton>
          <RecoveryButton onClick={() => window.location.reload()}>Обновить</RecoveryButton>
        </div>
      </RecoveryPanel>
    )
  }
}

export function lazyWithRetry(load: () => Promise<{ default: ComponentType }>) {
  const Initial = lazy(() => loadChunk(load))
  return function LazyChunk({ onLoadError }: { onLoadError?: () => void }) {
    const [{ Content, attempt }, setAttempt] = useState({ Content: Initial, attempt: 0 })
    const retry = () => setAttempt(({ attempt }) => ({
      Content: lazy(() => loadChunk(load)),
      attempt: attempt + 1,
    }))
    return (
      <ChunkBoundary key={attempt} onRetry={retry} onError={onLoadError}>
        <Content />
      </ChunkBoundary>
    )
  }
}
