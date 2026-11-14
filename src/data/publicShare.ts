import type { PublicRecommendation } from '../types'
import { decodePayload, isPublicRecommendation } from '../lib/recommend'
import { supabase } from './supabaseClient'

/**
 * Loads a shared card for the public page.
 * Supabase mode: calls the `get_public_recommendation` RPC (anon-safe, exposes no user data).
 * Offline demo mode: the link carries its own snapshot in the #d= hash.
 */
export async function loadPublicRecommendation(slug: string, hash: string): Promise<PublicRecommendation | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc('get_public_recommendation', { p_slug: slug })
    if (error || !isPublicRecommendation(data)) return null
    return data
  }
  const m = /(?:^#|&)d=([^&]+)/.exec(hash)
  const p = m ? decodePayload(m[1]) : null
  return p ? { ...p, slug } : null
}
