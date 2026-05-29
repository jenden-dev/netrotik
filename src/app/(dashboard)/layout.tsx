'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { MikrotikCreds } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  // Read synchronously so header renders with data on first paint
  const [creds] = useState<MikrotikCreds | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem('mkCreds')
    return stored ? JSON.parse(stored) : null
  })

  useEffect(() => {
    if (!creds) router.push('/')
  }, [creds, router])

  function handleLogout() {
    sessionStorage.removeItem('mkCreds')
    sessionStorage.removeItem('mkSetupDone')
    router.push('/')
  }

  const navLink = (href: string, label: string, live = false) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
          ${active
            ? 'bg-white/20 text-white ring-1 ring-white/25'
            : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}
      >
        {live && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
        )}
        {label}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-600 to-violet-700 shadow-lg shadow-indigo-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center ring-1 ring-white/25">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-bold text-white leading-none truncate"
                 style={{ fontFamily: 'var(--font-heading)' }}>
                NETROTIK
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navLink('/hotspot', 'Generate')}
            {navLink('/users', 'Users')}
            {navLink('/active', 'Live Active', true)}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-100
                       hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {children}
    </div>
  )
}
