import type { LogVisitInput } from '../types'

export const MAX_TAGS_PER_VISIT = 2

export interface ValidationResult {
  ok: boolean
  errors: Partial<Record<'name' | 'rating' | 'tags', string>>
}

export function validateVisit(input: Pick<LogVisitInput, 'name' | 'rating' | 'tag_ids'>): ValidationResult {
  const errors: ValidationResult['errors'] = {}
  if (!input.name || !input.name.trim()) errors.name = 'Add a restaurant name'
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) errors.rating = 'Pick a rating'
  if ((input.tag_ids?.length ?? 0) > MAX_TAGS_PER_VISIT) errors.tags = `Pick up to ${MAX_TAGS_PER_VISIT} tags`
  return { ok: Object.keys(errors).length === 0, errors }
}

export const normalizeName = (name: string) =>
  name.trim().toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ')

export const clean = (s: string | null | undefined): string | null => {
  const t = s?.trim()
  return t ? t : null
}
