import type { RestaurantWithStats } from '../types'

export interface ListFilters {
  q: string
  tag: string // tag id or ''
  minRating: number // 0 = any
  neighborhood: string // '' = any
  from: string // yyyy-mm-dd or ''
  to: string // yyyy-mm-dd or ''
}

export const EMPTY_FILTERS: ListFilters = { q: '', tag: '', minRating: 0, neighborhood: '', from: '', to: '' }

const day = (iso: string) => iso.slice(0, 10)

/**
 * Restaurant-level: search, neighborhood, average rating.
 * Visit-level: tag and date range — a restaurant matches if at least one visit does.
 */
export function filterRestaurants(list: RestaurantWithStats[], f: ListFilters): RestaurantWithStats[] {
  const q = f.q.trim().toLowerCase()
  return list.filter((r) => {
    if (f.neighborhood && r.neighborhood !== f.neighborhood) return false
    if (f.minRating && r.avg_rating < f.minRating) return false
    if (q) {
      const hay = [r.name, r.cuisine, r.neighborhood, ...r.visits.flatMap((v) => [v.note, v.best_dish])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (f.tag || f.from || f.to) {
      const hit = r.visits.some(
        (v) =>
          (!f.tag || v.tag_ids.includes(f.tag)) &&
          (!f.from || day(v.visited_at) >= f.from) &&
          (!f.to || day(v.visited_at) <= f.to),
      )
      if (!hit) return false
    }
    return true
  })
}

export type SortKey = 'recent' | 'rating' | 'name'

export function sortRestaurants(list: RestaurantWithStats[], by: SortKey): RestaurantWithStats[] {
  const copy = [...list]
  if (by === 'rating') copy.sort((a, b) => b.avg_rating - a.avg_rating || b.last_visited_at.localeCompare(a.last_visited_at))
  else if (by === 'name') copy.sort((a, b) => a.name.localeCompare(b.name))
  else copy.sort((a, b) => b.last_visited_at.localeCompare(a.last_visited_at))
  return copy
}

export function activeFilterCount(f: ListFilters): number {
  return [f.tag, f.minRating, f.neighborhood, f.from, f.to].filter(Boolean).length
}

export function filtersFromParams(p: URLSearchParams): ListFilters {
  return {
    q: p.get('q') ?? '',
    tag: p.get('tag') ?? '',
    minRating: Number(p.get('min') ?? 0) || 0,
    neighborhood: p.get('hood') ?? '',
    from: p.get('from') ?? '',
    to: p.get('to') ?? '',
  }
}

export function filtersToParams(f: ListFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.tag) p.set('tag', f.tag)
  if (f.minRating) p.set('min', String(f.minRating))
  if (f.neighborhood) p.set('hood', f.neighborhood)
  if (f.from) p.set('from', f.from)
  if (f.to) p.set('to', f.to)
  return p
}
