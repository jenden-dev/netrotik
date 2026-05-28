'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { MikrotikCreds } from '@/types'

export default function LoginPage() {
  const router = useRouter()
  const [creds, setCreds] = useState<MikrotikCreds>({
    host: '',
    port: 8728,
    username: 'admin',
    password: '',
  })
  const [rememberMe, setRememberMe]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showCookies, setShowCookies] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill form from saved credentials
  useEffect(() => {
    const saved = localStorage.getItem('mkSavedCreds')
    if (saved) {
      setCreds(JSON.parse(saved))
      setRememberMe(true)
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      const stored = { ...creds, host: data.resolvedHost ?? creds.host }
      sessionStorage.setItem('mkCreds', JSON.stringify(stored))
      sessionStorage.removeItem('mkSetupDone')
      if (rememberMe) {
        localStorage.setItem('mkSavedCreds', JSON.stringify(stored))
      } else {
        localStorage.removeItem('mkSavedCreds')
      }
      router.push('/generate')
    } catch {
      setError('Cannot connect — check network or router IP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Brand Panel ─────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center px-8 py-14 lg:flex-1
                      bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-36 -right-20 w-[28rem] h-[28rem] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full bg-white/[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-xs text-center lg:text-left">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-white/15 backdrop-blur-sm ring-1 ring-white/25 mb-7 shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}>
            MikroTik<br />Hotspot Manager
          </h1>
          <p className="text-indigo-200 text-sm leading-relaxed mb-10">
            Connect, generate, and manage your WiFi vouchers — fast, simple, powerful.
          </p>

          <ul className="space-y-3 hidden lg:block">
            {[
              'Generate hundreds of vouchers instantly',
              'Print 3 card designs on any paper size',
              'Monitor live active sessions in real-time',
            ].map((feat) => (
              <li key={feat} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-400/25
                                 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                </span>
                <span className="text-indigo-100 text-sm">{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Login Form ──────────────────────────────── */}
      <div className="flex items-center justify-center px-6 py-12 bg-slate-50 lg:w-[480px]">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1"
                style={{ fontFamily: 'var(--font-heading)' }}>
              Connect to Router
            </h2>
            <p className="text-slate-500 text-sm">Enter your RouterOS API credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Host */}
            <div>
              <label htmlFor="host" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Connect to
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                </span>
                <input
                  id="host" name="host"
                  type="text" required
                  autoComplete="url"
                  placeholder="IP address, hostname, or MAC"
                  value={creds.host}
                  onChange={(e) => setCreds({ ...creds, host: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm
                             text-slate-900 placeholder:text-slate-400 shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Port */}
            <div>
              <label htmlFor="port" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Port
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  id="port" name="port"
                  type="number"
                  required
                  min={1}
                  max={65535}
                  list="port-suggestions"
                  autoComplete="off"
                  value={creds.port}
                  onChange={(e) => setCreds({ ...creds, port: Number(e.target.value) })}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm
                             text-slate-900 shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <datalist id="port-suggestions">
                  <option value={8728}>8728 — API (default)</option>
                  <option value={8729}>8729 — API-SSL</option>
                  <option value={80}>80 — HTTP</option>
                  <option value={443}>443 — HTTPS</option>
                  <option value={8080}>8080 — HTTP alt</option>
                  <option value={22}>22 — SSH</option>
                  <option value={23}>23 — Telnet</option>
                  <option value={8291}>8291 — Winbox</option>
                </datalist>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  id="username" name="username"
                  type="text" required
                  autoComplete="username"
                  value={creds.username}
                  onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm
                             text-slate-900 shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={creds.password}
                  onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                  placeholder="Leave blank if no password"
                  className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm
                             text-slate-900 placeholder:text-slate-400 shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked)
                    if (!e.target.checked) localStorage.removeItem('mkSavedCreds')
                  }}
                  className="sr-only peer"
                />
                <div className="w-4 h-4 rounded border border-slate-300 bg-white
                                peer-checked:bg-indigo-600 peer-checked:border-indigo-600
                                transition-colors flex items-center justify-center">
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-500">Remember Me</span>
            </label>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600
                              text-xs px-3.5 py-2.5 rounded-xl">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" clipRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full py-3 mt-2 rounded-xl text-sm font-semibold text-white
                         bg-gradient-to-r from-indigo-600 to-violet-600
                         hover:from-indigo-500 hover:to-violet-500
                         disabled:from-indigo-400 disabled:to-violet-400
                         shadow-lg shadow-indigo-200 hover:shadow-indigo-300
                         hover:-translate-y-px active:translate-y-0
                         transition-all duration-150"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting…
                </span>
              ) : 'Connect to Router'}
            </button>
          </form>

          {/* Slogan */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200" />
            <p className="text-xs font-semibold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 whitespace-nowrap">
              Manage your hotspot, your way.
            </p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200" />
          </div>

          {/* Privacy links */}
          <p className="text-center text-xs text-slate-400 mt-4">
            <button type="button" onClick={() => setShowPrivacy(true)}
              className="underline underline-offset-2 hover:text-indigo-500 transition-colors">
              Privacy Statement
            </button>
            <span className="mx-1.5">·</span>
            <button type="button" onClick={() => setShowCookies(true)}
              className="underline underline-offset-2 hover:text-indigo-500 transition-colors">
              Cookie Policy
            </button>
          </p>

        </div>

      {/* Copyright — fixed to bottom of screen */}
      </div>

      {/* Privacy Statement modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
                Privacy Statement
              </h3>
              <button onClick={() => setShowPrivacy(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
                           hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M10 1a9 9 0 100 18A9 9 0 0010 1zm3.707 7.293a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">Your credentials are never stored</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Your MikroTik IP address, username, and password are kept only in your browser&apos;s session memory and communicated directly to your router. They are never transmitted to, or saved in, any external server or database.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">Open source &amp; transparent</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This is a free, open-source MikroTik hotspot manager. The full source code is available for anyone to inspect, verify, modify, and self-host. There is no proprietary lock-in and no hidden data collection.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5">
              <button onClick={() => setShowPrivacy(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white
                           text-sm font-semibold transition-colors">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Policy modal */}
      {showCookies && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
                Cookie Policy
              </h3>
              <button onClick={() => setShowCookies(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
                           hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V7h2v2z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">No tracking cookies</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This app does not use any cookies. No analytics, no advertising trackers, no third-party scripts that collect your data.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">Session storage only</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The only browser storage used is <code className="bg-slate-100 px-1 rounded">sessionStorage</code> — to remember your login credentials within your current tab. This is cleared automatically when you close the tab or click Logout. Nothing is written to <code className="bg-slate-100 px-1 rounded">localStorage</code> except your hotspot display settings (name, currency).
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5">
              <button onClick={() => setShowCookies(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white
                           text-sm font-semibold transition-colors">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
