'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { MikrotikCreds, HotspotUser } from '@/types'

const PAGE_SIZE = 100

export default function UsersPage() {
  const [creds, setCreds]         = useState<MikrotikCreds | null>(null)
  const [users, setUsers]         = useState<HotspotUser[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError]         = useState('')
  const [actionError, setActionError] = useState('')
  const [lastTs, setLastTs]       = useState<Date | null>(null)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [actioning, setActioning] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<HotspotUser | null>(null)

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
      setLoading(false)
      setError('')
      try {
        const res = await fetch('/api/hotspot/users-stream', {
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
            if (data.loading !== undefined) setLoading(data.loading)
            if (data.users !== undefined) { setUsers(data.users); setLastTs(new Date()) }
            if (data.error) { setError(data.error); setLoading(false) }
          }
        }
      } catch {
        if (!cancelled) { setError('Stream disconnected'); setConnected(false); setLoading(false) }
      }
    }

    startStream()
    return () => { cancelled = true; controller.abort() }
  }, [creds, refreshKey])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.profile.toLowerCase().includes(q) ||
      u.comment.toLowerCase().includes(q)
    )
  }, [users, search])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged       = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const activeCount = users.filter((u) => !u.disabled).length

  useEffect(() => { setPage(1) }, [search])

  async function doAction(userId: string, action: 'remove' | 'disable' | 'enable') {
    if (!creds) return
    setActioning((prev) => new Set(prev).add(userId))
    setActionError('')

    // Optimistic update
    if (action === 'remove') {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } else {
      setUsers((prev) => prev.map((u) =>
        u.id === userId ? { ...u, disabled: action === 'disable' } : u
      ))
    }

    try {
      const res = await fetch('/api/hotspot/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...creds, action, userId }),
      })
      const data = await res.json()
      if (!res.ok) setActionError(data.error || 'Action failed')
    } catch {
      setActionError('Network error — try again')
    } finally {
      setActioning((prev) => { const s = new Set(prev); s.delete(userId); return s })
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50" style={{ fontFamily: 'var(--font-heading)' }}>
            Hotspot Users
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            All registered accounts — synced from MikroTik · auto-refreshes every 60 s
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {users.length > 0 && (
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full tabular-nums">
              {activeCount.toLocaleString()} active / {users.length.toLocaleString()} total
            </span>
          )}

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            connected
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400'
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
            {connected ? 'Live' : 'Connecting…'}
          </div>

          {lastTs && !loading && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Updated {lastTs.toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={() => { setUsers([]); setLastTs(null); setRefreshKey((k) => k + 1) }}
            disabled={loading}
            title="Reload users from MikroTik"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border
                       border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300
                       hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Loading progress bar */}
      {loading && (
        <div className="mb-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Loading users from MikroTik…
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Please wait</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-[progress_1.8s_ease-in-out_infinite]" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Large user databases may take up to a minute. The page will update automatically when ready.
          </p>
        </div>
      )}

      {/* Search */}
      {users.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search username, profile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          {search && (
            <button onClick={() => setSearch('')}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Errors */}
      {(error || actionError) && (
        <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400
                        text-sm px-4 py-3 rounded-xl mb-5">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
          </svg>
          {error || actionError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {!connected && users.length === 0 ? (
          <UsersSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {search ? 'No matching users' : 'No hotspot users found'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-10">#</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Username</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Profile</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Time Limit</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Uptime</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden lg:table-cell">Note</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-100 transition-colors
                        ${u.disabled ? 'opacity-50' : 'hover:bg-indigo-50/40'}
                        ${i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/60'}`}
                    >
                      <td className="py-2.5 px-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 tabular-nums text-xs">
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-indigo-700 tracking-wider text-xs"
                              style={{ fontFamily: 'var(--font-mono)' }}>
                          {u.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 hidden sm:table-cell">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                          {u.profile || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell tabular-nums">
                        {u.limitUptime || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell tabular-nums">
                        {u.uptime || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">
                        {u.comment || <span className="text-slate-200">—</span>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.disabled
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {!u.disabled && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                          {u.disabled ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => doAction(u.id, u.disabled ? 'enable' : 'disable')}
                            disabled={actioning.has(u.id)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200
                                       text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                          >
                            {actioning.has(u.id) ? '…' : u.disabled ? 'Enable' : 'Disable'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            disabled={actioning.has(u.id)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-100
                                       text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500">
                  Page {page.toLocaleString()} of {totalPages.toLocaleString()} · {filtered.length.toLocaleString()} users
                </span>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600
                               hover:bg-slate-50 disabled:opacity-40 transition-colors">
                    Prev
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600
                               hover:bg-slate-50 disabled:opacity-40 transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profiles link */}
      <div className="mt-4 flex justify-center">
        <Link href="/profiles"
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors group">
          <svg className="w-3.5 h-3.5 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Manage Hotspot Profiles
        </Link>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full border border-slate-100 dark:border-slate-700">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Delete User?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              This will permanently remove{' '}
              <span className="font-bold text-indigo-700" style={{ fontFamily: 'var(--font-mono)' }}>
                {confirmDelete.name}
              </span>{' '}
              from MikroTik. This cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-medium
                           text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { doAction(confirmDelete.id, 'remove'); setConfirmDelete(null) }}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm
                           font-semibold transition-colors shadow-sm shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

const COL_WIDTHS = ['w-6','w-24','w-20','w-16','w-14','w-16','w-14','w-10']

function UsersSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            {COL_WIDTHS.map((w, i) => (
              <th key={i} className="py-3 px-4">
                <div className={`h-2.5 ${w} bg-slate-200 dark:bg-slate-600 rounded animate-pulse`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/60'}`}>
              {COL_WIDTHS.map((w, j) => (
                <td key={j} className="py-3 px-4">
                  <div className={`h-2.5 ${w} bg-slate-100 dark:bg-slate-700 rounded animate-pulse`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
