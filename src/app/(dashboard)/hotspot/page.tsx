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

  const [form, setForm] = useState({ quantity: 1, profile: '', timeLimitInput: '1h', amount: '' })

  const [generating, setGenerating]     = useState(false)
  const [progress, setProgress]         = useState<{ current: number; total: number } | null>(null)
  const [generateError, setGenerateError] = useState('')

  const [batches, setBatches] = useState<Batch[]>([])
  const [activeTab, setActiveTab]           = useState<Tab>('all')
  const [search, setSearch]                 = useState('')
  const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set())

  const [allPage, setAllPage]       = useState(1)
  const [batchPages, setBatchPages] = useState<Record<string, number>>({})

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

  // Persist batches across navigation
  useEffect(() => {
    try { localStorage.setItem('mkBatches', JSON.stringify(batches)) } catch { /* storage full */ }
  }, [batches])

  // Open a blank popup window and print all vouchers there (multi-page safe)
  useEffect(() => {
    if (!printingBatch || !printOptions) return
    const sizeMap: Record<string, string> = { a4: 'A4', short: 'letter', folio: '8.5in 13in' }
    const paperSize = sizeMap[printOptions.paper]

    const t = setTimeout(() => {
      const area = document.getElementById('print-area')
      if (!area) return

      const win = window.open('', '_blank', 'width=1,height=1')
      if (!win) { alert('Please allow popups for this site to enable printing.'); return }

      win.document.write(`<!DOCTYPE html><html><head>
        <style>
          @page { size: ${paperSize}; margin: 0; }
          html, body { margin: 0; padding: 0; }
          .voucher-grid {
            display: flex; flex-wrap: wrap;
            gap: 0; row-gap: 0; column-gap: 0;
            padding: 0; margin: 0;
            align-content: flex-start;
            box-sizing: border-box;
          }
          .voucher-grid > * { margin: 0 !important; padding: 0 !important; flex-shrink: 0; }
        </style>
      </head><body>${area.innerHTML}</body></html>`)
      win.document.close()
      win.focus()
      win.print()
      win.addEventListener('afterprint', () => {
        win.close()
        setPrintingBatch(null)
        setPrintOptions(null)
      })
    }, 300)

    return () => clearTimeout(t)
  }, [printingBatch, printOptions])

  // Mount: load credentials, config, profiles, persisted batches
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mkBatches')
      if (saved) setBatches(JSON.parse(saved))
    } catch {}

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

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!creds || !timeParsed) return
    setGenerating(true); setGenerateError(''); setProgress({ current: 0, total: form.quantity })
    const payload = { ...creds, quantity: form.quantity, profile: form.profile, timeLimit: timeParsed.rosValue, timeLimitLabel: timeParsed.label, amount: form.amount }
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
            setActiveTab('batches'); setForm((f) => ({ ...f, quantity: 1, amount: '', timeLimitInput: '1h' })); setAllPage(1); setSearch('')
          }
          if (data.error) setGenerateError(data.error)
        }
      }
    } catch { setGenerateError('Network error — please try again') }
    finally { setGenerating(false); setProgress(null) }
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
  function handleSetupSave(newConfig: AppConfig) {
    setConfig(newConfig); localStorage.setItem('mkConfig', JSON.stringify(newConfig)); sessionStorage.setItem('mkSetupDone', '1')
  }

  // ── JSX ──────────────────────────────────────────────────
  return (
    <>
      {config === null && <SetupModal initial={modalInitial} onSave={handleSetupSave} />}
      {pendingPrintBatch && <PrintOptionsModal onConfirm={handlePrintConfirm} onCancel={handlePrintCancel} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Generate Form ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Generate Vouchers
                </h2>
              </div>

              <form onSubmit={handleGenerate} className="p-5 space-y-4">
                <div>
                  <label htmlFor="gen-quantity" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantity</label>
                  <input id="gen-quantity" name="quantity" type="number" min={1} max={3000} required value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900
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
                  <label htmlFor="gen-profile" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Profile</label>
                  <select id="gen-profile" name="profile" required
                    disabled={profilesLoading || !!profilesError}
                    value={form.profile}
                    onChange={(e) => setForm({ ...form, profile: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white
                               disabled:opacity-60 disabled:cursor-not-allowed transition appearance-none">
                    {profilesLoading && <option value="">Loading profiles…</option>}
                    {profilesError   && <option value="">{profilesError}</option>}
                    {!profilesLoading && !profilesError && profiles.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="gen-timelimit" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Time Limit</label>
                  <input id="gen-timelimit" name="timeLimit" type="text" value={form.timeLimitInput}
                    onChange={(e) => setForm((f) => ({ ...f, timeLimitInput: e.target.value }))}
                    placeholder="e.g. 1h30m, 2h, 30m, 1d"
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm transition
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      ${form.timeLimitInput && !timeValid ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 bg-slate-50 text-slate-900 focus:bg-white'}`} />
                  <p className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${!form.timeLimitInput ? 'text-slate-400' : timeValid ? 'text-emerald-600' : 'text-red-500'}`}>
                    {!form.timeLimitInput ? 'Use d h m — e.g. 1h30m, 1d, unlimited'
                      : timeValid ? <><span className="text-emerald-500">✓</span>{timeParsed!.label}</>
                      : 'Invalid — try 1h, 30m, 1h30m, 1d, unlimited'}
                  </p>
                </div>

                <div>
                  <label htmlFor="gen-amount" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Amount ({config?.currency ?? '₱'})
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm font-semibold pointer-events-none">
                      {config?.currency ?? '₱'}
                    </span>
                    <input id="gen-amount" name="amount" type="text" required placeholder="0.00" value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val)) setForm((f) => ({ ...f, amount: val.toFixed(2) }))
                      }}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition" />
                  </div>
                </div>

                {progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Generating vouchers…</span>
                      <span className="text-indigo-600">{progress.current.toLocaleString()} / {progress.total.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="text-right text-xs text-slate-400">{progressPct}%</p>
                  </div>
                )}

                {generateError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-xl">
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-1 px-5 pt-4 border-b border-slate-200">
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
                      <p className="text-xs text-slate-400">
                        {batches.length.toLocaleString()} batch{batches.length !== 1 ? 'es' : ''} &middot; {allVouchers.length.toLocaleString()} total vouchers
                      </p>
                      {[...batches].reverse().map((batch) => {
                        const collapsed = collapsedBatches.has(batch.id)
                        const bPage = getBatchPage(batch.id)
                        const bTotalPages = Math.max(1, Math.ceil(batch.vouchers.length / PAGE_SIZE))
                        const bPaged = batch.vouchers.slice((bPage - 1) * PAGE_SIZE, bPage * PAGE_SIZE)
                        return (
                          <div key={batch.id} className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="flex items-center bg-slate-50 px-4 py-2.5 gap-2">
                              <button onClick={() => toggleBatch(batch.id)}
                                className="flex items-center gap-2 flex-wrap flex-1 text-left min-w-0">
                                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                                  #{batch.batchNumber}
                                </span>
                                <span className="text-xs text-slate-400 shrink-0">{batch.createdAt}</span>
                                <span className="text-slate-300 text-xs">|</span>
                                <span className="text-xs font-medium text-slate-700 truncate">{batch.profile}</span>
                                <span className="text-slate-300 text-xs">|</span>
                                <span className="text-xs text-slate-500 shrink-0">{batch.timeLimitLabel}</span>
                                <span className="text-slate-300 text-xs">|</span>
                                <span className="text-xs font-bold text-slate-800 shrink-0">{config?.currency ?? '₱'}{batch.amount}</span>
                                <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                                  {batch.vouchers.length.toLocaleString()}
                                </span>
                                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ml-auto ${collapsed ? '' : 'rotate-180'}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <button onClick={() => handlePrintClick(batch)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600
                                           text-white text-xs font-semibold rounded-lg transition-colors shrink-0 shadow-sm">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print
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
        ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
        {count.toLocaleString()}
      </span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-400">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-500">No vouchers yet</p>
      <p className="text-xs text-slate-400 mt-1">Fill the form and click Generate Vouchers</p>
    </div>
  )
}

function VoucherTable({ vouchers, offset = 0, currency = '₱', compact = false }: {
  vouchers: Voucher[]; offset?: number; currency?: string; compact?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
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
              className={`border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-2 px-3 text-slate-400 tabular-nums">{(offset + i + 1).toLocaleString()}</td>
              <td className="py-2 px-3">
                <span className="font-bold text-indigo-700 tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
                  {v.code}
                </span>
              </td>
              {!compact && <td className="py-2 px-3 text-slate-600 hidden sm:table-cell">{v.profile}</td>}
              {!compact && <td className="py-2 px-3 text-slate-500 hidden sm:table-cell">{v.timeLimitLabel}</td>}
              <td className="py-2 px-3 font-bold text-slate-800">{currency}{v.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
      <div className="flex gap-1">
        <PagBtn onClick={() => onChange(1)} disabled={page <= 1}>«</PagBtn>
        <PagBtn onClick={() => onChange(page - 1)} disabled={page <= 1}>‹ Prev</PagBtn>
      </div>
      <span className="text-xs text-slate-500 tabular-nums">
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
