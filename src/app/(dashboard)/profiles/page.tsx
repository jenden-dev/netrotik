'use client'

import { useState, useEffect } from 'react'
import type { MikrotikCreds } from '@/types'

interface HotspotProfile {
  id: string
  name: string
  rateLimit: string
  sessionTimeout: string
  idleTimeout: string
  sharedUsers: string
  addressPool: string
}

const EMPTY_FORM = { name: '', rateLimit: '', sessionTimeout: '', idleTimeout: '', sharedUsers: '1', addressPool: '' }

export default function ProfilesPage() {
  const [creds, setCreds]         = useState<MikrotikCreds | null>(null)
  const [profiles, setProfiles]   = useState<HotspotProfile[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [actionError, setActionError] = useState('')
  const [actioning, setActioning] = useState<Set<string>>(new Set())

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<HotspotProfile | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<HotspotProfile | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('mkCreds')
    if (stored) setCreds(JSON.parse(stored))
  }, [])

  useEffect(() => {
    if (!creds) return
    fetchProfiles()
  }, [creds])

  async function fetchProfiles() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/hotspot/profile-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to load profiles'); return }
      setProfiles(data.profiles)
    } catch {
      setError('Network error — could not load profiles')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(profile: HotspotProfile) {
    setEditTarget(profile)
    setForm({
      name:           profile.name,
      rateLimit:      profile.rateLimit,
      sessionTimeout: profile.sessionTimeout,
      idleTimeout:    profile.idleTimeout,
      sharedUsers:    profile.sharedUsers,
      addressPool:    profile.addressPool,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!creds || !form.name.trim()) return
    setSaving(true)
    setActionError('')
    try {
      const res = await fetch('/api/hotspot/profile-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...creds,
          action:         editTarget ? 'edit' : 'add',
          profileId:      editTarget?.id,
          name:           form.name.trim(),
          rateLimit:      form.rateLimit.trim()      || undefined,
          sessionTimeout: form.sessionTimeout.trim() || undefined,
          idleTimeout:    form.idleTimeout.trim()    || undefined,
          sharedUsers:    form.sharedUsers           || undefined,
          addressPool:    form.addressPool.trim()    || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setActionError(data.error || 'Save failed'); return }
      setShowModal(false)
      fetchProfiles()
    } catch {
      setActionError('Network error — try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(profile: HotspotProfile) {
    if (!creds) return
    setActioning((prev) => new Set(prev).add(profile.id))
    setActionError('')
    setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
    try {
      const res = await fetch('/api/hotspot/profile-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...creds, action: 'remove', profileId: profile.id }),
      })
      const data = await res.json()
      if (!res.ok) { setActionError(data.error || 'Delete failed'); fetchProfiles() }
    } catch {
      setActionError('Network error — try again')
      fetchProfiles()
    } finally {
      setActioning((prev) => { const s = new Set(prev); s.delete(profile.id); return s })
    }
  }

  const inputCls = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-600 transition'
  const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50" style={{ fontFamily: 'var(--font-heading)' }}>
            Hotspot Profiles
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage user profiles — rate limits, timeouts, and quotas</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600
                     hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold
                     rounded-xl shadow-md shadow-indigo-200 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Profile
        </button>
      </div>

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
        {loading ? (
          <ProfilesSkeleton />
        ) : profiles.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No profiles found</p>
            <p className="text-xs mt-1">Click &ldquo;Add Profile&rdquo; to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-10">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Rate Limit</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Session Timeout</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Idle Timeout</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden lg:table-cell">Shared Users</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden lg:table-cell">Address Pool</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, i) => (
                  <tr key={p.id}
                    className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/60'}`}>
                    <td className="py-3 px-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 tabular-nums text-xs">{i + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-indigo-700 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                        {p.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden sm:table-cell font-mono">
                      {p.rateLimit || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden md:table-cell tabular-nums">
                      {p.sessionTimeout || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden md:table-cell tabular-nums">
                      {p.idleTimeout || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden lg:table-cell tabular-nums">
                      {p.sharedUsers || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 hidden lg:table-cell">
                      {p.addressPool || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(p)}
                          disabled={actioning.has(p.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-200
                                     text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => setConfirmDelete(p)}
                          disabled={actioning.has(p.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-red-100
                                     text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-6 pt-5 pb-6 text-white relative">
              <button type="button" onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg
                           bg-white/15 hover:bg-white/30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                {editTarget ? 'Edit Profile' : 'Add Profile'}
              </h2>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {actionError && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 px-3 py-2 rounded-xl">
                  {actionError}
                </div>
              )}

              <div>
                <label className={labelCls}>Profile Name</label>
                <input type="text" placeholder="e.g. 1hour" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls} autoFocus />
              </div>

              <div>
                <label className={labelCls}>Rate Limit <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. 2M/5M or 512k/1M" value={form.rateLimit}
                  onChange={(e) => setForm((f) => ({ ...f, rateLimit: e.target.value }))}
                  className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">Format: upload/download (e.g. 1M/2M)</p>
              </div>

              <div>
                <label className={labelCls}>Session Timeout <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. 1h, 00:30:00" value={form.sessionTimeout}
                  onChange={(e) => setForm((f) => ({ ...f, sessionTimeout: e.target.value }))}
                  className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Idle Timeout <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. 5m, 00:05:00" value={form.idleTimeout}
                  onChange={(e) => setForm((f) => ({ ...f, idleTimeout: e.target.value }))}
                  className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Shared Users <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <input type="number" min={1} placeholder="1" value={form.sharedUsers}
                  onChange={(e) => setForm((f) => ({ ...f, sharedUsers: e.target.value }))}
                  className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">Max devices that can share this login simultaneously</p>
              </div>

              <div>
                <label className={labelCls}>Address Pool <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. hs-pool-3" value={form.addressPool}
                  onChange={(e) => setForm((f) => ({ ...f, addressPool: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>

            <div className="px-6 pb-5 pt-2 flex gap-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50
                           text-sm font-semibold rounded-xl transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600
                           hover:from-indigo-500 hover:to-violet-500 disabled:from-indigo-300 disabled:to-violet-300
                           text-white text-sm font-semibold rounded-xl transition-all">
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
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
              Delete Profile?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              This will permanently remove{' '}
              <span className="font-bold text-indigo-700" style={{ fontFamily: 'var(--font-mono)' }}>
                {confirmDelete.name}
              </span>{' '}
              from MikroTik. This cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-medium
                           text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => { handleDelete(confirmDelete); setConfirmDelete(null) }}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm
                           font-semibold transition-colors shadow-sm shadow-red-200">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

const COL_WIDTHS = ['w-6', 'w-24', 'w-20', 'w-20', 'w-20', 'w-14', 'w-16', 'w-16']

function ProfilesSkeleton() {
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
          {Array.from({ length: 5 }).map((_, i) => (
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
