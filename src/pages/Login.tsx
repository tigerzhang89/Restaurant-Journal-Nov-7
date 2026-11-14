import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../data/AppContext'
import { MIN_PASSWORD } from '../data/auth'
import { Button, Logo, inputCls } from '../components/ui'

export default function Login() {
  const { user, loading, auth, signIn, signUp } = useApp()
  const nav = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="flex min-h-dvh items-center justify-center text-muted" role="status">Loading…</div>
  if (user) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        nav(from, { replace: true })
      } else {
        const needsConfirmation = await signUp(email, password)
        if (needsConfirmation) {
          setNotice('Account created. Check your email and click the confirmation link, then sign in.')
          setMode('signin'); setPassword('')
        } else nav(from, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const signup = mode === 'signup'
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Logo className="text-5xl" />
      <h1 className="mt-4 font-display text-3xl leading-tight">Remember every meal. Recommend like a pro.</h1>
      <p className="mt-3 text-muted">A private restaurant journal. Log a visit in seconds, then turn it into the perfect recommendation for any friend.</p>

      <form onSubmit={submit} className="mt-8 space-y-3">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
          <input id="email" type="email" inputMode="email" autoComplete="email" autoFocus required placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
          <input id="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={MIN_PASSWORD}
            placeholder={signup ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
            value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </div>
        {notice && <p role="status" className="rounded-xl bg-brand-soft p-3 text-sm text-brand-dark">{notice}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={busy || !email || !password} className="w-full">{signup ? 'Create account' : 'Sign in'}</Button>
        <p className="text-center text-sm text-muted">
          {signup ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" onClick={() => { setMode(signup ? 'signin' : 'signup'); setError(''); setNotice('') }} className="font-semibold text-brand-dark underline">
            {signup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        {auth.mode === 'mock' && <p className="text-center text-xs text-muted">Demo mode: any password works and nothing leaves this browser.</p>}
      </form>
    </div>
  )
}
