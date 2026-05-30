'use client'

import { useState } from 'react'

export type PaperSize = 'a4' | 'short' | 'folio'
export type CardDesign = 1 | 2 | 3
export type PrintStyle = 'voucher' | 'user'

export interface PrintOptions {
  paper: PaperSize
  design: CardDesign
  style: PrintStyle
}

interface Props {
  onConfirm: (opts: PrintOptions) => void
  onCancel: () => void
}

export default function PrintOptionsModal({ onConfirm, onCancel }: Props) {
  const [opts, setOpts] = useState<PrintOptions>({ paper: 'short', design: 1, style: 'voucher' })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header — matches SetupModal style */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-6 pt-5 pb-6 text-white relative">
          <button type="button" onClick={onCancel}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg
                       bg-white/15 hover:bg-white/30 text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Print / Save as PDF
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Paper Size */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Paper Size</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { value: 'a4' as PaperSize,    label: 'A4',    sub: '210×297mm' },
                { value: 'short' as PaperSize, label: 'Short', sub: '8.5×11in'  },
                { value: 'folio' as PaperSize, label: 'Folio', sub: '8.5×13in'  },
              ]).map((p) => (
                <button key={p.value} onClick={() => setOpts({ ...opts, paper: p.value })}
                  className={`py-2 rounded-xl border text-center transition-colors
                    ${opts.paper === p.value
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 bg-slate-50 dark:bg-slate-700'}`}>
                  <div className={`text-xs font-semibold ${opts.paper === p.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{p.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">{p.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Card Design */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Card Design</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { value: 1 as CardDesign, label: 'Classic',    sub: '35×22mm' },
                { value: 2 as CardDesign, label: 'Credential', sub: '35×22mm' },
                { value: 3 as CardDesign, label: 'QR Code',    sub: '35×35mm' },
              ]).map((d) => (
                <button key={d.value} onClick={() => setOpts({ ...opts, design: d.value })}
                  className={`py-2 rounded-xl border text-center transition-colors
                    ${opts.design === d.value
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 bg-slate-50 dark:bg-slate-700'}`}>
                  <div className={`text-xs font-semibold ${opts.design === d.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{d.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">{d.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Style</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { value: 'voucher' as PrintStyle, label: 'Voucher',     sub: 'Code only'   },
                { value: 'user' as PrintStyle,    label: 'Credentials', sub: 'User + Pass' },
              ]).map((s) => (
                <button key={s.value} onClick={() => setOpts({ ...opts, style: s.value })}
                  className={`py-2.5 rounded-xl border text-center transition-colors
                    ${opts.style === s.value
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 bg-slate-50 dark:bg-slate-700'}`}>
                  <div className={`text-xs font-semibold ${opts.style === s.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{s.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">{s.sub}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold">
            Cancel
          </button>
          <button onClick={() => onConfirm(opts)}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-indigo-600 to-violet-600
                       hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-semibold transition-all">
            Print
          </button>
        </div>
      </div>
    </div>
  )
}
