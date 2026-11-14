// Entity types mirror the future Supabase tables (snake_case columns, uuid ids).

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Tag {
  id: string
  slug: string
  label: string
}

export interface Restaurant {
  id: string
  user_id: string
  name: string
  neighborhood: string | null
  city: string | null
  price_level: 1 | 2 | 3 | 4 | null
  cuisine: string | null
  dietary_flags: string[]
  created_at: string
}

export interface Visit {
  id: string
  restaurant_id: string
  user_id: string
  rating: 1 | 2 | 3 | 4 | 5
  note: string | null
  best_dish: string | null
  photo_url: string | null
  visited_at: string // ISO timestamp
  created_at: string
  /** Flattened `visit_tags` join rows. */
  tag_ids: string[]
}

/** Read model: a restaurant with its visits (newest first) and derived stats. */
export interface RestaurantWithStats extends Restaurant {
  visits: Visit[]
  avg_rating: number
  last_visited_at: string
}

// --- Feature 3 (types only; no UI yet) ---------------------------------------

/** Frozen copy of a restaurant at share time, so later edits never change a sent link. */
export interface SharedItemSnapshot {
  name: string
  neighborhood: string | null
  city: string | null
  cuisine: string | null
  price_level: Restaurant['price_level']
  rating: number
  best_dish: string | null
  note: string | null
  tags: string[] // tag labels
}

export interface RecommendationItem {
  list_id: string
  restaurant_id: string
  position: number
  why_text: string | null
  snapshot: SharedItemSnapshot
}

export interface RecommendationList {
  id: string
  user_id: string
  slug: string
  title: string
  occasion: string | null
  from_name: string
  created_at: string
  items: RecommendationItem[]
}

export interface CreateRecommendationInput {
  title: string
  occasion: string | null
  from_name: string
  items: { restaurant_id: string; why_text: string | null; snapshot: SharedItemSnapshot }[]
}

/** What the public page needs; contains no user id or email. */
export interface PublicRecommendation {
  slug: string
  title: string
  occasion: string | null
  from_name: string
  created_at: string
  items: { why_text: string | null; snapshot: SharedItemSnapshot }[]
}

// --- Inputs ------------------------------------------------------------------

export interface LogVisitInput {
  name: string
  rating: number
  neighborhood?: string | null
  city?: string | null
  tag_ids?: string[]
  note?: string | null
  best_dish?: string | null
  photo_url?: string | null
  visited_at?: string
}

export type RestaurantPatch = Partial<
  Pick<Restaurant, 'name' | 'neighborhood' | 'city' | 'price_level' | 'cuisine' | 'dietary_flags'>
>

export const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'nut-free'] as const
