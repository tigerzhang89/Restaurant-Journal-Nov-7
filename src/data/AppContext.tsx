import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../types'
import { MockAuth, type AuthService } from './auth'
import { LocalRepository } from './localRepository'
import type { Repository } from './repository'
import { supabase } from './supabaseClient'
import { SupabaseAuth } from './supabaseAuth'
import { SupabaseRepository } from './supabaseRepository'

interface AppContextValue {
  auth: AuthService
  user: User | null
  /** True while a persisted Supabase session is being restored. */
  loading: boolean
  repo: Repository | null
  signIn(email: string, password: string): Promise<void>
  /** Resolves true when an emailed confirmation is still required. */
  signUp(email: string, password: string): Promise<boolean>
  signOut(): void
}

const Ctx = createContext<AppContextValue | null>(null)

const defaultAuth = (): AuthService => (supabase ? new SupabaseAuth(supabase) : new MockAuth())

export function AppProvider({ children, auth: injected }: { children: ReactNode; auth?: AuthService }) {
  const auth = useMemo<AuthService>(() => injected ?? defaultAuth(), [injected])
  const [user, setUser] = useState<User | null>(() => auth.getUser())
  const [loading, setLoading] = useState(auth.mode === 'supabase')

  const setStable = useCallback((next: User | null) => setUser((prev) => (prev?.id === next?.id ? prev : next)), [])

  useEffect(() => {
    if (auth.mode !== 'supabase') return
    let live = true
    const off = auth.onChange((u) => live && setStable(u))
    auth.init().then((u) => {
      if (!live) return
      setStable(u)
      setLoading(false)
    })
    return () => { live = false; off() }
  }, [auth, setStable])

  const userId = user?.id
  const repo = useMemo<Repository | null>(() => {
    if (!userId) return null
    return auth.mode === 'supabase' && supabase ? new SupabaseRepository(supabase, userId) : new LocalRepository(userId)
  }, [auth.mode, userId])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const u = await auth.signInWithPassword(email, password)
      if (auth.mode === 'mock') new LocalRepository(u.id).seedIfNew() // demo data for offline accounts
      setStable(u)
    },
    [auth, setStable],
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { user: u, needsConfirmation } = await auth.signUpWithPassword(email, password)
      if (u) {
        if (auth.mode === 'mock') new LocalRepository(u.id).seedIfNew()
        setStable(u)
      }
      return needsConfirmation
    },
    [auth, setStable],
  )

  const signOut = useCallback(() => {
    auth.signOut()
    setUser(null)
  }, [auth])

  const value = useMemo(() => ({ auth, user, loading, repo, signIn, signUp, signOut }), [auth, user, loading, repo, signIn, signUp, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}

/** Repo for signed-in screens; guaranteed non-null behind RequireAuth. */
// eslint-disable-next-line react-refresh/only-export-components
export function useRepo(): Repository {
  const { repo } = useApp()
  if (!repo) throw new Error('Not signed in')
  return repo
}
