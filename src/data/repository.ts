import type { CreateRecommendationInput, LogVisitInput, RecommendationList, Restaurant, RestaurantPatch, RestaurantWithStats, Tag } from '../types'

/**
 * The Supabase seam. The UI only talks to this interface; swap
 * `localRepository.ts` for a `supabaseRepository.ts` later without touching pages.
 * Every method is implicitly scoped to the signed-in user (RLS on the backend).
 */
export interface Repository {
  listTags(): Promise<Tag[]>
  listRestaurants(): Promise<RestaurantWithStats[]>
  getRestaurant(id: string): Promise<RestaurantWithStats | null>
  /** Finds or creates the restaurant by name, then adds a visit. */
  logVisit(input: LogVisitInput): Promise<{ restaurant: Restaurant; visitId: string; createdRestaurant: boolean }>
  deleteVisit(visitId: string): Promise<void>
  /** Removes a restaurant created by a log that is being undone (only if it has no visits). */
  deleteRestaurantIfEmpty(restaurantId: string): Promise<void>
  updateRestaurant(id: string, patch: RestaurantPatch): Promise<Restaurant>
  createRecommendation(input: CreateRecommendationInput): Promise<RecommendationList>
  listRecommendations(): Promise<RecommendationList[]>
  /** Autocomplete over restaurants the user has already logged. */
  suggestRestaurants(query: string, limit?: number): Promise<Restaurant[]>
}

/** Pluggable seam for a places API (Google Places etc.). Not used in the MVP. */
export interface PlacesProvider {
  autocomplete(query: string): Promise<{ name: string; neighborhood?: string; city?: string; place_id: string }[]>
}
