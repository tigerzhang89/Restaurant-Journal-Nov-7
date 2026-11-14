import { describe, expect, it } from 'vitest'
import { validateVisit, normalizeName } from './validate'
import { EMPTY_FILTERS, filterRestaurants, filtersFromParams, filtersToParams, sortRestaurants } from './filters'
import { LocalRepository } from '../data/localRepository'
import { MockAuth } from '../data/auth'
import { MemoryStorage } from './memoryStorage'

describe('validateVisit', () => {
  it('needs a name and 1–5 rating', () => {
    expect(validateVisit({ name: '', rating: 3 }).ok).toBe(false)
    expect(validateVisit({ name: 'Nopalito', rating: 0 }).ok).toBe(false)
    expect(validateVisit({ name: 'Nopalito', rating: 6 }).ok).toBe(false)
    expect(validateVisit({ name: 'Nopalito', rating: 5 }).ok).toBe(true)
  })
  it('allows at most 2 tags', () => {
    expect(validateVisit({ name: 'A', rating: 4, tag_ids: ['a', 'b'] }).ok).toBe(true)
    expect(validateVisit({ name: 'A', rating: 4, tag_ids: ['a', 'b', 'c'] }).ok).toBe(false)
  })
  it('normalizes names for matching', () => {
    expect(normalizeName("  Lers  Ros’ ")).toBe(normalizeName('lers ros'))
  })
})

describe('LocalRepository', () => {
  const make = () => new LocalRepository('u1', new MemoryStorage())

  it('creates a restaurant on first log and reuses it after', async () => {
    const repo = make()
    const a = await repo.logVisit({ name: 'Nopalito', rating: 5, neighborhood: 'NoPa' })
    const b = await repo.logVisit({ name: '  nopalito ', rating: 3 })
    expect(a.createdRestaurant).toBe(true)
    expect(b.createdRestaurant).toBe(false)
    const all = await repo.listRestaurants()
    expect(all).toHaveLength(1)
    expect(all[0].visits).toHaveLength(2)
    expect(all[0].avg_rating).toBe(4)
  })

  it('rejects invalid input', async () => {
    await expect(make().logVisit({ name: 'X', rating: 0 })).rejects.toThrow()
  })

  it('undo removes visit and empty restaurant', async () => {
    const repo = make()
    const r = await repo.logVisit({ name: 'Temp', rating: 4 })
    await repo.deleteVisit(r.visitId)
    await repo.deleteRestaurantIfEmpty(r.restaurant.id)
    expect(await repo.listRestaurants()).toHaveLength(0)
  })

  it('suggests from the user’s own log only', async () => {
    const repo = make()
    await repo.logVisit({ name: 'Burma Superstar', rating: 5 })
    expect((await repo.suggestRestaurants('burma')).map((r) => r.name)).toEqual(['Burma Superstar'])
    expect(await repo.suggestRestaurants('zzz')).toEqual([])
  })

  it('keeps users’ data separate', async () => {
    const storage = new MemoryStorage()
    await new LocalRepository('alice', storage).logVisit({ name: 'Secret Spot', rating: 5 })
    expect(await new LocalRepository('bob', storage).listRestaurants()).toHaveLength(0)
  })

  it('seeds sample data only once', async () => {
    const repo = make()
    repo.seedIfNew()
    const n = (await repo.listRestaurants()).length
    expect(n).toBeGreaterThan(5)
    repo.seedIfNew()
    expect(await repo.listRestaurants()).toHaveLength(n)
  })
})

describe('filters', () => {
  const seeded = async () => {
    const repo = new LocalRepository('u', new MemoryStorage())
    repo.seedIfNew()
    return repo.listRestaurants()
  }

  it('searches name, dish and notes', async () => {
    const list = await seeded()
    expect(filterRestaurants(list, { ...EMPTY_FILTERS, q: 'tea leaf' }).map((r) => r.name)).toEqual(
      expect.arrayContaining(['Burma Superstar']),
    )
    expect(filterRestaurants(list, { ...EMPTY_FILTERS, q: 'nopalito' })).toHaveLength(1)
  })

  it('filters by tag, rating, neighborhood', async () => {
    const list = await seeded()
    const parents = filterRestaurants(list, { ...EMPTY_FILTERS, tag: 'tag-parents' })
    expect(parents.map((r) => r.name).sort()).toEqual(['Burma Superstar', 'Wood Tavern'])
    expect(filterRestaurants(list, { ...EMPTY_FILTERS, minRating: 5 }).every((r) => r.avg_rating >= 5)).toBe(true)
    expect(filterRestaurants(list, { ...EMPTY_FILTERS, neighborhood: 'Uptown' }).map((r) => r.name).sort()).toEqual(['Calavera', 'Duende'])
  })

  it('filters by date range on visit dates', async () => {
    const list = await seeded()
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
    const recent = filterRestaurants(list, { ...EMPTY_FILTERS, from: weekAgo, to: today })
    expect(recent.map((r) => r.name)).toEqual(['Souvla'])
  })

  it('combines filters with AND', async () => {
    const list = await seeded()
    expect(filterRestaurants(list, { ...EMPTY_FILTERS, tag: 'tag-parents', neighborhood: 'Rockridge' }).map((r) => r.name)).toEqual(['Wood Tavern'])
  })

  it('sorts by rating then recency', async () => {
    const list = sortRestaurants(await seeded(), 'rating')
    expect(list[0].avg_rating).toBeGreaterThanOrEqual(list[1].avg_rating)
  })

  it('round-trips URL params', () => {
    const f = { ...EMPTY_FILTERS, q: 'ramen', tag: 'tag-groups', minRating: 4, neighborhood: 'Uptown', from: '2026-01-01', to: '2026-02-01' }
    expect(filtersFromParams(filtersToParams(f))).toEqual(f)
  })
})

describe('MockAuth', () => {
  it('signs in via magic link and rejects a wrong token', async () => {
    const auth = new MockAuth(new MemoryStorage())
    await expect(auth.requestLink('nope')).rejects.toThrow()
    const { devToken } = await auth.requestLink('Lisa@Example.com')
    await expect(auth.verifyLink('lisa@example.com', 'wrong')).rejects.toThrow()
    const u = await auth.verifyLink('lisa@example.com', devToken!)
    expect(u.email).toBe('lisa@example.com')
    expect(auth.getUser()?.id).toBe(u.id)
    auth.signOut()
    expect(auth.getUser()).toBeNull()
  })
  it('gives the same id for the same email', async () => {
    const s = new MemoryStorage()
    const a = new MockAuth(s)
    const t1 = (await a.requestLink('x@y.co')).devToken!
    const u1 = await a.verifyLink('x@y.co', t1)
    a.signOut()
    const t2 = (await a.requestLink('x@y.co')).devToken!
    expect((await a.verifyLink('x@y.co', t2)).id).toBe(u1.id)
  })
})

describe('password auth (demo mode)', () => {
  it('validates credentials and signs in', async () => {
    const auth = new MockAuth(new MemoryStorage())
    await expect(auth.signInWithPassword('bad', 'longenough')).rejects.toThrow(/valid email/)
    await expect(auth.signInWithPassword('a@b.co', 'short')).rejects.toThrow(/at least 8/)
    const u = await auth.signInWithPassword('A@B.co', 'longenough')
    expect(u.email).toBe('a@b.co')
    expect(auth.getUser()?.id).toBe(u.id)
    const s = await auth.signUpWithPassword('c@d.co', 'longenough')
    expect(s.needsConfirmation).toBe(false)
  })
})
