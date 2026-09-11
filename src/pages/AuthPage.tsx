import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type AuthMode = 'signin' | 'signup' | 'magic'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false })

  // Validation helpers
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const emailError = touched.email && email && !isValidEmail(email) ? 'Please enter a valid email address' : null
  const passwordError = touched.password && password && password.length < 6 ? 'Password must be at least 6 characters' : null

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({
          type: 'success',
          text: 'Account created! Check your email to confirm, then sign in.'
        })
        setMode('signin')
        setPassword('')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      }
      // If successful, App.tsx will handle the redirect via onAuthStateChange
    }

    setLoading(false)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Check your email for the login link!' })
      setEmail('')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Homestead
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your ADHD-friendly task manager
          </p>
        </div>

        <div className="card p-6">
          {/* Mode tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('signin'); setMessage(null); setTouched({ email: false, password: false }) }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setMessage(null); setTouched({ email: false, password: false }) }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => { setMode('magic'); setMessage(null); setTouched({ email: false, password: false }) }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                mode === 'magic'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Email/Password form */}
          {(mode === 'signin' || mode === 'signup') && (
            <form onSubmit={handleEmailPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  placeholder="you@example.com"
                  required
                  aria-invalid={emailError ? 'true' : undefined}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    emailError
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                />
                {emailError && (
                  <p id="email-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  required
                  minLength={6}
                  aria-invalid={passwordError ? 'true' : undefined}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    passwordError
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                />
                {passwordError && (
                  <p id="password-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Magic link form */}
          {mode === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label
                  htmlFor="email-magic"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email
                </label>
                <input
                  id="email-magic"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  placeholder="you@example.com"
                  required
                  aria-invalid={emailError ? 'true' : undefined}
                  aria-describedby={emailError ? 'email-magic-error' : undefined}
                  className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    emailError
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                />
                {emailError && (
                  <p id="email-magic-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                No password needed. We'll email you a link to sign in.
              </p>
            </form>
          )}

          {/* Message display */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          By signing up, you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}
