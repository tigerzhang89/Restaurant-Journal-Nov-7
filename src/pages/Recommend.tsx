import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp, useRepo } from '../data/AppContext'
import { DIETARY_OPTIONS, type RecommendationList, type RestaurantWithStats, type Tag } from '../types'
import { StarDisplay } from '../components/Stars'
import { Button, Chip, inputCls } from '../components/ui'
import { priceLabel } from '../lib/format'
import { supabaseEnabled } from '../data/supabaseClient'
import {
  EMPTY_REC_FILTERS, MAX_PICKS, defaultTitle, defaultWhy, hiddenByMissingPrice, matchRestaurants, nameFromEmail, shareUrl, snapshotOf,
  type RecFilters,
} from '../lib/recommend'

export default function Recommend() {
  const repo = useRepo()
  const { user } = useApp()
  const [all, setAll] = useState<RestaurantWithStats[] | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [f, setF] = useState<RecFilters>(EMPTY_REC_FILTERS)
  const [picked, setPicked] = useState<string[]>([])
  const [step, setStep] = useState<'pick' | 'write' | 'done'>('pick')
  const [title, setTitle] = useState('')
  const [fromName, setFromName] = useState(() => nameFromEmail(user?.email ?? ''))
  const [why, setWhy] = useState<Record<string, string>>({})
  const [created, setCreated] = useState<RecommendationList | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([repo.listRestaurants(), repo.listTags()]).then(([r, t]) => { if (live) { setAll(r); setTags(t) } })
    return () => { live = false }
  }, [repo])

  const matches = useMemo(() => matchRestaurants(all ?? [], f), [all, f])
  const hidden = useMemo(() => hiddenByMissingPrice(all ?? [], f), [all, f])
  const hoods = useMemo(() => [...new Set((all ?? []).map((r) => r.neighborhood).filter(Boolean) as string[])].sort(), [all])
  const chosen = picked.map((id) => all?.find((r) => r.id === id)).filter(Boolean) as RestaurantWithStats[]

  // Keep selections valid if filters change.
  const visibleIds = new Set(matches.map((r) => r.id))

  function setFilter(patch: Partial<RecFilters>) {
    setF((cur) => ({ ...cur, ...patch }))
    setPicked([])
  }

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < MAX_PICKS ? [...cur, id] : cur))
  }

  function goWrite() {
    setTitle(defaultTitle(f, tags))
    setWhy(Object.fromEntries(chosen.map((r) => [r.id, defaultWhy(r, tags, f.occasion)])))
    setStep('write')
  }

  async function create() {
    setError('')
    try {
      const list = await repo.createRecommendation({
        title,
        occasion: tags.find((t) => t.id === f.occasion)?.label ?? null,
        from_name: fromName,
        items: chosen.map((r) => ({ restaurant_id: r.id, why_text: why[r.id]?.trim() || null, snapshot: snapshotOf(r, tags, f.occasion) })),
      })
      setCreated(list)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the card')
    }
  }

  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setError('Copy failed — select the link and copy it manually.') }
  }

  if (!all) return <p className="pt-10 text-center text-muted">Loading…</p>

  if (step === 'done' && created) {
    const url = shareUrl(created, window.location.origin, supabaseEnabled)
    const path = new URL(url).pathname + new URL(url).hash
    return (
      <div className="space-y-5 pt-2">
        <div>
          <h1 className="font-display text-3xl">Your card is ready 🎉</h1>
          <p className="text-sm text-muted">Anyone with the link can view it — no account needed. Your private log stays private.</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Share link</p>
          <input readOnly aria-label="Share link" value={url} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} mt-2 text-sm`} />
          <div className="mt-3 flex gap-2">
            <Button onClick={() => void copy(url)} className="flex-1">{copied ? 'Copied ✓' : 'Copy link'}</Button>
            {typeof navigator.share === 'function' && (
              <Button variant="ghost" onClick={() => void navigator.share({ title: created.title, url }).catch(() => {})}>Share…</Button>
            )}
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <a href={path} target="_blank" rel="noreferrer" className="block rounded-xl border border-line bg-card py-3 text-center font-semibold hover:bg-brand-soft">Preview as a friend ↗</a>
        <button onClick={() => { setStep('pick'); setPicked([]); setCreated(null) }} className="w-full text-sm font-medium text-brand-dark underline">Build another</button>
      </div>
    )
  }

  if (step === 'write') {
    return (
      <div className="space-y-5 pt-2">
        <button onClick={() => setStep('pick')} className="text-sm text-muted hover:text-ink">← Back to picks</button>
        <h1 className="font-display text-3xl">Make it personal</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label htmlFor="title" className="mb-1.5 block text-sm font-medium">Title</label><input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></div>
          <div><label htmlFor="from" className="mb-1.5 block text-sm font-medium">From</label><input id="from" value={fromName} onChange={(e) => setFromName(e.target.value)} className={inputCls} /></div>
        </div>
        <ol className="space-y-3">
          {chosen.map((r, i) => {
            const snap = snapshotOf(r, tags, f.occasion)
            return (
              <li key={r.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-xl"><span className="text-brand">{i + 1}.</span> {r.name}</h2>
                  <StarDisplay value={r.avg_rating} />
                </div>
                <label htmlFor={`why-${r.id}`} className="mb-1 mt-3 block text-sm font-medium">Why it’s a good fit</label>
                <textarea id={`why-${r.id}`} rows={2} value={why[r.id] ?? ''} onChange={(e) => setWhy((w) => ({ ...w, [r.id]: e.target.value }))} className={inputCls} />
                {(snap.best_dish || snap.note) && (
                  <p className="mt-2 text-xs text-muted">Also shown: {[snap.best_dish && `best dish “${snap.best_dish}”`, snap.note && 'your note'].filter(Boolean).join(' and ')}</p>
                )}
              </li>
            )
          })}
        </ol>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button onClick={() => void create()} disabled={!title.trim()} className="w-full py-3.5 text-lg">Create share link</Button>
        <p className="text-center text-xs text-muted">The card is a snapshot — editing your log later won’t change it.</p>
      </div>
    )
  }

  if (all.length === 0) {
    return (
      <div className="pt-16 text-center">
        <p className="text-muted">Log a few restaurants first — then you can recommend from them.</p>
        <Link to="/log" className="mt-3 inline-block rounded-xl bg-brand px-5 py-3 font-semibold text-white">Log a visit</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 pt-2 pb-20">
      <div>
        <h1 className="font-display text-3xl">Recommend</h1>
        <p className="text-sm text-muted">What’s your friend looking for? Picks come from your own log.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-line bg-card p-4">
        <div>
          <p className="mb-2 text-sm font-medium">Occasion</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => <Chip key={t.id} active={f.occasion === t.id} onClick={() => setFilter({ occasion: f.occasion === t.id ? '' : t.id })}>{t.label}</Chip>)}
          </div>
        </div>
        <div>
          <label htmlFor="rhood" className="mb-2 block text-sm font-medium">Area</label>
          <select id="rhood" value={f.neighborhood} onChange={(e) => setFilter({ neighborhood: e.target.value })} className={inputCls}>
            <option value="">Anywhere</option>
            {hoods.map((h) => <option key={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Budget</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={f.maxPrice === 0} onClick={() => setFilter({ maxPrice: 0 })}>Any</Chip>
            {[1, 2, 3, 4].map((n) => <Chip key={n} active={f.maxPrice === n} onClick={() => setFilter({ maxPrice: n })}>{n === 4 ? '$$$$' : `Up to ${'$'.repeat(n)}`}</Chip>)}
          </div>
          {hidden > 0 && <p className="mt-2 text-xs text-muted">{hidden} matching place{hidden === 1 ? ' has' : 's have'} no budget set, so {hidden === 1 ? 'it’s' : 'they’re'} hidden. Set it on the restaurant’s page.</p>}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Dietary need</p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((d) => <Chip key={d} active={f.dietary.includes(d)} onClick={() => setFilter({ dietary: f.dietary.includes(d) ? f.dietary.filter((x) => x !== d) : [...f.dietary, d] })}>{d}</Chip>)}
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <h2 className="font-display text-xl">{matches.length} match{matches.length === 1 ? '' : 'es'}</h2>
        <span className="text-sm text-muted">Pick up to {MAX_PICKS}</span>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-10 text-center text-muted">Nothing in your log fits all of that. Try loosening a filter.</p>
      ) : (
        <ul className="space-y-3">
          {matches.map((r) => {
            const on = picked.includes(r.id)
            const full = !on && picked.length >= MAX_PICKS
            return (
              <li key={r.id}>
                <button type="button" onClick={() => toggle(r.id)} disabled={full} aria-pressed={on}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition disabled:opacity-40 ${on ? 'border-brand bg-brand-soft' : 'border-line bg-card hover:border-brand/50'}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm ${on ? 'border-brand bg-brand text-white' : 'border-line'}`} aria-hidden="true">{on ? picked.indexOf(r.id) + 1 : ''}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg leading-tight">{r.name}</span>
                    <span className="block truncate text-sm text-muted">{[r.neighborhood, r.cuisine, priceLabel(r.price_level)].filter(Boolean).join(' · ')}</span>
                    {r.visits.find((v) => v.best_dish) && <span className="block truncate text-sm">Best dish: {r.visits.find((v) => v.best_dish)?.best_dish}</span>}
                  </span>
                  <span className="flex flex-col items-end gap-1"><StarDisplay value={r.avg_rating} /><span className="text-xs text-muted">{r.avg_rating.toFixed(1)}</span></span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {picked.filter((id) => visibleIds.has(id)).length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-20 px-4">
          <Button onClick={goWrite} className="mx-auto block w-full max-w-md py-3.5 shadow-xl">Build card ({picked.length})</Button>
        </div>
      )}
    </div>
  )
}
