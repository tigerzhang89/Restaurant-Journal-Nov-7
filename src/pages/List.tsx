import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useRepo } from '../data/AppContext'
import type { RestaurantWithStats, Tag } from '../types'
import { StarDisplay } from '../components/Stars'
import { Chip, Pill, inputCls } from '../components/ui'
import {
  activeFilterCount, filterRestaurants, filtersFromParams, filtersToParams, sortRestaurants, type SortKey,
} from '../lib/filters'
import { priceLabel, timeAgo } from '../lib/format'

export default function List() {
  const repo = useRepo()
  const [params, setParams] = useSearchParams()
  const [all, setAll] = useState<RestaurantWithStats[] | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const filters = useMemo(() => filtersFromParams(params), [params])
  const sort = (params.get('sort') as SortKey) || 'recent'

  useEffect(() => {
    let live = true
    Promise.all([repo.listRestaurants(), repo.listTags()]).then(([r, t]) => {
      if (live) { setAll(r); setTags(t) }
    })
    return () => { live = false }
  }, [repo])

  function update(patch: Partial<typeof filters>, nextSort: SortKey = sort) {
    const p = filtersToParams({ ...filters, ...patch })
    if (nextSort !== 'recent') p.set('sort', nextSort)
    setParams(p, { replace: true })
  }

  const hoods = useMemo(() => [...new Set((all ?? []).map((r) => r.neighborhood).filter(Boolean) as string[])].sort(), [all])
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const results = useMemo(() => sortRestaurants(filterRestaurants(all ?? [], filters), sort), [all, filters, sort])
  const nFilters = activeFilterCount(filters)

  if (!all) return <p className="pt-10 text-center text-muted">Loading…</p>

  if (all.length === 0) {
    return (
      <div className="pt-16 text-center">
        <div className="text-5xl" aria-hidden="true">🍽️</div>
        <h1 className="mt-4 font-display text-2xl">Your list is empty</h1>
        <p className="mt-1 text-muted">Log your first visit — it takes about ten seconds.</p>
        <Link to="/log" className="mt-5 inline-block rounded-xl bg-brand px-5 py-3 font-semibold text-white">Log a visit</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-3xl">My list</h1>
        <span className="text-sm text-muted">{results.length} of {all.length}</span>
      </div>

      <div className="flex gap-2">
        <input type="search" aria-label="Search" placeholder="Search name, dish, notes…" value={filters.q}
          onChange={(e) => update({ q: e.target.value })} className={inputCls} />
        <button onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}
          className={`shrink-0 rounded-xl border px-4 font-medium ${nFilters ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-card'}`}>
          Filters{nFilters ? ` · ${nFilters}` : ''}
        </button>
      </div>

      {showFilters && (
        <div className="space-y-4 rounded-2xl border border-line bg-card p-4">
          <div>
            <p className="mb-2 text-sm font-medium">Good for</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => <Chip key={t.id} active={filters.tag === t.id} onClick={() => update({ tag: filters.tag === t.id ? '' : t.id })}>{t.label}</Chip>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Rating</p>
            <div className="flex flex-wrap gap-2">
              {[0, 3, 4, 5].map((n) => (
                <Chip key={n} active={filters.minRating === n} onClick={() => update({ minRating: n })}>{n === 0 ? 'Any' : `${n}★ & up`}</Chip>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="hood" className="mb-2 block text-sm font-medium">Neighborhood</label>
            <select id="hood" value={filters.neighborhood} onChange={(e) => update({ neighborhood: e.target.value })} className={inputCls}>
              <option value="">Anywhere</option>
              {hoods.map((h) => <option key={h}>{h}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="from" className="mb-2 block text-sm font-medium">From</label>
              <input id="from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label htmlFor="to" className="mb-2 block text-sm font-medium">To</label>
              <input id="to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              Sort
              <select value={sort} onChange={(e) => update({}, e.target.value as SortKey)} className="rounded-lg border border-line bg-card px-2 py-1.5">
                <option value="recent">Most recent</option>
                <option value="rating">Highest rated</option>
                <option value="name">A–Z</option>
              </select>
            </label>
            {(nFilters > 0 || filters.q) && <button onClick={() => setParams({}, { replace: true })} className="text-sm font-medium text-brand-dark underline">Clear all</button>}
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="py-12 text-center text-muted">
          <p>Nothing matches those filters.</p>
          <button onClick={() => setParams({ ...(sort !== 'recent' ? { sort } : {}) }, { replace: true })} className="mt-2 font-medium text-brand-dark underline">Clear filters</button>
        </div>
      ) : (
        <ul className="space-y-3">
          {results.map((r) => {
            const latest = r.visits[0]
            const rtags = [...new Set(r.visits.flatMap((v) => v.tag_ids))].slice(0, 3)
            return (
              <li key={r.id}>
                <Link to={`/r/${r.id}`} className="block rounded-2xl border border-line bg-card p-4 transition hover:border-brand/50 active:scale-[.99]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-xl leading-tight">{r.name}</h2>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {[r.neighborhood, r.cuisine, priceLabel(r.price_level)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {latest?.photo_url && <img src={latest.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <StarDisplay value={r.avg_rating} />
                    <span className="text-xs text-muted">
                      {r.visits.length > 1 ? `${r.visits.length} visits · ` : ''}{timeAgo(r.last_visited_at)}
                    </span>
                  </div>
                  {latest?.best_dish && <p className="mt-2 text-sm"><span className="text-muted">Best dish:</span> {latest.best_dish}</p>}
                  {latest?.note && <p className="mt-1 line-clamp-2 text-sm text-muted">{latest.note}</p>}
                  {rtags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">{rtags.map((id) => <Pill key={id}>{tagById.get(id)?.label}</Pill>)}</div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

