'use client'

import { useState, useEffect } from 'react'
import type { MikrotikCreds, ActiveUser } from '@/types'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function ActivePage() {
  const [creds, setCreds]         = useState<MikrotikCreds | null>(null)
  const [users, setUsers]         = useState<ActiveUser[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError]         = useState('')
  const [lastTs, setLastTs]       = useState<Date | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<ActiveUser | null>(null)
  const [removing, setRemoving]   = useState<Set<string>>(new Set())
  const [removeError, setRemoveError] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('mkCreds')
    if (stored) setCreds(JSON.parse(stored))
  }, [])

  useEffect(() => {
    if (!creds) return
    let cancelled = false
    const controller = new AbortController()

    async function startStream() {
      setConnected(false)
      setError('')
      try {
        const res = await fetch('/api/hotspot/active-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds),
          signal: controller.signal,
        })
        if (!res.body) { setError('No stream from server'); return }
        setConnected(true)

        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = JSON.parse(line.slice(6))
            if (data.users !== undefined) { setUsers(data.users); setLastTs(new Date()) }
            if (data.error)               setError(data.error)
          }
        }
      } catch {
        if (!cancelled) { setError('Stream disconnected'); setConnected(false) }
      }
    }

    startStream()
    return () => { cancelled = true; controller.abort() }
  }, [creds])

  async function removeSession(sessionId: string) {
    if (!creds) return
    setRemoving((prev) => new Set(prev).add(sessionId))
    setRemoveError('')
    setUsers((prev) => prev.filter((u) => u.id !== sessionId))

    try {
      const res = await fetch('/api/hotspot/active-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...creds, action: 'remove', sessionId }),
      })
      const data = await res.json()
      if (!res.ok) setRemoveError(data.error || 'Remove failed')
    } catch {
      setRemoveError('Network error — try again')
    } finally {
      setRemoving((prev) => { const s = new Set(prev); s.delete(sessionId); return s })
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
            Live Active Sessions
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time view — updates every 2 seconds
          </p>
        </div>

        <div className="flex items-center gap-3">
          {users.length > 0 && (
            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full tabular-nums">
              {users.length.toLocaleString()} online
            </span>
          )}

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <span className="relative flex h-2 w-2">
              {connected
                ? <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                : <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              }
            </span>
            {connected ? 'Connected' : 'Connecting…'}
          </div>

          {lastTs && (
            <span className="text-xs text-slate-400">
              Updated {lastTs.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Error banners */}
      {(error || removeError) && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600
                        text-sm px-4 py-3 rounded-xl mb-5">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
          </svg>
          {error || removeError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {!connected && users.length === 0 ? (
          <ActiveSkeleton />
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-500">No active sessions</p>
            <p className="text-xs mt-1">Sessions will appear here automatically</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">IP Address</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">MAC Address</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Uptime</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Time Left</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Data In</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Data Out</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Server</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={`${u.id}-${u.user}`}
                    className={`border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-400 tabular-nums text-xs">{i + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-indigo-700 tracking-wider text-xs"
                            style={{ fontFamily: 'var(--font-mono)' }}>
                        {u.user}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 tabular-nums text-xs"
                        style={{ fontFamily: 'var(--font-mono)' }}>
                      {u.address}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs hidden md:table-cell"
                        style={{ fontFamily: 'var(--font-mono)' }}>
                      {u.macAddress}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium tabular-nums text-xs">{u.uptime}</td>
                    <td className="py-3 px-4 tabular-nums text-xs hidden sm:table-cell">
                      {u.sessionTimeLeft
                        ? <span className="text-slate-600">{u.sessionTimeLeft}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-500 tabular-nums text-xs hidden lg:table-cell">
                      {formatBytes(u.bytesIn)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 tabular-nums text-xs hidden lg:table-cell">
                      {formatBytes(u.bytesOut)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs hidden xl:table-cell">{u.server}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setConfirmRemove(u)}
                        disabled={removing.has(u.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-100
                                   text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                      >
                        {removing.has(u.id) ? '…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remove confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-slate-100">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Remove Session?
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              This will disconnect{' '}
              <span className="font-bold text-indigo-700" style={{ fontFamily: 'var(--font-mono)' }}>
                {confirmRemove.user}
              </span>{' '}
              ({confirmRemove.address}) from the hotspot immediately.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-medium
                           text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { removeSession(confirmRemove.id); setConfirmRemove(null) }}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm
                           font-semibold transition-colors shadow-sm shadow-red-200"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

const ACTIVE_COL_WIDTHS = ['w-6','w-20','w-24','w-28','w-16','w-14','w-16','w-16','w-12','w-10']

function ActiveSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {ACTIVE_COL_WIDTHS.map((w, i) => (
              <th key={i} className="py-3 px-4">
                <div className={`h-2.5 ${w} bg-slate-200 rounded animate-pulse`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              {ACTIVE_COL_WIDTHS.map((w, j) => (
                <td key={j} className="py-3 px-4">
                  <div className={`h-2.5 ${w} bg-slate-100 rounded animate-pulse`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
