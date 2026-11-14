import type { Restaurant, RestaurantWithStats, Visit } from '../types'

export function withStats(r: Restaurant, allVisits: Visit[]): RestaurantWithStats {
  const visits = allVisits.filter((v) => v.restaurant_id === r.id).sort((a, b) => b.visited_at.localeCompare(a.visited_at))
  const avg = visits.length ? visits.reduce((s, v) => s + v.rating, 0) / visits.length : 0
  return { ...r, visits, avg_rating: avg, last_visited_at: visits[0]?.visited_at ?? r.created_at }
}
