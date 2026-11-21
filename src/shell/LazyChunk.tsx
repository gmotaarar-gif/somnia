import { Component, lazy, useState, type ComponentType, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useScreenEl } from "@/shell/PhoneFrame"

function RecoveryPanel({ children }: { children: ReactNode }) {
  const screen = useScreenEl()
  return createPortal(
    <div role="alert" className="absolute inset-x-4 top-20 z-[100] isolate rounded-[24px] bg-sheet p-4 text-center text-[14px]">
      {children}
    </div>,
    screen ?? document.body
  )
}

export async function loadWithRetry<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load()
  } catch {
    return load()
  }
}

class ChunkBoundary extends Component<{
  children: ReactNode
  onRetry: () => void
  onError?: () => void
}, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError?.()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <RecoveryPanel>
        <p>Не удалось загрузить. Проверьте подключение.</p>
        <div className="mt-3 flex justify-center gap-3">
          <button type="button" className="press glass rounded-full px-4 py-2" onClick={this.props.onRetry}>Повторить</button>
          <button type="button" className="press glass rounded-full px-4 py-2" onClick={() => window.location.reload()}>Обновить</button>
        </div>
      </RecoveryPanel>
    )
  }
}

export function lazyWithRetry(load: () => Promise<{ default: ComponentType }>) {
  const Initial = lazy(() => loadWithRetry(load))
  return function LazyChunk({ onLoadError }: { onLoadError?: () => void }) {
    const [{ Content, attempt }, setAttempt] = useState({ Content: Initial, attempt: 0 })
    const retry = () => setAttempt(({ attempt }) => ({
      Content: lazy(() => loadWithRetry(load)),
      attempt: attempt + 1,
    }))
    return (
      <ChunkBoundary key={attempt} onRetry={retry} onError={onLoadError}>
        <Content />
      </ChunkBoundary>
    )
  }
}
