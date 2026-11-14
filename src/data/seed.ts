import type { Restaurant, Visit } from '../types'

interface SeedVisit {
  daysAgo: number
  rating: Visit['rating']
  tags?: string[]
  note?: string
  dish?: string
}
interface SeedRestaurant {
  name: string
  hood: string
  city: string
  price: Restaurant['price_level']
  cuisine: string
  diet?: string[]
  visits: SeedVisit[]
}

const DATA: SeedRestaurant[] = [
  { name: 'Nopalito', hood: 'NoPa', city: 'San Francisco', price: 2, cuisine: 'Mexican', diet: ['gluten-free'], visits: [
    { daysAgo: 12, rating: 5, tags: ['tag-groups'], note: 'Loud but lively. Booked a long table for 8 and it was easy.', dish: 'Carnitas' } ] },
  { name: 'Burma Superstar', hood: 'Richmond', city: 'San Francisco', price: 2, cuisine: 'Burmese', diet: ['vegetarian'], visits: [
    { daysAgo: 95, rating: 4, tags: ['tag-groups'], dish: 'Tea leaf salad' },
    { daysAgo: 20, rating: 5, tags: ['tag-groups', 'tag-parents'], note: 'Mom loved it. Go early, the wait is real.', dish: 'Tea leaf salad' } ] },
  { name: 'Kin Khao', hood: 'Union Square', city: 'San Francisco', price: 3, cuisine: 'Thai', visits: [
    { daysAgo: 40, rating: 4, tags: ['tag-date-night'], note: 'Bold flavors, a bit spicy for dad.', dish: 'Hat yai fried chicken' } ] },
  { name: 'Wood Tavern', hood: 'Rockridge', city: 'Oakland', price: 3, cuisine: 'American', visits: [
    { daysAgo: 60, rating: 5, tags: ['tag-special-occasion', 'tag-parents'], note: 'Birthday dinner for my dad. Quiet enough to talk, service was warm.', dish: 'Pork chop' } ] },
  { name: 'Duende', hood: 'Uptown', city: 'Oakland', price: 3, cuisine: 'Spanish', visits: [
    { daysAgo: 33, rating: 4, tags: ['tag-date-night'], note: 'Great for tapas and a bottle of wine.', dish: 'Patatas bravas' } ] },
  { name: 'Shan Dong', hood: 'Chinatown', city: 'Oakland', price: 1, cuisine: 'Chinese', visits: [
    { daysAgo: 8, rating: 4, tags: ['tag-quick-bite'], dish: 'Hand-pulled noodles' } ] },
  { name: 'Calavera', hood: 'Uptown', city: 'Oakland', price: 3, cuisine: 'Mexican', diet: ['vegetarian'], visits: [
    { daysAgo: 150, rating: 3, tags: ['tag-groups'], note: 'Good, not great. Mezcal list is the highlight.' } ] },
  { name: 'Burma Love', hood: 'Mission', city: 'San Francisco', price: 2, cuisine: 'Burmese', diet: ['vegan', 'vegetarian'], visits: [
    { daysAgo: 25, rating: 3, tags: ['tag-quick-bite'], note: 'Skip. Tea leaf salad was fine but nothing special.' } ] },
  { name: 'Tartine Manufactory', hood: 'Mission', city: 'San Francisco', price: 3, cuisine: 'Bakery', visits: [
    { daysAgo: 70, rating: 4, tags: ['tag-quick-bite'], dish: 'Morning bun' } ] },
  { name: 'Commis', hood: 'Piedmont Ave', city: 'Oakland', price: 4, cuisine: 'Californian', visits: [
    { daysAgo: 200, rating: 5, tags: ['tag-special-occasion', 'tag-date-night'], note: 'Anniversary tasting menu. Worth it once a year.', dish: 'Egg onsen' } ] },
  { name: 'Souvla', hood: 'Hayes Valley', city: 'San Francisco', price: 2, cuisine: 'Greek', diet: ['vegetarian'], visits: [
    { daysAgo: 5, rating: 4, tags: ['tag-quick-bite'], dish: 'Lamb sandwich' } ] },
  { name: 'Ippuku', hood: 'Downtown Berkeley', city: 'Berkeley', price: 3, cuisine: 'Japanese', visits: [
    { daysAgo: 110, rating: 5, tags: ['tag-date-night', 'tag-groups'], note: 'Yakitori and shochu. Reserve ahead.', dish: 'Chicken thigh skewer' } ] },
]

const uid = () => crypto.randomUUID()
const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString()

export function buildSeed(userId: string): { restaurants: Restaurant[]; visits: Visit[] } {
  const restaurants: Restaurant[] = []
  const visits: Visit[] = []
  for (const d of DATA) {
    const id = uid()
    const oldest = Math.max(...d.visits.map((v) => v.daysAgo))
    restaurants.push({
      id,
      user_id: userId,
      name: d.name,
      neighborhood: d.hood,
      city: d.city,
      price_level: d.price,
      cuisine: d.cuisine,
      dietary_flags: d.diet ?? [],
      created_at: at(oldest),
    })
    for (const v of d.visits) {
      visits.push({
        id: uid(),
        restaurant_id: id,
        user_id: userId,
        rating: v.rating,
        note: v.note ?? null,
        best_dish: v.dish ?? null,
        photo_url: null,
        visited_at: at(v.daysAgo),
        created_at: at(v.daysAgo),
        tag_ids: v.tags ?? [],
      })
    }
  }
  return { restaurants, visits }
}
