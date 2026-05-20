'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card dash-card">
        <div className="auth-card-header">
          <h1 className="dash-card-title" style={{ fontSize: '1.35rem' }}>
            Sign in to Ledger
          </h1>
          <p className="auth-card-subtitle">
            Enter your email and password to access your account.
          </p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <label className="auth-field">
            <span className="dash-card-label">Email address</span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-input"
              placeholder="you@example.com"
            />
          </label>

          <label className="auth-field">
            <span className="dash-card-label">Password</span>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-input"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="dash-btn-accent auth-submit btn-press"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="auth-spinner" aria-hidden />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
