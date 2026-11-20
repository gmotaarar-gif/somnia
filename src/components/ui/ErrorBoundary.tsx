import * as React from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 py-12 text-center text-white">
          <div className="text-base font-semibold tracking-tight">
            Не удалось отобразить экран
          </div>
          <p className="max-w-[260px] text-xs leading-relaxed text-white/55">
            Попробуйте обновить этот раздел — ваши записи сна и эмоций сохранены локально.
          </p>
          <Button size="sm" variant="soft" onClick={this.handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Повторить</span>
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
