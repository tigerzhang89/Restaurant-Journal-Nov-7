import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** null when env vars are missing → the app falls back to offline demo mode. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const supabaseEnabled = supabase !== null
