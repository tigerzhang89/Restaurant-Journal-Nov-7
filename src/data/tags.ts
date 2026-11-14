import type { Tag } from '../types'

// Fixed list for the MVP. Seeded into the `tags` table when Supabase lands.
export const TAGS: Tag[] = [
  { id: 'tag-date-night', slug: 'date-night', label: 'Date night' },
  { id: 'tag-groups', slug: 'good-for-groups', label: 'Good for groups' },
  { id: 'tag-quick-bite', slug: 'quick-bite', label: 'Quick bite' },
  { id: 'tag-special-occasion', slug: 'special-occasion', label: 'Special occasion' },
  { id: 'tag-parents', slug: 'good-for-parents', label: 'Good for parents' },
]
