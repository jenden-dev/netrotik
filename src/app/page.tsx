'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import ReCAPTCHA from 'react-google-recaptcha'
import type { MikrotikCreds } from '@/types'

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''

export default function LoginPage() {
  const router = useRouter()
  const [creds, setCreds] = useState<MikrotikCreds>({
    host: '',
    port: 8728,
    username: 'admin',
    password: '',
  })
  const [rememberMe, setRememberMe]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [showPrivacy, setShowPrivacy]   = useState(false)
  const [showCookies, setShowCookies]   = useState(false)
  const [showTerms, setShowTerms]       = useState(false)
  const [error, setError]               = useState('')
  const [showCaptcha, setShowCaptcha]   = useState(false)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  // Pre-fill form from saved credentials
  useEffect(() => {
    const saved = localStorage.getItem('mkSavedCreds')
    if (saved) {
      setCreds(JSON.parse(saved))
      setRememberMe(true)
    }
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setShowCaptcha(true)
  }

  async function handleCaptchaVerify(token: string | null) {
    if (!token) return
    setShowCaptcha(false)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      const stored = { ...creds, host: data.resolvedHost ?? creds.host, routerIdentity: data.routerIdentity ?? '' }
      sessionStorage.setItem('mkCreds', JSON.stringify(stored))
      sessionStorage.removeItem('mkSetupDone')
      if (rememberMe) {
        localStorage.setItem('mkSavedCreds', JSON.stringify(stored))
      } else {
        localStorage.removeItem('mkSavedCreds')
      }
      router.push('/hotspot')
    } catch {
      setError('Cannot connect — check network or router IP')
    } finally {
      setLoading(false)
      recaptchaRef.current?.reset()
    }
  }

  const teamSection = (
    <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Developer</p>
      <div className="flex items-center gap-3">
        <img src="https://cdn.mikrotik.com/web-assets/consultants/yepU8J7Mkf.jpeg"
          alt="Jenden Julkamri"
          className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-100 dark:ring-indigo-900/40 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Mr. Jenden Julkamri</p>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {['MTCNA','MTCRE','MTCUME'].map((c) => (
              <span key={c} className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">{c}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 pt-1">Consultants</p>
      {[
        {
          name: 'Engr. Roy Lopez Pamitalan',
          certs: ['MTCNA','MTCRE','MTCWE','MTCTCE','MTCUME','MTCINE','MTCEWE'],
          img: 'https://cdn.mikrotik.com/web-assets/consultants/I1QCM07r41.png',
        },
        {
          name: 'Prof. Mudzramer Hayudini, DIT (CAR)',
          certs: ['MTCNA','MTCRE','MTCWE','MTCTCE','MTCUME','MTCINE'],
          img: 'https://cdn.mikrotik.com/web-assets/consultants/RpdNGhRuwP.jpg',
        },
      ].map(({ name, certs, img }) => (
        <div key={name} className="flex items-center gap-3">
          <img src={img} alt={name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-100 dark:ring-violet-900/40 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{name}</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {certs.map((c) => (
                <span key={c} className="text-[9px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
          </div>
        </div>
      ))}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
        For more info visit{' '}
        <a href="https://mikrotik.com/consultants?category=consultants&region=Philippines"
          target="_blank" rel="noopener noreferrer"
          className="text-indigo-500 hover:text-indigo-600 underline underline-offset-2 transition-colors">
          MikroTik Certified Consultants — Philippines
        </a>
      </p>
    </div>
  )

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
            <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none"
                 strokeLinecap="round" strokeLinejoin="round">
              {/* Router box */}
              <rect x="3" y="8" width="12" height="10" rx="2" stroke="#ffffff" strokeWidth={2}/>
              <line x1="6" y1="11" x2="12" y2="11" stroke="#ffffff" strokeWidth={1.8}/>
              <line x1="6" y1="14" x2="9" y2="14" stroke="#ffffff" strokeWidth={1.8}/>
              {/* Antennas */}
              <path d="M7 8 L5 3 M10 8 L9 2" stroke="#ffffff" strokeWidth={2}/>
              {/* WiFi arcs */}
              <path d="M13 5 Q16 2 19 5" stroke="#a5b4fc" strokeWidth={1.5} opacity={0.9}/>
              <path d="M14 3 Q16 1 18 3" stroke="#a5b4fc" strokeWidth={1.2} opacity={0.6}/>
              {/* Touch lines */}
              <path d="M21 20 L24 17 M20 18 L23 15" stroke="#ffffff" strokeWidth={1.8}/>
              {/* Touch point */}
              <circle cx="22" cy="18" r="1.5" fill="#ffffff"/>
              <circle cx="22" cy="18" r="3" stroke="#6ee7b7" strokeWidth={1} opacity={0.6}/>
            </svg>
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}>
            NETROTIK
          </h1>
          <p className="text-indigo-200 text-sm leading-relaxed mb-4">
            MikroTik Hotspot Voucher Manager · Generate, Print &amp; Monitor · netrotik.net
          </p>

          {/* MikroTik badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 mb-8">
            <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-[#CC0000] flex-shrink-0">
              <span className="text-white font-black text-[10px] leading-none">M</span>
            </span>
            <span className="text-white text-xs font-semibold tracking-wide">MikroTik RouterOS</span>
          </div>

          <ul className="space-y-3 hidden lg:block">
            {[
              'Generate up to 3,000 vouchers in one batch with real-time progress',
              'Print Classic or QR Code cards — 5 or 6 per row on A4, Short, and Folio paper',
              'Monitor live active sessions in real-time with instant disconnect control',
              'Manage hotspot users — enable, disable, or delete directly from the router',
              'Full hotspot profile management — rate limits, timeouts, and shared user quotas',
              'Dark mode, responsive design, and works entirely on your local network',
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
      <div className="flex items-center justify-center px-6 py-12 bg-slate-50 dark:bg-slate-900 lg:w-[480px]">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1"
                style={{ fontFamily: 'var(--font-heading)' }}>
              Connect to Router
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Enter your MikroTik RouterOS API credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Host */}
            <div>
              <label htmlFor="host" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
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
                  placeholder="IP address or hostname"
                  value={creds.host}
                  onChange={(e) => setCreds({ ...creds, host: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm
                             text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Port */}
            <div>
              <label htmlFor="port" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm
                             text-slate-900 dark:text-slate-100 shadow-sm
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
              <label htmlFor="username" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm
                             text-slate-900 dark:text-slate-100 shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm
                             text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm
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
                <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700
                                peer-checked:bg-indigo-600 peer-checked:border-indigo-600
                                transition-colors flex items-center justify-center">
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Remember Me</span>
            </label>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400
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
          <p className="text-center text-sm text-slate-400 mt-[4.5rem]">
            <button type="button" onClick={() => setShowTerms(true)}
              className="hover:text-indigo-500 transition-colors">
              Terms &amp; Conditions
            </button>
            <span className="mx-1.5">·</span>
            <button type="button" onClick={() => setShowPrivacy(true)}
              className="hover:text-indigo-500 transition-colors">
              Privacy Statement
            </button>
            <span className="mx-1.5">·</span>
            <button type="button" onClick={() => setShowCookies(true)}
              className="hover:text-indigo-500 transition-colors">
              Cookie Policy
            </button>
          </p>

        </div>

      {/* Copyright — fixed to bottom of screen */}
      </div>

      {/* Terms & Conditions modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50" style={{ fontFamily: 'var(--font-heading)' }}>
                Terms &amp; Conditions
              </h3>
              <button onClick={() => setShowTerms(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
                           hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {[
                {
                  color: 'indigo',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
                  ),
                  title: 'Acceptance of Terms',
                  body: 'By accessing and using NETROTIK, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use of the application immediately.',
                },
                {
                  color: 'violet',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
                  ),
                  title: 'Authorized Use Only',
                  body: 'NETROTIK is intended solely for use by authorized administrators of MikroTik RouterOS hotspot systems. You must have explicit permission to manage the router and hotspot network you connect to. Unauthorized access to any network or device is strictly prohibited.',
                },
                {
                  color: 'amber',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
                  ),
                  title: 'No Warranty',
                  body: 'NETROTIK is provided "as is" without warranty of any kind, express or implied. We do not guarantee uninterrupted or error-free operation. Use of this application is at your own risk. We are not liable for any loss of data, revenue, or damages arising from use of this software.',
                },
                {
                  color: 'emerald',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  ),
                  title: 'User Responsibilities',
                  body: 'You are solely responsible for all actions performed through NETROTIK, including voucher generation, user management, and any configuration changes made to your MikroTik router. Ensure compliance with all applicable local laws and regulations when operating a public hotspot.',
                },
                {
                  color: 'red',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  ),
                  title: 'Security & Liability Disclaimer',
                  body: 'Please be advised that we shall not be held liable for any security breaches, unauthorized access, or configuration damage that may occur. The system does not install or maintain any hidden configurations on your terminal. For security and auditing purposes, users are advised to regularly check the RouterOS logs and monitor all configuration changes.',
                },
                {
                  color: 'sky',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
                  ),
                  title: 'Changes to Terms',
                  body: 'We reserve the right to update these Terms and Conditions at any time. Continued use of NETROTIK after changes are posted constitutes your acceptance of the revised terms. We encourage you to review these terms periodically.',
                },
              ].map(({ color, icon, title, body }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className={`w-8 h-8 rounded-full bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center shrink-0`}>
                    <svg className={`w-4 h-4 text-${color}-500`} fill="currentColor" viewBox="0 0 20 20">{icon}</svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">{title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-700">
                Last updated: June 2025 · For questions, contact the system administrator or the NETROTIK developer.
              </p>
              {teamSection}
            </div>
            <div className="px-6 pb-5 pt-2">
              <button onClick={() => setShowTerms(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                           text-white text-sm font-semibold transition-all">
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Statement modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50" style={{ fontFamily: 'var(--font-heading)' }}>
                Privacy Statement
              </h3>
              <button onClick={() => setShowPrivacy(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
                           hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {[
                {
                  color: 'emerald',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
                  ),
                  title: 'Router credentials stay on your device',
                  body: 'Your MikroTik IP address, username, and password are stored only in your browser\'s sessionStorage — never sent to any external server. They are erased automatically when you close the tab or click Logout.',
                },
                {
                  color: 'indigo',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" />
                  ),
                  title: 'Voucher data stays in your browser',
                  body: 'Generated voucher batches are saved in your browser\'s localStorage with a 24-hour expiry. Nothing is uploaded to any cloud service or third-party system. Clearing your browser data removes them permanently.',
                },
                {
                  color: 'violet',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  ),
                  title: 'No data collection, no tracking',
                  body: 'NETROTIK does not collect, transmit, or store any personal information on any server. There are no analytics scripts, no advertising trackers, and no third-party services that can observe your usage.',
                },
                {
                  color: 'amber',
                  icon: (
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" />
                  ),
                  title: 'Open-source & self-hostable',
                  body: 'The full source code is publicly available for anyone to inspect, audit, modify, and self-host. There is no proprietary lock-in. You are always in full control of how and where this app runs.',
                },
              ].map(({ color, icon, title, body }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className={`w-8 h-8 rounded-full bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center shrink-0`}>
                    <svg className={`w-4 h-4 text-${color}-500`} fill="currentColor" viewBox="0 0 20 20">{icon}</svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">{title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
              {teamSection}
            </div>
            <div className="px-6 pb-5 pt-2">
              <button onClick={() => setShowPrivacy(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                           text-white text-sm font-semibold transition-all">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Policy modal */}
      {showCookies && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50" style={{ fontFamily: 'var(--font-heading)' }}>
                Cookie Policy
              </h3>
              <button onClick={() => setShowCookies(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
                           hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* No cookies banner */}
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" clipRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  This app uses zero cookies — no tracking, no advertising, no analytics.
                </p>
              </div>

              {/* Storage table */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Browser storage used</p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {[
                    {
                      type: 'sessionStorage',
                      key: 'mkCreds',
                      what: 'Router credentials (host, port, username, password)',
                      when: 'Cleared on tab close or Logout',
                    },
                    {
                      type: 'localStorage',
                      key: 'mkConfig',
                      what: 'Hotspot name and currency symbol',
                      when: 'Kept until manually changed',
                    },
                    {
                      type: 'localStorage',
                      key: 'mkBatches',
                      what: 'Generated voucher batches (codes only)',
                      when: 'Auto-cleared after 24 hours',
                    },
                    {
                      type: 'localStorage',
                      key: 'mkSavedCreds',
                      what: 'Saved login credentials (Remember Me only)',
                      when: 'Until you uncheck Remember Me',
                    },
                    {
                      type: 'localStorage',
                      key: 'mkTheme',
                      what: 'Dark / light mode preference',
                      when: 'Kept until toggled',
                    },
                  ].map((row, i, arr) => (
                    <div key={row.key} className={`px-4 py-3 ${i < arr.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/50' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                          {row.type}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">{row.key}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.what}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{row.when}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                You can clear all stored data at any time by opening your browser&apos;s Developer Tools → Application → Storage → Clear Site Data.
              </p>
              {teamSection}
            </div>
            <div className="px-6 pb-5 pt-2">
              <button onClick={() => setShowCookies(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                           text-white text-sm font-semibold transition-all">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connecting progress overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 w-full max-w-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-[#CC0000]">
                <span className="text-white font-black text-xs leading-none">M</span>
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: 'var(--font-heading)' }}>
                NETROTIK
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Connecting to router…</p>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-[progress_1.8s_ease-in-out_infinite]" />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Please wait</p>
          </div>
        </div>
      )}

      {/* reCAPTCHA modal */}
      {showCaptcha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 w-full max-w-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-[#CC0000]">
                <span className="text-white font-black text-xs leading-none">M</span>
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: 'var(--font-heading)' }}>
                NETROTIK
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Please verify you&apos;re human before connecting.</p>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={SITE_KEY}
              onChange={handleCaptchaVerify}
            />
            <button
              type="button"
              onClick={() => { setShowCaptcha(false); recaptchaRef.current?.reset() }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
