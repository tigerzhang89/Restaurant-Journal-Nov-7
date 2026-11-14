import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRepo } from '../data/AppContext'
import { DIETARY_OPTIONS, type RestaurantWithStats, type Tag } from '../types'
import { StarDisplay } from '../components/Stars'
import { Button, Chip, Pill, inputCls } from '../components/ui'
import { formatDate, priceLabel } from '../lib/format'
import { clean } from '../lib/validate'

export default function Detail() {
  const { id = '' } = useParams()
  const repo = useRepo()
  const nav = useNavigate()
  const [r, setR] = useState<RestaurantWithStats | null | undefined>(undefined)
  const [tags, setTags] = useState<Tag[]>([])
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    const [res, t] = await Promise.all([repo.getRestaurant(id), repo.listTags()])
    setR(res); setTags(t)
  }, [repo, id])
  useEffect(() => { void load() }, [load])

  if (r === undefined) return <p className="pt-10 text-center text-muted">Loading…</p>
  if (r === null) {
    return (
      <div className="pt-16 text-center">
        <p className="text-muted">We couldn’t find that restaurant.</p>
        <Link to="/" className="mt-2 inline-block font-medium text-brand-dark underline">Back to my list</Link>
      </div>
    )
  }

  const tagById = new Map(tags.map((t) => [t.id, t]))

  async function removeVisit(visitId: string) {
    if (!r || !confirm('Delete this visit? This can’t be undone.')) return
    await repo.deleteVisit(visitId)
    if (r.visits.length <= 1) { await repo.deleteRestaurantIfEmpty(r.id); nav('/', { replace: true }) } else await load()
  }

  return (
    <div className="space-y-5 pt-2">
      <Link to="/" className="text-sm text-muted hover:text-ink">← My list</Link>

      <header>
        <h1 className="font-display text-3xl leading-tight">{r.name}</h1>
        <p className="mt-1 text-muted">{[r.neighborhood, r.city].filter(Boolean).join(', ')}</p>
        <div className="mt-2 flex items-center gap-2">
          <StarDisplay value={r.avg_rating} className="h-5 w-5" />
          <span className="font-semibold">{r.avg_rating.toFixed(1)}</span>
          <span className="text-sm text-muted">· {r.visits.length} visit{r.visits.length === 1 ? '' : 's'}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {r.cuisine && <Pill>{r.cuisine}</Pill>}
          {r.price_level && <Pill>{priceLabel(r.price_level)}</Pill>}
          {r.dietary_flags.map((d) => <Pill key={d}>{d}</Pill>)}
          <button onClick={() => setEditing((e) => !e)} className="ml-1 text-sm font-medium text-brand-dark underline">{editing ? 'Close' : 'Edit details'}</button>
        </div>
      </header>

      {editing && <EditPanel r={r} onSave={async (patch) => { await repo.updateRestaurant(r.id, patch); setEditing(false); await load() }} />}

      <Link to={`/log?name=${encodeURIComponent(r.name)}`} className="block rounded-xl bg-brand py-3 text-center font-semibold text-white">Log another visit</Link>

      <section aria-labelledby="visits">
        <h2 id="visits" className="mb-3 font-display text-xl">Visits</h2>
        <ol className="space-y-4 border-l-2 border-line pl-4">
          {r.visits.map((v) => (
            <li key={v.id} className="relative rounded-2xl border border-line bg-card p-4">
              <span className="absolute -left-[1.4rem] top-5 h-3 w-3 rounded-full bg-brand ring-4 ring-paper" aria-hidden="true" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{formatDate(v.visited_at)}</span>
                <StarDisplay value={v.rating} />
              </div>
              {v.best_dish && <p className="mt-2 text-sm"><span className="text-muted">Best dish:</span> <b>{v.best_dish}</b></p>}
              {v.note && <p className="mt-1.5 whitespace-pre-wrap text-sm">{v.note}</p>}
              {v.photo_url && <img src={v.photo_url} alt={`${r.name} on ${formatDate(v.visited_at)}`} className="mt-3 max-h-64 w-full rounded-xl object-cover" />}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">{v.tag_ids.map((t) => <Pill key={t}>{tagById.get(t)?.label}</Pill>)}</div>
                <button onClick={() => void removeVisit(v.id)} className="text-xs text-muted hover:text-red-700">Delete</button>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function EditPanel({ r, onSave }: { r: RestaurantWithStats; onSave(patch: Parameters<ReturnType<typeof useRepo>['updateRestaurant']>[1]): Promise<void> }) {
  const [name, setName] = useState(r.name)
  const [hood, setHood] = useState(r.neighborhood ?? '')
  const [city, setCity] = useState(r.city ?? '')
  const [cuisine, setCuisine] = useState(r.cuisine ?? '')
  const [price, setPrice] = useState<number | null>(r.price_level)
  const [diet, setDiet] = useState<string[]>(r.dietary_flags)

  return (
    <form
      className="space-y-4 rounded-2xl border border-line bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        void onSave({ name: name.trim(), neighborhood: clean(hood), city: clean(city), cuisine: clean(cuisine), price_level: price as 1 | 2 | 3 | 4 | null, dietary_flags: diet })
      }}
    >
      <div><label htmlFor="e-name" className="mb-1 block text-sm font-medium">Name</label><input id="e-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="e-hood" className="mb-1 block text-sm font-medium">Neighborhood</label><input id="e-hood" value={hood} onChange={(e) => setHood(e.target.value)} className={inputCls} /></div>
        <div><label htmlFor="e-city" className="mb-1 block text-sm font-medium">City</label><input id="e-city" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></div>
      </div>
      <div><label htmlFor="e-cuisine" className="mb-1 block text-sm font-medium">Cuisine</label><input id="e-cuisine" value={cuisine} onChange={(e) => setCuisine(e.target.value)} className={inputCls} /></div>
      <div>
        <p className="mb-2 text-sm font-medium">Budget</p>
        <div className="flex gap-2">
          <Chip active={price === null} onClick={() => setPrice(null)}>—</Chip>
          {[1, 2, 3, 4].map((n) => <Chip key={n} active={price === n} onClick={() => setPrice(n)}>{'$'.repeat(n)}</Chip>)}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Dietary options</p>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((d) => <Chip key={d} active={diet.includes(d)} onClick={() => setDiet((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c, d]))}>{d}</Chip>)}
        </div>
      </div>
      <Button type="submit" className="w-full">Save changes</Button>
    </form>
  )
}
