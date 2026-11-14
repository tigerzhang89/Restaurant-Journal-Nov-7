import type { CreateRecommendationInput, LogVisitInput, RecommendationList, Restaurant, RestaurantPatch, RestaurantWithStats, Visit } from '../types'
import type { Repository } from './repository'
import { TAGS } from './tags'
import { clean, normalizeName, validateVisit } from '../lib/validate'
import { buildSeed } from './seed'
import { withStats } from './stats'

interface Db {
  restaurants: Restaurant[]
  visits: Visit[]
  seeded: boolean
  lists?: RecommendationList[]
}

const uid = () => crypto.randomUUID()
const SLUG_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'
function newSlug(len = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return [...bytes].map((b) => SLUG_CHARS[b % SLUG_CHARS.length]).join('')
}
const dbKey = (userId: string) => `fork:v1:${userId}:db`

export class LocalRepository implements Repository {
  private userId: string
  private storage: Storage
  constructor(userId: string, storage: Storage = localStorage) {
    this.userId = userId
    this.storage = storage
  }

  private load(): Db {
    const raw = this.storage.getItem(dbKey(this.userId))
    if (raw) return JSON.parse(raw) as Db
    const db: Db = { restaurants: [], visits: [], seeded: false }
    return db
  }

  private save(db: Db) {
    try {
      this.storage.setItem(dbKey(this.userId), JSON.stringify(db))
    } catch {
      throw new Error('Storage is full — try removing a photo.')
    }
  }

  /** Demo convenience: give a brand-new account sample data once. */
  seedIfNew() {
    const db = this.load()
    if (db.seeded) return
    const seed = buildSeed(this.userId)
    this.save({ restaurants: seed.restaurants, visits: seed.visits, seeded: true })
  }

  private stats(db: Db): RestaurantWithStats[] {
    return db.restaurants.map((r) => withStats(r, db.visits))
  }

  async listTags() {
    return TAGS
  }

  async listRestaurants() {
    return this.stats(this.load())
  }

  async getRestaurant(id: string) {
    return this.stats(this.load()).find((r) => r.id === id) ?? null
  }

  async logVisit(input: LogVisitInput) {
    const check = validateVisit(input)
    if (!check.ok) throw new Error(Object.values(check.errors)[0])

    const db = this.load()
    const now = new Date().toISOString()
    const key = normalizeName(input.name)
    let restaurant = db.restaurants.find((r) => normalizeName(r.name) === key)
    const createdRestaurant = !restaurant
    if (!restaurant) {
      restaurant = {
        id: uid(),
        user_id: this.userId,
        name: input.name.trim(),
        neighborhood: clean(input.neighborhood),
        city: clean(input.city),
        price_level: null,
        cuisine: null,
        dietary_flags: [],
        created_at: now,
      }
      db.restaurants.push(restaurant)
    } else if (!restaurant.neighborhood && clean(input.neighborhood)) {
      restaurant.neighborhood = clean(input.neighborhood)
    }

    const visit: Visit = {
      id: uid(),
      restaurant_id: restaurant.id,
      user_id: this.userId,
      rating: input.rating as Visit['rating'],
      note: clean(input.note),
      best_dish: clean(input.best_dish),
      photo_url: input.photo_url ?? null,
      visited_at: input.visited_at ?? now,
      created_at: now,
      tag_ids: input.tag_ids ?? [],
    }
    db.visits.push(visit)
    this.save(db)
    return { restaurant, visitId: visit.id, createdRestaurant }
  }

  async deleteVisit(visitId: string) {
    const db = this.load()
    db.visits = db.visits.filter((v) => v.id !== visitId)
    this.save(db)
  }

  async deleteRestaurantIfEmpty(restaurantId: string) {
    const db = this.load()
    if (db.visits.some((v) => v.restaurant_id === restaurantId)) return
    db.restaurants = db.restaurants.filter((r) => r.id !== restaurantId)
    this.save(db)
  }

  async updateRestaurant(id: string, patch: RestaurantPatch) {
    const db = this.load()
    const r = db.restaurants.find((x) => x.id === id)
    if (!r) throw new Error('Restaurant not found')
    Object.assign(r, patch)
    this.save(db)
    return r
  }

  async createRecommendation(input: CreateRecommendationInput) {
    if (input.items.length < 1 || input.items.length > 5) throw new Error('Pick 1 to 5 restaurants')
    const db = this.load()
    const id = uid()
    const list: RecommendationList = {
      id,
      user_id: this.userId,
      slug: newSlug(),
      title: input.title.trim() || 'My recommendations',
      occasion: input.occasion,
      from_name: input.from_name.trim() || 'A friend',
      created_at: new Date().toISOString(),
      items: input.items.map((it, i) => ({ list_id: id, position: i, ...it })),
    }
    db.lists = [list, ...(db.lists ?? [])]
    this.save(db)
    return list
  }

  async listRecommendations() {
    return this.load().lists ?? []
  }

  async suggestRestaurants(query: string, limit = 5) {
    const q = normalizeName(query)
    if (!q) return []
    return this.stats(this.load())
      .filter((r) => normalizeName(r.name).includes(q))
      .sort((a, b) => b.last_visited_at.localeCompare(a.last_visited_at))
      .slice(0, limit)
  }
}
