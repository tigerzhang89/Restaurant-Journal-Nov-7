import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useRepo } from '../data/AppContext'
import type { Restaurant, Tag } from '../types'
import { StarInput } from '../components/Stars'
import { Button, Chip, inputCls } from '../components/ui'
import { Toast } from '../components/Toast'
import { MAX_TAGS_PER_VISIT, validateVisit } from '../lib/validate'
import { fileToDataUrl } from '../lib/image'

interface Saved { restaurantId: string; visitId: string; created: boolean; name: string }

export default function Log() {
  const repo = useRepo()
  const [params] = useSearchParams()
  const [tags, setTags] = useState<Tag[]>([])
  const [lastHood, setLastHood] = useState<{ neighborhood: string; city: string }>({ neighborhood: '', city: '' })

  const [name, setName] = useState('')
  const [picked, setPicked] = useState<Restaurant | null>(null)
  const [suggestions, setSuggestions] = useState<Restaurant[]>([])
  const [rating, setRating] = useState(0)
  const [hood, setHood] = useState('')
  const [city, setCity] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [dish, setDish] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Saved | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let live = true
    Promise.all([repo.listTags(), repo.listRestaurants()]).then(([t, rs]) => {
      if (!live) return
      setTags(t)
      const wanted = params.get('name')
      const existing = wanted ? rs.find((r) => r.name === wanted) : undefined
      if (existing) {
        setPicked(existing); setName(existing.name)
        setHood(existing.neighborhood ?? ''); setCity(existing.city ?? '')
        setTimeout(() => document.getElementById('name')?.blur(), 0)
        return
      }
      const latest = [...rs].sort((a, b) => b.last_visited_at.localeCompare(a.last_visited_at))[0]
      if (latest) {
        const l = { neighborhood: latest.neighborhood ?? '', city: latest.city ?? '' }
        setLastHood(l)
        setHood((h) => h || l.neighborhood)
        setCity((c) => c || l.city)
      }
    })
    return () => { live = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo])

  useEffect(() => {
    let live = true
    if (picked || !name.trim()) { setSuggestions([]); return }
    repo.suggestRestaurants(name).then((s) => live && setSuggestions(s))
    return () => { live = false }
  }, [name, picked, repo])

  const check = useMemo(() => validateVisit({ name, rating, tag_ids: tagIds }), [name, rating, tagIds])

  function pick(r: Restaurant) {
    setPicked(r)
    setName(r.name)
    setHood(r.neighborhood ?? lastHood.neighborhood)
    setCity(r.city ?? lastHood.city)
    setSuggestions([])
  }

  function toggleTag(id: string) {
    setTagIds((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : cur.length < MAX_TAGS_PER_VISIT ? [...cur, id] : cur))
  }

  async function onPhoto(file?: File) {
    if (!file) return
    try { setPhoto(await fileToDataUrl(file)) } catch { setError('Could not read that photo') }
  }

  function reset(nextHood = lastHood.neighborhood, nextCity = lastHood.city) {
    setName(''); setPicked(null); setRating(0); setTagIds([]); setNote(''); setDish(''); setPhoto(null); setMore(false); setError('')
    setHood(nextHood); setCity(nextCity)
    nameRef.current?.focus()
  }

  async function save() {
    if (!check.ok) { setError(Object.values(check.errors)[0] ?? ''); return }
    setSaving(true); setError('')
    try {
      const r = await repo.logVisit({ name, rating, neighborhood: hood, city, tag_ids: tagIds, note, best_dish: dish, photo_url: photo })
      setLastHood({ neighborhood: hood, city })
      setSaved({ restaurantId: r.restaurant.id, visitId: r.visitId, created: r.createdRestaurant, name: r.restaurant.name })
      reset(hood, city)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally { setSaving(false) }
  }

  async function undo() {
    if (!saved) return
    await repo.deleteVisit(saved.visitId)
    if (saved.created) await repo.deleteRestaurantIfEmpty(saved.restaurantId)
    setSaved(null)
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save() }} className="space-y-5 pt-2">
      <div>
        <h1 className="font-display text-3xl">Log a visit</h1>
        <p className="text-sm text-muted">Name and rating is all you need.</p>
      </div>

      <div className="relative">
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Restaurant</label>
        <input ref={nameRef} id="name" autoFocus autoComplete="off" autoCapitalize="words" placeholder="Where did you eat?"
          value={name} onChange={(e) => { setName(e.target.value); setPicked(null) }} className={inputCls}
          role="combobox" aria-expanded={suggestions.length > 0} aria-controls="suggest" />
        {suggestions.length > 0 && (
          <ul id="suggest" role="listbox" className="absolute inset-x-0 z-10 mt-1 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id} role="option" aria-selected={false}>
                <button type="button" onClick={() => pick(s)} className="flex w-full items-center justify-between px-3.5 py-3 text-left hover:bg-brand-soft">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted">{s.neighborhood}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {picked && <p className="mt-1.5 text-xs text-muted">Been here before — this adds a new visit.</p>}
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">How was it?</span>
        <StarInput value={rating} onChange={setRating} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span aria-hidden="true">📍</span>
        <input aria-label="Neighborhood" placeholder="Neighborhood" value={hood} onChange={(e) => setHood(e.target.value)}
          className="w-36 rounded-full border border-line bg-card px-3 py-1.5 text-ink focus:border-brand focus:outline-none" />
        <input aria-label="City" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)}
          className="w-32 rounded-full border border-line bg-card px-3 py-1.5 text-ink focus:border-brand focus:outline-none" />
        <span>· Today</span>
      </div>

      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more}
        className="text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">
        {more ? '− Hide details' : '+ Add tags, note, best dish, photo'}
      </button>

      {more && (
        <div className="space-y-5 rounded-2xl border border-line bg-card p-4">
          <div>
            <p className="mb-2 text-sm font-medium">Good for <span className="font-normal text-muted">(pick up to {MAX_TAGS_PER_VISIT})</span></p>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Chip key={t.id} active={tagIds.includes(t.id)} onClick={() => toggleTag(t.id)} disabled={!tagIds.includes(t.id) && tagIds.length >= MAX_TAGS_PER_VISIT}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="dish" className="mb-1.5 block text-sm font-medium">Best dish</label>
            <input id="dish" value={dish} onChange={(e) => setDish(e.target.value)} placeholder="What should everyone order?" className={inputCls} />
          </div>
          <div>
            <label htmlFor="note" className="mb-1.5 block text-sm font-medium">Note</label>
            <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Vibe, service, what to skip…" className={inputCls} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Photo</span>
            {photo ? (
              <div className="relative inline-block">
                <img src={photo} alt="Your photo preview" className="h-32 w-32 rounded-xl object-cover" />
                <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo" className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-ink text-white">×</button>
              </div>
            ) : (
              <label className="flex h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted hover:bg-brand-soft">
                📷 Add a photo
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <Button type="submit" disabled={saving || !check.ok} className="w-full py-3.5 text-lg">Save visit</Button>

      {saved && (
        <Toast onClose={() => setSaved(null)}>
          <span>Saved <b>{saved.name}</b></span>
          <span className="flex gap-3 font-semibold">
            <button type="button" onClick={() => void undo()} className="underline">Undo</button>
            <Link to={`/r/${saved.restaurantId}`} className="underline">View</Link>
          </span>
        </Toast>
      )}
    </form>
  )
}
