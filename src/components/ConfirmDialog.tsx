import { useEffect, useCallback } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Close on ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }, [onCancel])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <h3
            id="confirm-title"
            className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
          >
            {title}
          </h3>
          <p
            id="confirm-message"
            className="text-gray-600 dark:text-gray-400"
          >
            {message}
          </p>
        </div>

        <div className="flex border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-bl-2xl"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`flex-1 py-3 font-medium transition-colors rounded-br-2xl border-l border-gray-200 dark:border-gray-700 ${
              variant === 'danger'
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Custom hook for easier usage
import { useState } from 'react'

interface UseConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

export function useConfirm() {
  const [state, setState] = useState<{
    isOpen: boolean
    options: UseConfirmOptions | null
    resolve: ((value: boolean) => void) | null
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  })

  const confirm = (options: UseConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }

  const handleConfirm = () => {
    state.resolve?.(true)
    setState({ isOpen: false, options: null, resolve: null })
  }

  const handleCancel = () => {
    state.resolve?.(false)
    setState({ isOpen: false, options: null, resolve: null })
  }

  const ConfirmDialogComponent = state.options ? (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.options.title}
      message={state.options.message}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      variant={state.options.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null

  return { confirm, ConfirmDialog: ConfirmDialogComponent }
}
