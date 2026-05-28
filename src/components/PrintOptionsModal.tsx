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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs mx-4">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900">Print / Save as PDF</h2>
        </div>

        {/* Paper Size */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Paper Size</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: 'a4' as PaperSize,    label: 'A4',    sub: '210×297mm' },
              { value: 'short' as PaperSize, label: 'Short', sub: '8.5×11in'  },
              { value: 'folio' as PaperSize, label: 'Folio', sub: '8.5×13in'  },
            ]).map((p) => (
              <button key={p.value} onClick={() => setOpts({ ...opts, paper: p.value })}
                className={`py-2 rounded-lg border text-center transition-colors
                  ${opts.paper === p.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <div className={`text-xs font-semibold ${opts.paper === p.value ? 'text-blue-700' : 'text-gray-700'}`}>{p.label}</div>
                <div className="text-[10px] text-gray-400">{p.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Card Design */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Card Design</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: 1 as CardDesign, label: 'Classic',    sub: '1.7×1 in'  },
              { value: 2 as CardDesign, label: 'Credential', sub: '1.7×1 in'  },
              { value: 3 as CardDesign, label: 'QR Code',    sub: '2×2 in'    },
            ]).map((d) => (
              <button key={d.value} onClick={() => setOpts({ ...opts, design: d.value })}
                className={`py-2 rounded-lg border text-center transition-colors
                  ${opts.design === d.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <div className={`text-xs font-semibold ${opts.design === d.value ? 'text-blue-700' : 'text-gray-700'}`}>{d.label}</div>
                <div className="text-[10px] text-gray-400">{d.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Style</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { value: 'voucher' as PrintStyle, label: 'Voucher',     sub: 'Code only'   },
              { value: 'user' as PrintStyle,    label: 'Credentials', sub: 'User + Pass' },
            ]).map((s) => (
              <button key={s.value} onClick={() => setOpts({ ...opts, style: s.value })}
                className={`py-2.5 rounded-lg border text-center transition-colors
                  ${opts.style === s.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <div className={`text-xs font-semibold ${opts.style === s.value ? 'text-blue-700' : 'text-gray-700'}`}>{s.label}</div>
                <div className="text-[10px] text-gray-400">{s.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(opts)}
            className="flex-1 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>
    </div>
  )
}
