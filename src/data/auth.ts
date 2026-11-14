import type { User } from '../types'

/**
 * Auth seam. `MockAuth` fakes a magic-link flow in the browser.
 * Replace with a Supabase implementation (`supabase.auth.signInWithOtp`) later.
 */
export interface AuthService {
  /** 'mock' = offline demo sign-in; 'supabase' = real email magic link. */
  readonly mode: 'mock' | 'supabase'
  /** Current user as last known (sync). */
  getUser(): User | null
  /** Resolves the persisted session (async for Supabase). */
  init(): Promise<User | null>
  /** Subscribe to sign-in / sign-out. Returns an unsubscribe function. */
  onChange(cb: (user: User | null) => void): () => void
  /** Sends a magic link. Mock returns the link token so the UI can offer a dev shortcut. */
  requestLink(email: string): Promise<{ devToken?: string }>
  verifyLink(email: string, token: string): Promise<User>
  signInWithPassword(email: string, password: string): Promise<User>
  /** needsConfirmation = true when the project requires clicking an emailed confirmation first. */
  signUpWithPassword(email: string, password: string): Promise<{ user: User | null; needsConfirmation: boolean }>
  signOut(): void
}

const USER_KEY = 'fork:v1:user'
const PENDING_KEY = 'fork:v1:pending'

async function userIdFor(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const MIN_PASSWORD = 8

export function validateCredentials(email: string, password: string): string | null {
  if (!isValidEmail(email)) return 'Enter a valid email address'
  if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters`
  return null
}

export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

export class MockAuth implements AuthService {
  readonly mode = 'mock' as const
  private storage: Storage
  constructor(storage: Storage = localStorage) {
    this.storage = storage
  }

  getUser(): User | null {
    try {
      const raw = this.storage.getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  }

  async init() {
    return this.getUser()
  }

  onChange() {
    return () => {}
  }

  async requestLink(email: string) {
    const clean = email.trim().toLowerCase()
    if (!isValidEmail(clean)) throw new Error('Enter a valid email address')
    const token = crypto.randomUUID()
    this.storage.setItem(PENDING_KEY, JSON.stringify({ email: clean, token, expires: Date.now() + 15 * 60_000 }))
    return { devToken: token }
  }

  async verifyLink(email: string, token: string) {
    const clean = email.trim().toLowerCase()
    const raw = this.storage.getItem(PENDING_KEY)
    const pending = raw ? (JSON.parse(raw) as { email: string; token: string; expires: number }) : null
    if (!pending || pending.email !== clean || pending.token !== token || pending.expires < Date.now()) {
      throw new Error('That link has expired. Request a new one.')
    }
    this.storage.removeItem(PENDING_KEY)
    const user: User = { id: await userIdFor(clean), email: clean, created_at: new Date().toISOString() }
    this.storage.setItem(USER_KEY, JSON.stringify(user))
    return user
  }

  /** Demo mode: any password works; there is no real account. */
  async signInWithPassword(email: string, password: string) {
    const bad = validateCredentials(email, password)
    if (bad) throw new Error(bad)
    const clean = email.trim().toLowerCase()
    const user: User = { id: await userIdFor(clean), email: clean, created_at: new Date().toISOString() }
    this.storage.setItem(USER_KEY, JSON.stringify(user))
    return user
  }

  async signUpWithPassword(email: string, password: string) {
    return { user: await this.signInWithPassword(email, password), needsConfirmation: false }
  }

  signOut() {
    this.storage.removeItem(USER_KEY)
  }
}
