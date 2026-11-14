import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateRecommendationInput, LogVisitInput, RecommendationList, Restaurant, RestaurantPatch, RestaurantWithStats, Tag, Visit,
} from '../types'
import type { Repository } from './repository'
import { withStats } from './stats'
import { validateVisit } from '../lib/validate'

const BUCKET = 'visit-photos'
const SIGN_SECONDS = 3600

interface VisitRow {
  id: string; restaurant_id: string; user_id: string; rating: Visit['rating']; note: string | null; best_dish: string | null
  photo_path: string | null; visited_at: string; created_at: string; visit_tags: { tag_id: string }[]
}
type RestaurantRow = Restaurant & { visits?: VisitRow[] }

function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

export class SupabaseRepository implements Repository {
  private db: SupabaseClient
  private userId: string
  private urlCache = new Map<string, { url: string; exp: number }>()

  constructor(client: SupabaseClient, userId: string) {
    this.db = client
    this.userId = userId
  }

  /** Photos live in a private bucket; resolve paths to short-lived signed URLs. */
  private async signPhotos(paths: string[]): Promise<Map<string, string>> {
    const now = Date.now()
    const out = new Map<string, string>()
    const need: string[] = []
    for (const p of new Set(paths)) {
      const hit = this.urlCache.get(p)
      if (hit && hit.exp > now + 60_000) out.set(p, hit.url)
      else need.push(p)
    }
    if (need.length) {
      const { data } = await this.db.storage.from(BUCKET).createSignedUrls(need, SIGN_SECONDS)
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) {
          out.set(item.path, item.signedUrl)
          this.urlCache.set(item.path, { url: item.signedUrl, exp: now + SIGN_SECONDS * 1000 })
        }
      }
    }
    return out
  }

  private async hydrate(rows: RestaurantRow[]): Promise<RestaurantWithStats[]> {
    const paths = rows.flatMap((r) => (r.visits ?? []).map((v) => v.photo_path).filter(Boolean) as string[])
    const urls = paths.length ? await this.signPhotos(paths) : new Map<string, string>()
    return rows.map((row) => {
      const { visits: vrows = [], ...r } = row
      const visits: Visit[] = vrows.map((v) => ({
        id: v.id, restaurant_id: v.restaurant_id, user_id: v.user_id, rating: v.rating, note: v.note, best_dish: v.best_dish,
        photo_url: v.photo_path ? (urls.get(v.photo_path) ?? null) : null,
        visited_at: v.visited_at, created_at: v.created_at, tag_ids: v.visit_tags.map((t) => t.tag_id),
      }))
      return withStats(r as Restaurant, visits)
    })
  }

  async listTags(): Promise<Tag[]> {
    return (unwrap(await this.db.from('tags').select('id, slug, label').order('sort_order')) ?? []) as Tag[]
  }

  async listRestaurants() {
    const rows = unwrap(await this.db.from('restaurants').select('*, visits(*, visit_tags(tag_id))'))
    return this.hydrate(rows as RestaurantRow[])
  }

  async getRestaurant(id: string) {
    const row = unwrap(await this.db.from('restaurants').select('*, visits(*, visit_tags(tag_id))').eq('id', id).maybeSingle())
    return row ? (await this.hydrate([row as RestaurantRow]))[0] : null
  }

  async logVisit(input: LogVisitInput) {
    const check = validateVisit(input)
    if (!check.ok) throw new Error(Object.values(check.errors)[0])

    let photoPath: string | null = null
    if (input.photo_url?.startsWith('data:')) {
      const blob = await (await fetch(input.photo_url)).blob()
      photoPath = `${this.userId}/${crypto.randomUUID()}.jpg`
      const up = await this.db.storage.from(BUCKET).upload(photoPath, blob, { contentType: 'image/jpeg' })
      if (up.error) throw new Error(`Photo upload failed: ${up.error.message}`)
    }

    const { data, error } = await this.db.rpc('log_visit', {
      p_name: input.name, p_rating: input.rating, p_neighborhood: input.neighborhood ?? null, p_city: input.city ?? null,
      p_tag_ids: input.tag_ids ?? [], p_note: input.note ?? null, p_best_dish: input.best_dish ?? null,
      p_photo_path: photoPath, p_visited_at: input.visited_at ?? new Date().toISOString(),
    })
    if (error) {
      if (photoPath) await this.db.storage.from(BUCKET).remove([photoPath])
      throw new Error(error.message)
    }
    const res = data as { restaurant_id: string; visit_id: string; created: boolean }
    const restaurant = unwrap(await this.db.from('restaurants').select('*').eq('id', res.restaurant_id).single()) as Restaurant
    return { restaurant, visitId: res.visit_id, createdRestaurant: res.created }
  }

  async deleteVisit(visitId: string) {
    const row = unwrap(await this.db.from('visits').select('photo_path').eq('id', visitId).maybeSingle())
    unwrap(await this.db.from('visits').delete().eq('id', visitId))
    const path = (row as { photo_path: string | null } | null)?.photo_path
    if (path) await this.db.storage.from(BUCKET).remove([path])
  }

  async deleteRestaurantIfEmpty(restaurantId: string) {
    const { count, error } = await this.db.from('visits').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId)
    if (error) throw new Error(error.message)
    if ((count ?? 0) === 0) unwrap(await this.db.from('restaurants').delete().eq('id', restaurantId))
  }

  async updateRestaurant(id: string, patch: RestaurantPatch) {
    return unwrap(await this.db.from('restaurants').update(patch).eq('id', id).select().single()) as Restaurant
  }

  async suggestRestaurants(query: string, limit = 5) {
    const q = query.trim()
    if (!q) return []
    const rows = unwrap(await this.db.from('restaurants').select('*').ilike('name', `%${escapeLike(q)}%`).order('created_at', { ascending: false }).limit(limit))
    return rows as Restaurant[]
  }

  async createRecommendation(input: CreateRecommendationInput): Promise<RecommendationList> {
    if (input.items.length < 1 || input.items.length > 5) throw new Error('Pick 1 to 5 restaurants')
    const { data, error } = await this.db.rpc('create_recommendation', {
      p_title: input.title, p_occasion: input.occasion, p_from_name: input.from_name, p_items: input.items,
    })
    if (error) throw new Error(error.message)
    const res = data as { id: string; slug: string; created_at: string }
    return {
      id: res.id, user_id: this.userId, slug: res.slug, title: input.title.trim(), occasion: input.occasion,
      from_name: input.from_name.trim() || 'A friend', created_at: res.created_at,
      items: input.items.map((it, i) => ({ list_id: res.id, position: i, ...it })),
    }
  }

  async listRecommendations(): Promise<RecommendationList[]> {
    const rows = unwrap(await this.db.from('recommendation_lists').select('*, recommendation_items(*)').order('created_at', { ascending: false }))
    return (rows as (Omit<RecommendationList, 'items'> & { recommendation_items: RecommendationList['items'] })[]).map(({ recommendation_items, ...l }) => ({
      ...l, items: [...recommendation_items].sort((a, b) => a.position - b.position),
    }))
  }
}
