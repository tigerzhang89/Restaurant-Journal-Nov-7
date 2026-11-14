import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { PublicRecommendation } from '../types'
import { StarDisplay } from '../components/Stars'
import { Logo } from '../components/ui'
import { priceLabel } from '../lib/format'
import { occasionPhrase } from '../lib/recommend'
import { loadPublicRecommendation } from '../data/publicShare'

/** Public, read-only recommendation. No login; the link carries its own snapshot until Supabase exists. */
export default function Share() {
  const { slug = '' } = useParams()
  const { hash } = useLocation()
  const [rec, setRec] = useState<PublicRecommendation | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    loadPublicRecommendation(slug, hash).then((r) => live && setRec(r)).catch(() => live && setRec(null))
    return () => { live = false }
  }, [slug, hash])

  if (rec === undefined) return <div className="flex min-h-dvh items-center justify-center text-muted" role="status">Loading…</div>
  if (!rec) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo className="text-4xl" />
        <h1 className="mt-6 font-display text-2xl">This recommendation can’t be found</h1>
        <p className="mt-2 text-muted">The link may be incomplete or no longer available. Ask your friend to send it again.</p>
        <Link to="/login" className="mt-6 rounded-xl bg-brand px-5 py-3 font-semibold text-white">Build your own food list</Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-xl px-5 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link to="/login" aria-label="Fork home"><Logo /></Link>
          <Link to="/login" className="text-sm font-medium text-brand-dark underline-offset-4 hover:underline">Build your own food list</Link>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-brand to-[#f08a4b] px-6 py-9 text-white shadow-lg shadow-brand/20">
          <p className="text-sm font-medium uppercase tracking-widest text-white/80">Picks from {rec.from_name}</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight">{rec.title}</h1>
          <p className="mt-3 text-white/90">
            {rec.items.length} place{rec.items.length === 1 ? '' : 's'} {rec.from_name} has actually eaten at and loved{rec.occasion ? ` — ${occasionPhrase(rec.occasion)}` : ''}.
          </p>
        </section>

        <ol className="mt-6 space-y-4">
          {rec.items.map(({ snapshot: s, why_text }, i) => (
            <li key={i} className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display font-bold text-brand-dark" aria-hidden="true">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl leading-tight">{s.name}</h2>
                  <p className="mt-0.5 text-sm text-muted">{[s.neighborhood, s.cuisine, priceLabel(s.price_level)].filter(Boolean).join(' · ')}</p>
                  <div className="mt-2 flex items-center gap-2"><StarDisplay value={s.rating} /><span className="text-sm font-semibold">{s.rating.toFixed(1)}</span></div>
                </div>
              </div>
              {why_text && <p className="mt-4 font-medium">{why_text}</p>}
              {s.best_dish && (
                <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-sm"><span className="font-semibold text-brand-dark">Order this:</span> {s.best_dish}</p>
              )}
              {s.note && <blockquote className="mt-3 border-l-2 border-brand/40 pl-3 text-sm italic text-muted">“{s.note}” <span className="not-italic">— {rec.from_name}</span></blockquote>}
            </li>
          ))}
        </ol>

        <footer className="mt-10 rounded-2xl border border-line bg-card p-6 text-center">
          <p className="font-display text-xl">Eat out a lot? Remember all of it.</p>
          <p className="mt-1 text-sm text-muted">Fork is a private restaurant journal — log a visit in seconds, recommend in under a minute.</p>
          <Link to="/login" className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 font-semibold text-white">Build your own food list</Link>
        </footer>
        <p className="mt-6 text-center text-xs text-muted">Shared with <Logo className="!text-sm" /> · Only this card is public; {rec.from_name}’s log stays private.</p>
      </div>
    </div>
  )
}
