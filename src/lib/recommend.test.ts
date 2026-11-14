import { describe, expect, it } from 'vitest'
import { LocalRepository } from '../data/localRepository'
import { TAGS } from '../data/tags'
import { MemoryStorage } from './memoryStorage'
import {
  EMPTY_REC_FILTERS, decodePayload, defaultTitle, defaultWhy, occasionPhrase, encodePayload, hiddenByMissingPrice, matchRestaurants, shareUrl, snapshotOf, toPublic,
} from './recommend'

const seeded = async () => {
  const repo = new LocalRepository('u', new MemoryStorage())
  repo.seedIfNew()
  return { repo, list: await repo.listRestaurants() }
}

describe('matchRestaurants', () => {
  it('ranks by rating for an occasion', async () => {
    const { list } = await seeded()
    const r = matchRestaurants(list, { ...EMPTY_REC_FILTERS, occasion: 'tag-parents' })
    expect(r.map((x) => x.name)).toEqual(['Wood Tavern', 'Burma Superstar'])
    expect(r[0].avg_rating).toBeGreaterThanOrEqual(r[1].avg_rating)
  })
  it('filters by area, budget ceiling and dietary need (all required)', async () => {
    const { list } = await seeded()
    expect(matchRestaurants(list, { ...EMPTY_REC_FILTERS, neighborhood: 'Uptown', maxPrice: 3 }).map((r) => r.name).sort()).toEqual(['Calavera', 'Duende'])
    expect(matchRestaurants(list, { ...EMPTY_REC_FILTERS, dietary: ['vegan'] }).map((r) => r.name)).toEqual(['Burma Love'])
    expect(matchRestaurants(list, { ...EMPTY_REC_FILTERS, maxPrice: 1 }).every((r) => (r.price_level ?? 9) <= 1)).toBe(true)
  })
  it('hides restaurants without a price when budget is set, and counts them', async () => {
    const repo = new LocalRepository('u2', new MemoryStorage())
    await repo.logVisit({ name: 'No Price Cafe', rating: 5 })
    const list = await repo.listRestaurants()
    expect(matchRestaurants(list, { ...EMPTY_REC_FILTERS, maxPrice: 2 })).toHaveLength(0)
    expect(hiddenByMissingPrice(list, { ...EMPTY_REC_FILTERS, maxPrice: 2 })).toBe(1)
  })
})

describe('defaultWhy', () => {
  it('reads naturally for every occasion tag', async () => {
    const { list } = await seeded()
    const r = list.find((x) => x.name === 'Burma Superstar')!
    expect(defaultWhy(r, TAGS, 'tag-parents')).toBe('Good for parents — been 2 times.')
    expect(defaultWhy(r, TAGS, 'tag-date-night')).toBe('Great for date night — been 2 times.')
  })
})

describe('occasionPhrase', () => {
  it('never doubles "good for"', () => {
    expect(occasionPhrase('Good for parents')).toBe('good for parents')
    expect(occasionPhrase('Date night')).toBe('good for date night')
  })
})

describe('recommendations', () => {
  it('creates a snapshot unaffected by later edits', async () => {
    const { repo, list } = await seeded()
    const r = list.find((x) => x.name === 'Wood Tavern')!
    const rec = await repo.createRecommendation({
      title: 'Dad’s birthday', occasion: 'Good for parents', from_name: 'Lisa',
      items: [{ restaurant_id: r.id, why_text: 'Quiet and warm', snapshot: snapshotOf(r, TAGS, 'tag-parents') }],
    })
    await repo.updateRestaurant(r.id, { name: 'Renamed' })
    const stored = (await repo.listRecommendations())[0]
    expect(stored.items[0].snapshot.name).toBe('Wood Tavern')
    expect(stored.items[0].snapshot.best_dish).toBe('Pork chop')
    expect(rec.slug).toMatch(/^[a-z2-9]{10}$/)
  })
  it('enforces 1–5 items', async () => {
    const { repo } = await seeded()
    await expect(repo.createRecommendation({ title: 't', occasion: null, from_name: 'x', items: [] })).rejects.toThrow()
  })
  it('share payload round-trips (unicode) and carries no private ids', async () => {
    const { repo, list } = await seeded()
    const r = list[0]
    const snap = { ...snapshotOf(r, TAGS, ''), note: 'Crème brûlée 🍮 “wow”' }
    const rec = await repo.createRecommendation({ title: 'Café picks', occasion: null, from_name: 'Zoë', items: [{ restaurant_id: r.id, why_text: null, snapshot: snap }] })
    const decoded = decodePayload(encodePayload(toPublic(rec)))
    expect(decoded?.items[0].snapshot.note).toBe(snap.note)
    expect(decoded?.from_name).toBe('Zoë')
    expect(JSON.stringify(decoded)).not.toMatch(/user_id|restaurant_id|@/)
    expect(shareUrl(rec, 'https://x.test')).toMatch(/^https:\/\/x\.test\/s\/[a-z2-9]{10}#d=/)
  })
  it('rejects malformed payloads', () => {
    expect(decodePayload('not-base64!!')).toBeNull()
    expect(decodePayload(btoa('{"title":1}'))).toBeNull()
  })
  it('suggests a sensible default title', () => {
    expect(defaultTitle({ ...EMPTY_REC_FILTERS, occasion: 'tag-parents', neighborhood: 'Oakland' }, TAGS)).toBe('Good for parents in Oakland')
  })
})
