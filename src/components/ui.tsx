import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-dark disabled:bg-[#e8c3b5]',
    ghost: 'border border-line bg-card text-ink hover:bg-brand-soft',
    danger: 'text-red-700 hover:bg-red-50',
  }[variant]
  return <button {...p} className={`rounded-xl px-4 py-3 font-semibold transition active:scale-[.98] disabled:cursor-not-allowed ${styles} ${className}`} />
}

export const inputCls = 'w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base placeholder:text-[#b3a69b] focus:border-brand focus:outline-none'

export function Chip({ active, onClick, children, disabled }: { active?: boolean; onClick?(): void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-40 ${
        active ? 'border-brand bg-brand text-white' : 'border-line bg-card text-ink hover:bg-brand-soft'
      }`}
    >
      {children}
    </button>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-dark">{children}</span>
}

export function Logo({ className = '' }: { className?: string }) {
  return <span className={`font-display text-2xl font-bold tracking-tight ${className}`}>Fork<span className="text-brand">.</span></span>
}
