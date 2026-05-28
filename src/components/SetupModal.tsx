'use client'

import { useState, FormEvent } from 'react'
import type { AppConfig } from '@/types'

const CURRENCIES = [
  { symbol: '₱', label: '₱  — PHP  Philippine Peso' },
  { symbol: '$', label: '$  — USD  US Dollar' },
  { symbol: '€', label: '€  — EUR  Euro' },
  { symbol: '£', label: '£  — GBP  British Pound' },
  { symbol: '¥', label: '¥  — JPY  Japanese Yen' },
  { symbol: 'S$', label: 'S$ — SGD  Singapore Dollar' },
  { symbol: 'RM', label: 'RM — MYR  Malaysian Ringgit' },
  { symbol: 'custom', label: 'Custom…' },
]

interface Props {
  initial: AppConfig
  onSave: (config: AppConfig) => void
}

export default function SetupModal({ initial, onSave }: Props) {
  const isKnown = CURRENCIES.some((c) => c.symbol === initial.currency && c.symbol !== 'custom')
  const [hotspotName, setHotspotName] = useState(initial.hotspotName)
  const [currencySelect, setCurrencySelect] = useState(isKnown ? initial.currency : 'custom')
  const [customCurrency, setCustomCurrency] = useState(isKnown ? '' : initial.currency)

  const effectiveCurrency = currencySelect === 'custom' ? customCurrency : currencySelect

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = hotspotName.trim()
    const trimmedCurrency = effectiveCurrency.trim()
    if (!trimmedName || !trimmedCurrency) return
    onSave({ hotspotName: trimmedName, currency: trimmedCurrency })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 pt-6 pb-8 text-white text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">Hotspot Setup</h2>
          <p className="text-blue-100 text-xs mt-1">This info will appear on every printed voucher</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* Hotspot Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="setup-hotspot-name" className="block text-sm font-medium text-gray-700">Hotspot Name</label>
              <span className={`text-xs tabular-nums ${hotspotName.length >= 25 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                {hotspotName.length}/25
              </span>
            </div>
            <input
              id="setup-hotspot-name"
              name="hotspotName"
              type="text"
              required
              maxLength={25}
              placeholder="e.g. My WiFi Shop"
              value={hotspotName}
              onChange={(e) => setHotspotName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="setup-currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              id="setup-currency"
              name="currency"
              value={currencySelect}
              onChange={(e) => setCurrencySelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.label}</option>
              ))}
            </select>

            {currencySelect === 'custom' && (
              <input
                id="setup-custom-currency"
                name="customCurrency"
                type="text"
                required
                maxLength={5}
                placeholder="Type symbol, e.g. KSh"
                value={customCurrency}
                onChange={(e) => setCustomCurrency(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Preview */}
          {hotspotName.trim() && effectiveCurrency.trim() && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1.5">Voucher preview</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-700 truncate max-w-[60%]">
                  {hotspotName.trim()}
                </span>
                <span className="text-xs font-bold text-gray-900">
                  {effectiveCurrency.trim()}50
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!hotspotName.trim() || !effectiveCurrency.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
