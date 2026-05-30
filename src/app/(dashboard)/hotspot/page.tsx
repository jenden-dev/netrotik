'use client'

import { useState, useEffect, FormEvent } from 'react'
import type { MikrotikCreds, Voucher, Batch, AppConfig } from '@/types'
import { parseTimeLimit } from '@/lib/timeLimit'
import VoucherPrintCard from '@/components/VoucherPrintCard'
import SetupModal from '@/components/SetupModal'
import PrintOptionsModal, { type PrintOptions } from '@/components/PrintOptionsModal'

const DEFAULT_CONFIG: AppConfig = { hotspotName: '', currency: '₱' }
const PAGE_SIZE = 100

type Tab = 'all' | 'batches'

export default function DashboardPage() {
  const [creds, setCreds]           = useState<MikrotikCreds | null>(null)
  const [config, setConfig]         = useState<AppConfig | null>(null)
  const [modalInitial, setModalInitial] = useState<AppConfig>(DEFAULT_CONFIG)

  const [profiles, setProfiles]           = useState<string[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError]   = useState('')

  const [form, setForm] = useState({
    quantity: 1, profile: '', timeLimitInput: '1h', amount: '',
    advancedForm: false,
    server: '', nameLength: 8, characters: 'alphanumeric', customChars: '',
    dataLimit: '', dataUnit: 'MB', comment: '',
  })

  const [showAdvancedModal, setShowAdvancedModal] = useState(false)
  const [servers, setServers]           = useState<string[]>([])
  const [serversLoading, setServersLoading] = useState(false)

  const [generating, setGenerating]     = useState(false)
  const [progress, setProgress]         = useState<{ current: number; total: number } | null>(null)
  const [generateError, setGenerateError] = useState('')

  const [batches, setBatches] = useState<Batch[]>([])
  const [activeTab, setActiveTab]           = useState<Tab>('all')
  const [search, setSearch]                 = useState('')
  const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set())

  const [allPage, setAllPage]       = useState(1)
  const [batchPages, setBatchPages] = useState<Record<string, number>>({})

  const [batchesLoaded, setBatchesLoaded] = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState<Batch | null>(null)
  const [deletingBatch, setDeletingBatch]           = useState(false)
  const [deleteError, setDeleteError]               = useState('')

  const [pendingPrintBatch, setPendingPrintBatch] = useState<Batch | null>(null)
  const [printingBatch, setPrintingBatch]         = useState<Batch | null>(null)
  const [printOptions, setPrintOptions]           = useState<PrintOptions | null>(null)

  // ── Derived ──────────────────────────────────────────────
  const allVouchers: Voucher[] = batches.flatMap((b) => b.vouchers)
  const filteredVouchers = search.trim()
    ? allVouchers.filter((v) => v.code.toLowerCase().includes(search.toLowerCase().trim()))
    : allVouchers
  const totalAllPages   = Math.max(1, Math.ceil(filteredVouchers.length / PAGE_SIZE))
  const pagedAllVouchers = filteredVouchers.slice((allPage - 1) * PAGE_SIZE, allPage * PAGE_SIZE)
  const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0
  const timeParsed  = parseTimeLimit(form.timeLimitInput)
  const timeValid   = timeParsed !== null

  useEffect(() => { setAllPage(1) }, [search])

  // Persist batches — only after they have been loaded from localStorage
  useEffect(() => {
    if (!batchesLoaded) return
    try {
      localStorage.setItem('mkBatches', JSON.stringify({ batches, savedAt: Date.now() }))
    } catch { /* storage full */ }
  }, [batches, batchesLoaded])

  // Print vouchers using @media print — no popup required
  useEffect(() => {
    if (!printingBatch || !printOptions) return
    const sizeMap: Record<string, string> = { a4: 'A4', short: 'letter', folio: '8.5in 13in' }
    const paperSize = sizeMap[printOptions.paper]

    const styleId = 'print-page-style'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = `@page { size: ${paperSize}; margin: 0; }`

    const t = setTimeout(() => {
      window.print()
      const cleanup = () => {
        setPrintingBatch(null)
        setPrintOptions(null)
        styleEl?.remove()
      }
      window.addEventListener('afterprint', cleanup, { once: true })
    }, 300)

    return () => clearTimeout(t)
  }, [printingBatch, printOptions])

  // Sync config when changed from the navbar settings modal
  useEffect(() => {
    function onConfigUpdate(e: Event) {
      const newConfig = (e as CustomEvent<AppConfig>).detail
      setConfig(newConfig)
      setModalInitial(newConfig)
    }
    window.addEventListener('mkConfigUpdate', onConfigUpdate)
    return () => window.removeEventListener('mkConfigUpdate', onConfigUpdate)
  }, [])

  // Mount: load credentials, config, profiles, persisted batches
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mkBatches')
      if (saved) {
        const parsed = JSON.parse(saved)
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
        if (parsed.savedAt && Date.now() - parsed.savedAt < TWENTY_FOUR_HOURS) {
          setBatches(parsed.batches ?? [])
        } else {
          localStorage.removeItem('mkBatches')
        }
      }
    } catch {}
    setBatchesLoaded(true)

    const stored = sessionStorage.getItem('mkCreds')
    if (!stored) return
    const parsed: MikrotikCreds = JSON.parse(stored)
    setCreds(parsed)
    const savedConfig = localStorage.getItem('mkConfig')
    const lastConfig: AppConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG
    setModalInitial(lastConfig)
    if (sessionStorage.getItem('mkSetupDone')) setConfig(lastConfig)
    fetch('/api/hotspot/profiles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setProfilesError(data.error)
        else {
          setProfiles(data.profiles)
          if (data.profiles.length > 0) setForm((f) => ({ ...f, profile: data.profiles[0] }))
        }
      })
      .catch(() => setProfilesError('Failed to load profiles'))
      .finally(() => setProfilesLoading(false))
  }, [])

  function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!creds || !timeParsed) return
    setShowConfirm(true)
  }

  async function doGenerate() {
    if (!creds || !timeParsed) return
    setShowConfirm(false)
    setGenerating(true); setGenerateError(''); setProgress({ current: 0, total: form.quantity })
    const dataLimitBytes = form.advancedForm && form.dataLimit
      ? parseInt(form.dataLimit) * (form.dataUnit === 'GB' ? 1024 ** 3 : 1024 ** 2)
      : undefined
    const payload = {
      ...creds,
      quantity: form.quantity, profile: form.profile,
      timeLimit: timeParsed.rosValue, timeLimitLabel: timeParsed.label, amount: form.amount,
      ...(form.advancedForm && {
        server:     form.server     || undefined,
        nameLength: form.nameLength,
        characters: form.characters,
        customChars: form.characters === 'custom' ? form.customChars : undefined,
        dataLimit:  dataLimitBytes,
        comment:    form.comment    || undefined,
      }),
    }
    try {
      const res = await fetch('/api/hotspot/generate-stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.body) { setGenerateError('No response from server'); return }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
      for (;;) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.progress !== undefined) setProgress({ current: data.progress, total: data.total })
          if (data.done) {
            setBatches((prev) => {
              const newId = Date.now().toString()
              setCollapsedBatches(new Set([...prev.map((b) => b.id), newId]))
              return [...prev, { id: newId, batchNumber: prev.length + 1, createdAt: data.createdAt, profile: form.profile, timeLimitLabel: timeParsed?.label ?? form.timeLimitInput, amount: form.amount, vouchers: data.vouchers }]
            })
            setActiveTab('batches')
            setForm((f) => ({ ...f, quantity: 1, amount: '', timeLimitInput: '1h', server: '', dataLimit: '', comment: '' }))
            setAllPage(1); setSearch('')
          }
          if (data.error) setGenerateError(data.error)
        }
      }
    } catch { setGenerateError('Network error — please try again') }
    finally { setGenerating(false); setProgress(null) }
  }

  function openAdvancedModal() {
    setShowAdvancedModal(true)
    if (!creds || servers.length > 0) return
    setServersLoading(true)
    fetch('/api/hotspot/servers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    })
      .then((r) => r.json())
      .then((data) => { if (data.servers) setServers(data.servers) })
      .catch(() => {})
      .finally(() => setServersLoading(false))
  }

  function toggleBatch(id: string) {
    setCollapsedBatches((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function getBatchPage(id: string) { return batchPages[id] ?? 1 }
  function setBatchPage(id: string, p: number) { setBatchPages((prev) => ({ ...prev, [id]: p })) }
  function handlePrintClick(batch: Batch) { setPendingPrintBatch(batch) }
  function handlePrintConfirm(opts: PrintOptions) {
    if (!pendingPrintBatch) return
    setPrintOptions(opts); setPrintingBatch(pendingPrintBatch); setPendingPrintBatch(null)
  }
  function handlePrintCancel() { setPendingPrintBatch(null) }

  function removeBatchLocally(batch: Batch) {
    setBatches((prev) => {
      const next = prev.filter((b) => b.id !== batch.id)
      try { localStorage.setItem('mkBatches', JSON.stringify({ batches: next, savedAt: Date.now() })) } catch {}
      return next
    })
  }

  async function deleteBatchFromMikrotik(batch: Batch) {
    if (!creds) return
    setDeletingBatch(true)
    setDeleteError('')
    try {
      const codes = batch.vouchers.map((v) => v.code)
      const res = await fetch('/api/hotspot/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...creds, codes }),
      })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error || 'Delete from MikroTik failed'); return }
      removeBatchLocally(batch)
      setConfirmDeleteBatch(null)
    } catch {
      setDeleteError('Network error — try again')
    } finally {
      setDeletingBatch(false)
    }
  }
  function handleSetupSave(newConfig: AppConfig) {
    setConfig(newConfig); localStorage.setItem('mkConfig', JSON.stringify(newConfig)); sessionStorage.setItem('mkSetupDone', '1')
  }

  // ── JSX ──────────────────────────────────────────────────
  return (
    <>
      {config === null && <SetupModal initial={modalInitial} onSave={handleSetupSave} />}

      {/* Delete batch confirmation modal */}
      {confirmDeleteBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-6 pt-5 pb-6 text-white relative">
              <button type="button" onClick={() => setConfirmDeleteBatch(null)}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg
                           bg-white/15 hover:bg-white/30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Delete Batch?</h2>
            </div>

            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Batch <span className="font-bold text-indigo-600 dark:text-indigo-400">#{confirmDeleteBatch.batchNumber}</span> contains{' '}
                <span className="font-bold text-slate-800 dark:text-slate-100">{confirmDeleteBatch.vouchers.length.toLocaleString()} voucher{confirmDeleteBatch.vouchers.length !== 1 ? 's' : ''}</span>.
                Should these users also be removed from MikroTik?
              </p>

              {deleteError && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 px-3 py-2 rounded-xl">
                  {deleteError}
                </div>
              )}

              <div className="bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">What gets deleted</p>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"/>
                    Local list — removed from this app only
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"/>
                    MikroTik — permanently deletes the router users
                  </li>
                </ul>
              </div>
            </div>

            <div className="px-6 pb-5 pt-2 flex flex-col gap-2">
              <button type="button"
                disabled={deletingBatch}
                onClick={() => deleteBatchFromMikrotik(confirmDeleteBatch)}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                {deletingBatch ? 'Deleting from MikroTik…' : 'Delete from MikroTik + Local List'}
              </button>
              <button type="button"
                disabled={deletingBatch}
                onClick={() => { removeBatchLocally(confirmDeleteBatch); setConfirmDeleteBatch(null) }}
                className="w-full py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300
                           hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold rounded-xl transition-colors">
                Local List Only
              </button>
              <button type="button"
                disabled={deletingBatch}
                onClick={() => setConfirmDeleteBatch(null)}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-center">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-6 pt-5 pb-6 text-white relative">
              <button type="button" onClick={() => setShowConfirm(false)}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg
                           bg-white/15 hover:bg-white/30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                Confirm Generation
              </h2>
            </div>

            {/* Summary */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Review before generating
              </p>

              {[
                { label: 'Quantity',   value: `${form.quantity.toLocaleString()} voucher${form.quantity !== 1 ? 's' : ''}` },
                { label: 'Profile',    value: form.profile },
                { label: 'Time Limit', value: timeParsed?.label ?? form.timeLimitInput },
                { label: 'Amount',     value: form.amount ? `${config?.currency ?? '₱'}${form.amount}` : 'Free' },
                ...(form.advancedForm && form.server     ? [{ label: 'Server',     value: form.server }]                         : []),
                ...(form.advancedForm                    ? [{ label: 'Name Length', value: `${form.nameLength} chars` }]          : []),
                ...(form.advancedForm && form.dataLimit  ? [{ label: 'Data Limit',  value: `${form.dataLimit} ${form.dataUnit}` }] : []),
                ...(form.advancedForm && form.comment    ? [{ label: 'Comment',     value: form.comment }]                        : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-2 flex gap-2">
              <button type="button" onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300
                           hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold rounded-xl transition-colors">
                Cancel
              </button>
              <button type="button" onClick={doGenerate}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600
                           hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition-all">
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Form Modal */}
      {showAdvancedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-6 pt-5 pb-6 text-white relative">
              <button type="button" onClick={() => setShowAdvancedModal(false)}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg
                           bg-white/15 hover:bg-white/30 text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Advanced Options</h2>
            </div>

            {/* Fields */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Server */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Server</label>
                <select value={form.server}
                  onChange={(e) => setForm((f) => ({ ...f, server: e.target.value }))}
                  disabled={serversLoading}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white
                             disabled:opacity-60 transition appearance-none">
                  <option value="">— Any server (default) —</option>
                  {serversLoading && <option disabled>Loading…</option>}
                  {servers.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Name Length */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Name Length — <span className="text-indigo-600 font-bold">{form.nameLength} characters</span>
                </label>
                <input type="range" min={4} max={12} step={1}
                  value={form.nameLength}
                  onChange={(e) => setForm((f) => ({ ...f, nameLength: Number(e.target.value) }))}
                  className="w-full accent-indigo-600" />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  <span>4</span><span>12</span>
                </div>
              </div>

              {/* Characters */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Characters</label>
                <select value={form.characters}
                  onChange={(e) => setForm((f) => ({ ...f, characters: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition appearance-none">
                  <option value="alphanumeric">Alphanumeric (A-Z, a-z, 0-9)</option>
                  <option value="numeric">Numeric only (0-9)</option>
                  <option value="alpha">Letters only (A-Z, a-z)</option>
                  <option value="uppercase">Uppercase + Numbers (A-Z, 0-9)</option>
                  <option value="custom">Custom…</option>
                </select>
                {form.characters === 'custom' && (
                  <input type="text" placeholder="Type allowed characters, e.g. ABC123"
                    value={form.customChars}
                    onChange={(e) => setForm((f) => ({ ...f, customChars: e.target.value }))}
                    className="mt-2 w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm
                               text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500
                               focus:border-transparent focus:bg-white dark:focus:bg-slate-600 transition" />
                )}
              </div>

              {/* Data Limit */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Data Limit (optional)</label>
                <div className="flex gap-2">
                  <input type="number" min={1} placeholder="e.g. 500"
                    value={form.dataLimit}
                    onChange={(e) => setForm((f) => ({ ...f, dataLimit: e.target.value }))}
                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition" />
                  <select value={form.dataUnit}
                    onChange={(e) => setForm((f) => ({ ...f, dataUnit: e.target.value }))}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition appearance-none">
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                  </select>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Comment (optional)</label>
                <input type="text" placeholder="e.g. VIP voucher batch"
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition" />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Overrides the default {config?.currency ?? '₱'}amount comment on MikroTik</p>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-2 flex gap-2">
              <button type="button"
                onClick={() => {
                  setShowAdvancedModal(false)
                  setForm((f) => ({
                    ...f, advancedForm: false,
                    server: '', nameLength: 8, characters: 'alphanumeric',
                    customChars: '', dataLimit: '', dataUnit: 'MB', comment: '',
                  }))
                }}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold rounded-xl transition-colors">
                Cancel
              </button>
              <button type="button"
                onClick={() => setShowAdvancedModal(false)}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                           text-white text-sm font-semibold rounded-xl transition-all">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingPrintBatch && <PrintOptionsModal onConfirm={handlePrintConfirm} onCancel={handlePrintCancel} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Generate Form ── */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: 'var(--font-heading)' }}>
                  Generate Vouchers
                </h2>
              </div>

              <form onSubmit={handleGenerate} className="p-5 space-y-4">
                <div>
                  <label htmlFor="gen-quantity" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Quantity</label>
                  <input id="gen-quantity" name="quantity" type="number" min={1} max={3000} required value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition" />
                  <div className="flex gap-1.5 mt-2">
                    {[10, 50, 100, 500, 1000].map((n) => (
                      <button key={n} type="button"
                        onClick={() => setForm((f) => ({ ...f, quantity: n }))}
                        className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition
                          ${form.quantity === n
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                          }`}>
                        {n === 1000 ? '1k' : n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="gen-profile" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Profile</label>
                  <select id="gen-profile" name="profile" required
                    disabled={profilesLoading || !!profilesError}
                    value={form.profile}
                    onChange={(e) => setForm({ ...form, profile: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white
                               disabled:opacity-60 disabled:cursor-not-allowed transition appearance-none">
                    {profilesLoading && <option value="">Loading profiles…</option>}
                    {profilesError   && <option value="">{profilesError}</option>}
                    {!profilesLoading && !profilesError && profiles.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="gen-timelimit" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Time Limit</label>
                  <input id="gen-timelimit" name="timeLimit" type="text" value={form.timeLimitInput}
                    onChange={(e) => setForm((f) => ({ ...f, timeLimitInput: e.target.value }))}
                    placeholder="e.g. 1h30m, 2h, 30m, 1d"
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm transition
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      ${form.timeLimitInput && !timeValid ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 bg-slate-50 text-slate-900 focus:bg-white'}`} />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: '30m',   value: '30m'   },
                      { label: '1h',    value: '1h'    },
                      { label: '2h30m', value: '2h30m' },
                      { label: '5h',    value: '5h'    },
                      { label: '1d',    value: '1d'    },
                    ].map(({ label, value }) => (
                      <button key={value} type="button"
                        onClick={() => setForm((f) => ({ ...f, timeLimitInput: value }))}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border transition
                          ${form.timeLimitInput === value
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                          }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${!form.timeLimitInput ? 'text-slate-400' : timeValid ? 'text-emerald-600' : 'text-red-500'}`}>
                    {!form.timeLimitInput ? 'Use d h m — e.g. 1h30m, 1d, unlimited'
                      : timeValid ? <><span className="text-emerald-500">✓</span>{timeParsed!.label}</>
                      : 'Invalid — try 1h, 30m, 1h30m, 1d, unlimited'}
                  </p>
                </div>

                <div>
                  <label htmlFor="gen-amount" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Amount ({config?.currency ?? '₱'})
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm font-semibold pointer-events-none">
                      {config?.currency ?? '₱'}
                    </span>
                    <input id="gen-amount" name="amount" type="text" placeholder="0.00 (optional)" value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val)) setForm((f) => ({ ...f, amount: val.toFixed(2) }))
                      }}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition" />
                  </div>
                </div>

                {/* Advanced Form toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.advancedForm}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm((f) => ({ ...f, advancedForm: true }))
                          openAdvancedModal()
                        } else {
                          setForm((f) => ({
                            ...f, advancedForm: false,
                            server: '', nameLength: 8, characters: 'alphanumeric',
                            customChars: '', dataLimit: '', dataUnit: 'MB', comment: '',
                          }))
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700
                                    peer-checked:bg-indigo-600 peer-checked:border-indigo-600
                                    transition-colors flex items-center justify-center">
                      {form.advancedForm && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">Advanced Form</span>
                  {form.advancedForm && (
                    <button type="button" onClick={openAdvancedModal}
                      className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                      Edit
                    </button>
                  )}
                </label>

                {/* Advanced summary chips */}
                {form.advancedForm && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                      {form.nameLength} chars
                    </span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium capitalize">
                      {form.characters === 'alphanumeric' ? 'A-Z 0-9' : form.characters === 'numeric' ? '0-9' : form.characters === 'alpha' ? 'A-Z a-z' : form.characters === 'uppercase' ? 'A-Z 0-9 upper' : 'Custom'}
                    </span>
                    {form.server     && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">srv: {form.server}</span>}
                    {form.dataLimit  && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">{form.dataLimit}{form.dataUnit}</span>}
                    {form.comment    && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium truncate max-w-[120px]">&ldquo;{form.comment}&rdquo;</span>}
                  </div>
                )}

                {progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Generating vouchers…</span>
                      <span className="text-indigo-600">{progress.current.toLocaleString()} / {progress.total.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="text-right text-xs text-slate-400 dark:text-slate-500">{progressPct}%</p>
                  </div>
                )}

                {generateError && (
                  <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs px-3 py-2.5 rounded-xl">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" clipRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
                    </svg>
                    {generateError}
                  </div>
                )}

                <button type="submit" disabled={generating || profilesLoading || !timeValid}
                  className="w-full py-2.5 mt-1 rounded-xl text-sm font-semibold text-white
                             bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                             disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed
                             shadow-md shadow-indigo-200 hover:shadow-indigo-300
                             hover:-translate-y-px active:translate-y-0 transition-all duration-150">
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating…
                    </span>
                  ) : 'Generate Vouchers'}
                </button>
              </form>
            </div>
          </div>

          {/* ── Voucher Panel ── */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center gap-1 px-5 pt-4 border-b border-slate-200 dark:border-slate-700">
                <TabButton active={activeTab === 'all'} count={allVouchers.length} onClick={() => setActiveTab('all')}>
                  All Vouchers
                </TabButton>
                <TabButton active={activeTab === 'batches'} count={batches.length} onClick={() => setActiveTab('batches')}>
                  Batches
                </TabButton>
              </div>

              <div className="p-5">
                {/* ── All Vouchers ── */}
                {activeTab === 'all' && (
                  <>
                    {allVouchers.length > 0 && (
                      <div className="mb-4 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input id="voucher-search" name="search" type="text"
                          aria-label="Search voucher code"
                          placeholder="Search voucher code…" value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm
                                     text-slate-900 placeholder:text-slate-400
                                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition" />
                      </div>
                    )}
                    {allVouchers.length === 0 ? <EmptyState /> :
                      filteredVouchers.length === 0 ? (
                        <p className="text-center py-10 text-sm text-slate-400">
                          No vouchers match &quot;{search}&quot;
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-slate-400 mb-3">
                            {search.trim()
                              ? `${filteredVouchers.length.toLocaleString()} of ${allVouchers.length.toLocaleString()} vouchers`
                              : `${allVouchers.length.toLocaleString()} voucher${allVouchers.length !== 1 ? 's' : ''} total`}
                          </p>
                          <VoucherTable vouchers={pagedAllVouchers} offset={(allPage - 1) * PAGE_SIZE} currency={config?.currency} />
                          {totalAllPages > 1 && <Pagination page={allPage} total={totalAllPages} onChange={setAllPage} />}
                        </>
                      )}
                  </>
                )}

                {/* ── Batches ── */}
                {activeTab === 'batches' && (
                  batches.length === 0 ? <EmptyState /> : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {batches.length.toLocaleString()} batch{batches.length !== 1 ? 'es' : ''} &middot; {allVouchers.length.toLocaleString()} total vouchers
                        </p>
                        <button
                          onClick={() => { setBatches([]); localStorage.removeItem('mkBatches') }}
                          className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors font-medium">
                          Clear All
                        </button>
                      </div>
                      {[...batches].reverse().map((batch) => {
                        const collapsed = collapsedBatches.has(batch.id)
                        const bPage = getBatchPage(batch.id)
                        const bTotalPages = Math.max(1, Math.ceil(batch.vouchers.length / PAGE_SIZE))
                        const bPaged = batch.vouchers.slice((bPage - 1) * PAGE_SIZE, bPage * PAGE_SIZE)
                        return (
                          <div key={batch.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className="flex items-center bg-slate-50 dark:bg-slate-700/50 px-4 py-2.5 gap-2">
                              <button onClick={() => toggleBatch(batch.id)}
                                className="flex items-center gap-2 flex-wrap flex-1 text-left min-w-0">
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full shrink-0">
                                  #{batch.batchNumber}
                                </span>
                                <span className="text-xs text-slate-400 shrink-0">{batch.createdAt}</span>
                                <span className="text-slate-300 text-xs">|</span>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{batch.profile}</span>
                                <span className="text-slate-300 text-xs">|</span>
                                <span className="text-xs text-slate-500 shrink-0">{batch.timeLimitLabel}</span>
                                <span className="text-slate-300 text-xs">|</span>
                                {batch.amount
                                  ? <span className="text-xs font-bold text-slate-800 dark:text-slate-100 shrink-0">{config?.currency ?? '₱'}{batch.amount}</span>
                                  : <span className="text-xs font-bold text-emerald-600 shrink-0">Free</span>
                                }
                                <span className="text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                                  {batch.vouchers.length.toLocaleString()}
                                </span>
                                <svg className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform shrink-0 ml-auto ${collapsed ? '' : 'rotate-180'}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <button onClick={() => handlePrintClick(batch)}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                                           text-white text-xs font-semibold rounded-lg transition-all shrink-0 shadow-sm">
                                Print
                              </button>
                              <button
                                onClick={() => { setDeleteError(''); setConfirmDeleteBatch(batch) }}
                                title="Delete batch"
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 dark:border-red-800/40
                                           text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            {!collapsed && (
                              <div className="px-4 pb-3 pt-2">
                                <VoucherTable vouchers={bPaged} offset={(bPage - 1) * PAGE_SIZE} currency={config?.currency} compact />
                                {bTotalPages > 1 && <Pagination page={bPage} total={bTotalPages} onChange={(p) => setBatchPage(batch.id, p)} />}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print area */}
      <div id="print-area">
        {printingBatch && printOptions && (
          <div className="voucher-grid">
            {printingBatch.vouchers.map((v, i) => (
              <VoucherPrintCard key={v.code} voucher={v} index={i}
                hotspotName={config?.hotspotName ?? ''} currency={config?.currency ?? '₱'}
                options={printOptions} routerHost={creds?.host} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function TabButton({ children, active, count, onClick }: {
  children: React.ReactNode; active: boolean; count: number; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap
        ${active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
      style={{ fontFamily: 'var(--font-heading)' }}>
      {children}
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold tabular-nums
        ${active ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
        {count.toLocaleString()}
      </span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-400">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No vouchers yet</p>
      <p className="text-xs text-slate-400 mt-1">Fill the form and click Generate Vouchers</p>
    </div>
  )
}

function VoucherTable({ vouchers, offset = 0, currency = '₱', compact = false }: {
  vouchers: Voucher[]; offset?: number; currency?: string; compact?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2 px-3 text-slate-500 font-semibold w-10">#</th>
            <th className="text-left py-2 px-3 text-slate-500 font-semibold">Code</th>
            {!compact && <th className="text-left py-2 px-3 text-slate-500 font-semibold hidden sm:table-cell">Profile</th>}
            {!compact && <th className="text-left py-2 px-3 text-slate-500 font-semibold hidden sm:table-cell">Time</th>}
            <th className="text-left py-2 px-3 text-slate-500 font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {vouchers.map((v, i) => (
            <tr key={v.code}
              className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/60'}`}>
              <td className="py-2 px-3 text-slate-400 tabular-nums">{(offset + i + 1).toLocaleString()}</td>
              <td className="py-2 px-3">
                <span className="font-bold text-indigo-700 tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
                  {v.code}
                </span>
              </td>
              {!compact && <td className="py-2 px-3 text-slate-600 hidden sm:table-cell">{v.profile}</td>}
              {!compact && <td className="py-2 px-3 text-slate-500 hidden sm:table-cell">{v.timeLimitLabel}</td>}
              <td className="py-2 px-3 font-bold text-slate-800">
                {v.amount ? `${currency}${v.amount}` : <span className="text-emerald-600">Free</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
      <div className="flex gap-1">
        <PagBtn onClick={() => onChange(1)} disabled={page <= 1}>«</PagBtn>
        <PagBtn onClick={() => onChange(page - 1)} disabled={page <= 1}>‹ Prev</PagBtn>
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        Page <span className="font-semibold text-slate-800">{page.toLocaleString()}</span> of {total.toLocaleString()}
      </span>
      <div className="flex gap-1">
        <PagBtn onClick={() => onChange(page + 1)} disabled={page >= total}>Next ›</PagBtn>
        <PagBtn onClick={() => onChange(total)} disabled={page >= total}>»</PagBtn>
      </div>
    </div>
  )
}

function PagBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 bg-white
                 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      {children}
    </button>
  )
}
