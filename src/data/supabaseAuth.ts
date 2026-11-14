import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { User } from '../types'
import { isValidEmail, validateCredentials, type AuthService } from './auth'

const toUser = (s: Session | null): User | null =>
  s?.user ? { id: s.user.id, email: s.user.email ?? '', created_at: s.user.created_at } : null

export class SupabaseAuth implements AuthService {
  readonly mode = 'supabase' as const
  private client: SupabaseClient
  private current: User | null = null

  constructor(client: SupabaseClient) {
    this.client = client
  }

  getUser() {
    return this.current
  }

  async init() {
    // Also completes a magic-link sign-in when the page was opened from the emailed link.
    const { data } = await this.client.auth.getSession()
    this.current = toUser(data.session)
    return this.current
  }

  onChange(cb: (user: User | null) => void) {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      this.current = toUser(session)
      cb(this.current)
    })
    return () => data.subscription.unsubscribe()
  }

  async requestLink(email: string) {
    const clean = email.trim().toLowerCase()
    if (!isValidEmail(clean)) throw new Error('Enter a valid email address')
    const { error } = await this.client.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
    return {}
  }

  async signInWithPassword(email: string, password: string) {
    const bad = validateCredentials(email, password)
    if (bad) throw new Error(bad)
    const { data, error } = await this.client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) {
      if (/invalid login/i.test(error.message)) throw new Error('Wrong email or password. If you signed up with a magic link before, create a new account instead.')
      if (/not confirmed/i.test(error.message)) throw new Error('Please confirm your email first — check your inbox for the link.')
      throw new Error(error.message)
    }
    const u = toUser(data.session)
    if (!u) throw new Error('Could not sign in')
    this.current = u
    return u
  }

  async signUpWithPassword(email: string, password: string) {
    const bad = validateCredentials(email, password)
    if (bad) throw new Error(bad)
    const { data, error } = await this.client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      if (/already registered/i.test(error.message)) throw new Error('That email already has an account. Try signing in.')
      throw new Error(error.message)
    }
    this.current = toUser(data.session)
    return { user: this.current, needsConfirmation: !data.session }
  }

  async verifyLink(): Promise<User> {
    throw new Error('Open the link from your email to sign in.')
  }

  signOut() {
    void this.client.auth.signOut()
    this.current = null
  }
}
