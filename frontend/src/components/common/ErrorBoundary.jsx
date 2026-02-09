import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './Button'

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props
      if (fallback) return fallback

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-error-50 dark:bg-error-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-error-600 dark:text-error-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              حدث خطأ غير متوقع
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              نعتذر، حدثت مشكلة. يمكنك المحاولة مرة أخرى أو تحديث الصفحة.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon={RefreshCw} onClick={this.handleRetry}>
                إعادة المحاولة
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                تحديث الصفحة
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
