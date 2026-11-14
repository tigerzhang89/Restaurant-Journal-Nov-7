import { useState } from 'react'

const StarIcon = ({ filled, className = 'h-5 w-5' }: { filled: boolean; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true"
    fill={filled ? 'var(--color-star)' : 'none'} stroke={filled ? 'var(--color-star)' : '#d3c6b9'} strokeWidth="1.6" strokeLinejoin="round">
    <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.7 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z" />
  </svg>
)

export function StarDisplay({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} filled={n <= rounded} className={className ?? 'h-4 w-4'} />)}
    </span>
  )
}

const LABELS = ['', 'Skip it', 'Meh', 'Good', 'Great', 'Loved it']

export function StarInput({ value, onChange }: { value: number; onChange(v: number): void }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div>
      <div role="radiogroup" aria-label="Rating" className="flex justify-between gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''} — ${LABELS[n]}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="flex-1 rounded-xl py-2 transition active:scale-90"
          >
            <StarIcon filled={n <= shown} className="mx-auto h-11 w-11" />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-center text-sm font-medium text-muted" aria-live="polite">{LABELS[shown]}</p>
    </div>
  )
}
