import { useEffect, type ReactNode } from 'react'

export function Toast({ children, onClose, ms = 6000 }: { children: ReactNode; onClose(): void; ms?: number }) {
  useEffect(() => {
    const t = setTimeout(onClose, ms)
    return () => clearTimeout(t)
  }, [onClose, ms])
  return (
    <div role="status" className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl">
      {children}
    </div>
  )
}
