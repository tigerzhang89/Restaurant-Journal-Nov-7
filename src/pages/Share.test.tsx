import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Share from './Share'
import { encodePayload } from '../lib/recommend'

const rec = {
  slug: 'abc', title: 'Birthday dinner in Oakland', occasion: 'Special occasion', from_name: 'Lisa', created_at: '2026-11-07T00:00:00Z',
  items: [{ why_text: 'Quiet and warm', snapshot: { name: 'Wood Tavern', neighborhood: 'Rockridge', city: 'Oakland', cuisine: 'American', price_level: 3 as const, rating: 5, best_dish: 'Pork chop', note: 'Great service <b>x</b>', tags: [] } }],
}
const at = (hash: string) => render(
  <MemoryRouter initialEntries={[`/s/abc${hash}`]}><Routes><Route path="/s/:slug" element={<Share />} /></Routes></MemoryRouter>,
)

describe('Share page', () => {
  it('renders without login, with branding, CTA, and escaped text', async () => {
    at(`#d=${encodePayload(rec)}`)
    await screen.findByText('Birthday dinner in Oakland')
    expect(screen.getByText('Birthday dinner in Oakland')).toBeInTheDocument()
    expect(screen.getByText('Wood Tavern')).toBeInTheDocument()
    expect(screen.getByText(/Pork chop/)).toBeInTheDocument()
    expect(screen.getByText(/Great service <b>x<\/b>/)).toBeInTheDocument() // shown literally, not as HTML
    expect(screen.getAllByRole('link', { name: /Build your own food list/ }).length).toBeGreaterThan(0)
  })
  it('shows a friendly message for a broken link', async () => {
    at('')
    await waitFor(() => expect(screen.getByText(/can’t be found/)).toBeInTheDocument())
  })
})
