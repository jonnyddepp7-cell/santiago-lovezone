
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './Auth.css'

export default function Auth({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message)
      setSession(data?.session ?? null)
      setLoading(false)
    })

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession)
      })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name }
          }
        })

        if (error) throw error

        if (data.session) {
          setSession(data.session)
          setMessage('Your account has been created!')
        } else {
          setMessage('Account created. Please check your email to confirm your address before logging in.')
          setIsSignup(false)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error
        setSession(data.session)
        setMessage('Welcome back!')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) setError(error.message)
    else setSession(null)
  }

  if (loading) {
    return <div className="auth-loading">Loading Lovezone...</div>
  }

  if (session) {
    return (
      <>
        <div className="auth-account-bar">
          <span>
            Signed in as {session.user.email}
          </span>
          <button onClick={handleLogout}>Log out</button>
        </div>
        {children}
      </>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">♥</div>
        <h1>SANTIAGO LOVEZONE</h1>
        <p className="auth-subtitle">
          Connect. Chat. Play. Love.
        </p>

        <div className="auth-tabs">
          <button
            className={!isSignup ? 'active' : ''}
            onClick={() => {
              setIsSignup(false)
              setError('')
              setMessage('')
            }}
          >
            Login
          </button>
          <button
            className={isSignup ? 'active' : ''}
            onClick={() => {
              setIsSignup(true)
              setError('')
              setMessage('')
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button
            className="auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? 'Please wait...'
              : isSignup
                ? 'Create my account'
                : 'Login to Lovezone'}
          </button>
        </form>

        <p className="auth-footer">
          By continuing, you agree to use Lovezone respectfully
          and protect other users' privacy.
        </p>
      </section>
    </main>
  )
}
