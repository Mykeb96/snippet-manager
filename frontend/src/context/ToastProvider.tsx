import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastVariant = 'success' | 'error'

type ToastItem = { id: string; message: string; variant: ToastVariant }

export type ToastContextValue = {
  showToast: (message: string, options?: { variant?: ToastVariant; durationMs?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timersRef.current.get(id)
    if (t !== undefined) clearTimeout(t)
    timersRef.current.delete(id)
  }, [])

  useEffect(
    () => () => {
      for (const id of timersRef.current.keys()) {
        const t = timersRef.current.get(id)
        if (t !== undefined) clearTimeout(t)
      }
      timersRef.current.clear()
    },
    [],
  )

  const showToast = useCallback(
    (message: string, options?: { variant?: ToastVariant; durationMs?: number }) => {
      const id = crypto.randomUUID()
      const variant = options?.variant ?? 'success'
      const durationMs = options?.durationMs ?? 4200
      setToasts((prev) => [...prev, { id, message, variant }])
      const timer = setTimeout(() => remove(id), durationMs)
      timersRef.current.set(id, timer)
    },
    [remove],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.variant}`} role="status">
            <p className="toast__message">{t.message}</p>
            <button type="button" className="toast__dismiss" aria-label="Dismiss" onClick={() => remove(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
