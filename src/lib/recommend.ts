import type { PublicRecommendation, RecommendationList, RestaurantWithStats, SharedItemSnapshot, Tag } from '../types'

export const MAX_PICKS = 5

export interface RecFilters {
  occasion: string // tag id or ''
  neighborhood: string
  maxPrice: number // 0 = any
  dietary: string[] // restaurant must offer all
}

export const EMPTY_REC_FILTERS: RecFilters = { occasion: '', neighborhood: '', maxPrice: 0, dietary: [] }

/** Matching restaurants from the user's own log, best rated first (ties: most recent). */
export function matchRestaurants(list: RestaurantWithStats[], f: RecFilters): RestaurantWithStats[] {
  return list
    .filter((r) => {
      if (f.occasion && !r.visits.some((v) => v.tag_ids.includes(f.occasion))) return false
      if (f.neighborhood && r.neighborhood !== f.neighborhood) return false
      if (f.maxPrice && (r.price_level === null || r.price_level > f.maxPrice)) return false
      if (f.dietary.length && !f.dietary.every((d) => r.dietary_flags.includes(d))) return false
      return true
    })
    .sort((a, b) => b.avg_rating - a.avg_rating || b.last_visited_at.localeCompare(a.last_visited_at))
}

/** How many otherwise-matching restaurants are hidden only because they have no budget set. */
export function hiddenByMissingPrice(list: RestaurantWithStats[], f: RecFilters): number {
  if (!f.maxPrice) return 0
  return matchRestaurants(list, { ...f, maxPrice: 0 }).filter((r) => r.price_level === null).length
}

export function snapshotOf(r: RestaurantWithStats, tags: Tag[], occasion: string): SharedItemSnapshot {
  const byId = new Map(tags.map((t) => [t.id, t.label]))
  // Prefer the most recent visit that has the info; fall back to older ones.
  const dish = r.visits.find((v) => v.best_dish)?.best_dish ?? null
  const withOccasion = occasion ? r.visits.find((v) => v.tag_ids.includes(occasion) && v.note) : undefined
  const note = (withOccasion ?? r.visits.find((v) => v.note))?.note ?? null
  const tagLabels = [...new Set(r.visits.flatMap((v) => v.tag_ids))].map((id) => byId.get(id)).filter(Boolean) as string[]
  return {
    name: r.name,
    neighborhood: r.neighborhood,
    city: r.city,
    cuisine: r.cuisine,
    price_level: r.price_level,
    rating: Math.round(r.avg_rating * 10) / 10,
    best_dish: dish,
    note,
    tags: tagLabels,
  }
}

/** Editable starting point for the "why it's a good fit" line. */
export function defaultWhy(r: RestaurantWithStats, tags: Tag[], occasion: string): string {
  const label = tags.find((t) => t.id === occasion)?.label.toLowerCase()
  const parts: string[] = []
  if (label) parts.push(label.startsWith('good for') ? label[0].toUpperCase() + label.slice(1) : `Great for ${label}`)
  else if (r.cuisine) parts.push(`${r.cuisine} I keep going back to`)
  if (r.visits.length > 1) parts.push(`been ${r.visits.length} times`)
  return parts.length ? parts[0] + (parts[1] ? ` — ${parts[1]}` : '') + '.' : ''
}

export function defaultTitle(f: RecFilters, tags: Tag[]): string {
  const occ = tags.find((t) => t.id === f.occasion)?.label
  const where = f.neighborhood
  if (occ && where) return `${occ} in ${where}`
  if (occ) return occ
  if (where) return `Where to eat in ${where}`
  return 'My favorite spots'
}

export const nameFromEmail = (email: string) => {
  const local = email.split('@')[0].split(/[._+-]/)[0]
  return local ? local[0].toUpperCase() + local.slice(1) : 'A friend'
}

// --- Share link ---------------------------------------------------------------
// With no backend yet, the link carries its own snapshot in the URL hash so it works
// on any device. Once Supabase exists, /s/:slug loads the row and the hash is unused.

export const toPublic = (l: RecommendationList): PublicRecommendation => ({
  slug: l.slug,
  title: l.title,
  occasion: l.occasion,
  from_name: l.from_name,
  created_at: l.created_at,
  items: [...l.items].sort((a, b) => a.position - b.position).map((i) => ({ why_text: i.why_text, snapshot: i.snapshot })),
})

export function encodePayload(p: PublicRecommendation): string {
  const bytes = new TextEncoder().encode(JSON.stringify(p))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function isPublicRecommendation(p: unknown): p is PublicRecommendation {
  const r = p as PublicRecommendation | null
  return (
    !!r && typeof r.title === 'string' && typeof r.from_name === 'string' && Array.isArray(r.items) &&
    r.items.length >= 1 && r.items.length <= MAX_PICKS &&
    r.items.every((i) => !!i && !!i.snapshot && typeof i.snapshot.name === 'string' && typeof i.snapshot.rating === 'number')
  )
}

export function decodePayload(s: string): PublicRecommendation | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const p: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return isPublicRecommendation(p) ? p : null
  } catch {
    return null
  }
}

/** `short: true` (Supabase) → /s/:slug. Otherwise the snapshot rides in the hash. */
export const shareUrl = (l: RecommendationList, origin = window.location.origin, short = false) =>
  short ? `${origin}/s/${l.slug}` : `${origin}/s/${l.slug}#d=${encodePayload(toPublic(l))}`

/** "Special occasion" -> "good for special occasion"; "Good for parents" stays as is. */
export function occasionPhrase(occasion: string): string {
  const o = occasion.toLowerCase()
  return o.startsWith('good for') ? o : `good for ${o}`
}
