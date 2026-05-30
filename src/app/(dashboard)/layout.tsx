'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { MikrotikCreds, AppConfig } from '@/types'
import SetupModal from '@/components/SetupModal'
import ErrorBoundary from '@/components/ErrorBoundary'

const DEFAULT_CONFIG: AppConfig = { hotspotName: '', currency: '₱' }

const NAV_ITEMS = [
  { href: '/hotspot',  label: 'Generate',    live: false },
  { href: '/users',    label: 'Users',        live: false },
  { href: '/profiles', label: 'Profiles',     live: false },
  { href: '/active',   label: 'Live Session', live: true  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [creds] = useState<MikrotikCreds | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem('mkCreds')
    return stored ? JSON.parse(stored) : null
  })

  const [config, setConfig]           = useState<AppConfig>(DEFAULT_CONFIG)
  const [showSettings, setShowSettings] = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [darkMode, setDarkMode]       = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('mkConfig')
    if (saved) setConfig(JSON.parse(saved))
    setDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    if (!creds) router.push('/')
  }, [creds, router])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('mkTheme', next ? 'dark' : 'light')
  }

  function handleSaveConfig(newConfig: AppConfig) {
    setConfig(newConfig)
    localStorage.setItem('mkConfig', JSON.stringify(newConfig))
    sessionStorage.setItem('mkSetupDone', '1')
    window.dispatchEvent(new CustomEvent('mkConfigUpdate', { detail: newConfig }))
    setShowSettings(false)
  }

  function handleLogout() {
    sessionStorage.removeItem('mkCreds')
    sessionStorage.removeItem('mkSetupDone')
    router.push('/')
  }

  const moonIcon = (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
  const sunIcon = (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-600 to-violet-700
                         dark:from-indigo-900 dark:to-slate-900 shadow-lg shadow-indigo-900/20
                         dark:border-b dark:border-slate-700/60">

        {/* Top bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center ring-1 ring-white/25">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="12" height="10" rx="2" stroke="#ffffff" strokeWidth={2}/>
                <line x1="6" y1="11" x2="12" y2="11" stroke="#ffffff" strokeWidth={1.8}/>
                <line x1="6" y1="14" x2="9" y2="14" stroke="#ffffff" strokeWidth={1.8}/>
                <path d="M7 8 L5 3 M10 8 L9 2" stroke="#ffffff" strokeWidth={2}/>
                <path d="M13 5 Q16 2 19 5" stroke="#a5b4fc" strokeWidth={1.5} opacity={0.9}/>
                <path d="M14 3 Q16 1 18 3" stroke="#a5b4fc" strokeWidth={1.2} opacity={0.6}/>
                <path d="M21 20 L24 17 M20 18 L23 15" stroke="#ffffff" strokeWidth={1.8}/>
                <circle cx="22" cy="18" r="1.5" fill="#ffffff"/>
                <circle cx="22" cy="18" r="3" stroke="#6ee7b7" strokeWidth={1} opacity={0.6}/>
              </svg>
            </div>
            <p className="text-sm font-bold text-white leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
              NETROTIK
            </p>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, live }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${active ? 'bg-white/20 text-white ring-1 ring-white/25' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}>
                  {live && (
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                  )}
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <button onClick={toggleDark} title={darkMode ? 'Light mode' : 'Dark mode'}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-100
                         hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors">
              {darkMode ? sunIcon : moonIcon}
              <span className="hidden lg:inline">{darkMode ? 'Light' : 'Dark'}</span>
            </button>
            <button onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-100
                         hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-100
                         hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/15
                       hover:bg-white/25 text-white transition-colors shrink-0"
            aria-label="Toggle menu">
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/15 bg-indigo-700/95 dark:bg-slate-900/98 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
              {NAV_ITEMS.map(({ href, label, live }) => {
                const active = pathname === href
                return (
                  <Link key={href} href={href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                      ${active ? 'bg-white/20 text-white ring-1 ring-white/25' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}>
                    {live && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                      </span>
                    )}
                    {label}
                  </Link>
                )
              })}

              <div className="border-t border-white/15 pt-2 mt-2 space-y-1">
                <button onClick={toggleDark}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                             text-indigo-100 hover:bg-white/10 hover:text-white transition-all text-left">
                  {darkMode ? sunIcon : moonIcon}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button onClick={() => { setShowSettings(true); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                             text-indigo-100 hover:bg-white/10 hover:text-white transition-all text-left">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                             text-indigo-100 hover:bg-red-500/20 hover:text-red-200 transition-all text-left">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {showSettings && (
        <SetupModal initial={config} onSave={handleSaveConfig} onCancel={() => setShowSettings(false)} />
      )}

      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  )
}
