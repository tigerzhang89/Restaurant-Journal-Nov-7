import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../data/AppContext'
import { Logo } from './ui'

export function RequireAuth() {
  const { user, loading } = useApp()
  const loc = useLocation()
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-muted" role="status">Loading…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  return <Shell />
}

function Shell() {
  const { user, signOut } = useApp()
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <Logo />
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="hidden max-w-40 truncate sm:inline">{user?.email}</span>
          <button onClick={signOut} className="rounded-lg px-2 py-1 hover:bg-brand-soft">Sign out</button>
        </div>
      </header>
      <main className="flex-1 px-4 pb-28"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper" aria-label="Main">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-4 pb-[max(env(safe-area-inset-bottom),24px)] pt-2">
          <NavLink to="/" end className={({ isActive }) => `flex w-24 flex-col items-center gap-0.5 text-xs font-medium ${isActive ? 'text-brand' : 'text-muted'}`}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            My list
          </NavLink>
          <NavLink to="/log" aria-label="Log a visit" className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white transition active:scale-95">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </NavLink>
          <NavLink to="/recommend" className={({ isActive }) => `flex w-24 flex-col items-center gap-0.5 text-xs font-medium ${isActive ? 'text-brand' : 'text-muted'}`}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7h16v-7M12 3v12M8 7l4-4 4 4" /></svg>
            Share
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
