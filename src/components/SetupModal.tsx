'use client'

import { useState, FormEvent } from 'react'
import type { AppConfig } from '@/types'

const CURRENCIES = [
  { symbol: '₱',      label: '₱  — PHP  Philippine Peso'   },
  { symbol: '$',      label: '$  — USD  US Dollar'           },
  { symbol: '€',      label: '€  — EUR  Euro'                },
  { symbol: '£',      label: '£  — GBP  British Pound'       },
  { symbol: '¥',      label: '¥  — JPY  Japanese Yen'        },
  { symbol: 'S$',     label: 'S$ — SGD  Singapore Dollar'    },
  { symbol: 'RM',     label: 'RM — MYR  Malaysian Ringgit'   },
  { symbol: 'Rp',     label: 'Rp — IDR  Indonesian Rupiah'   },
  { symbol: '₹',      label: '₹  — INR  Indian Rupee'        },
  { symbol: '৳',      label: '৳  — BDT  Bangladeshi Taka'    },
  { symbol: 'custom', label: 'Custom…'                        },
]

const TIMEZONES = [
  { group: 'Southeast Asia', zones: [
    { value: 'Asia/Manila',         label: 'Philippines (UTC+8)'       },
    { value: 'Asia/Jakarta',        label: 'Indonesia West (UTC+7)'    },
    { value: 'Asia/Makassar',       label: 'Indonesia Central (UTC+8)' },
    { value: 'Asia/Jayapura',       label: 'Indonesia East (UTC+9)'    },
    { value: 'Asia/Kuala_Lumpur',   label: 'Malaysia (UTC+8)'          },
    { value: 'Asia/Singapore',      label: 'Singapore (UTC+8)'         },
    { value: 'Asia/Bangkok',        label: 'Thailand (UTC+7)'          },
    { value: 'Asia/Ho_Chi_Minh',    label: 'Vietnam (UTC+7)'           },
    { value: 'Asia/Yangon',         label: 'Myanmar (UTC+6:30)'        },
    { value: 'Asia/Phnom_Penh',     label: 'Cambodia (UTC+7)'          },
  ]},
  { group: 'South & East Asia', zones: [
    { value: 'Asia/Dhaka',          label: 'Bangladesh (UTC+6)'        },
    { value: 'Asia/Kolkata',        label: 'India (UTC+5:30)'          },
    { value: 'Asia/Karachi',        label: 'Pakistan (UTC+5)'          },
    { value: 'Asia/Shanghai',       label: 'China (UTC+8)'             },
    { value: 'Asia/Tokyo',          label: 'Japan (UTC+9)'             },
    { value: 'Asia/Seoul',          label: 'South Korea (UTC+9)'       },
    { value: 'Asia/Taipei',         label: 'Taiwan (UTC+8)'            },
  ]},
  { group: 'Middle East', zones: [
    { value: 'Asia/Dubai',          label: 'UAE (UTC+4)'               },
    { value: 'Asia/Riyadh',         label: 'Saudi Arabia (UTC+3)'      },
  ]},
  { group: 'Europe', zones: [
    { value: 'Europe/London',       label: 'UK (UTC+0/+1)'             },
    { value: 'Europe/Paris',        label: 'Central Europe (UTC+1/+2)' },
    { value: 'Europe/Moscow',       label: 'Moscow (UTC+3)'            },
  ]},
  { group: 'Americas', zones: [
    { value: 'America/New_York',    label: 'US Eastern (UTC-5/-4)'     },
    { value: 'America/Chicago',     label: 'US Central (UTC-6/-5)'     },
    { value: 'America/Denver',      label: 'US Mountain (UTC-7/-6)'    },
    { value: 'America/Los_Angeles', label: 'US Pacific (UTC-8/-7)'     },
    { value: 'America/Sao_Paulo',   label: 'Brazil (UTC-3)'            },
  ]},
  { group: 'Pacific & Other', zones: [
    { value: 'Pacific/Auckland',    label: 'New Zealand (UTC+12/+13)'  },
    { value: 'Pacific/Sydney',      label: 'Australia East (UTC+10/+11)'},
    { value: 'Australia/Adelaide',  label: 'Australia Central (UTC+9:30)'},
    { value: 'UTC',                 label: 'UTC (UTC+0)'               },
  ]},
]

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-600 transition'
const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5'

interface Props {
  initial: AppConfig
  onSave: (config: AppConfig) => void
  onCancel?: () => void
}

export default function SetupModal({ initial, onSave, onCancel }: Props) {
  const isKnown = CURRENCIES.some((c) => c.symbol === initial.currency && c.symbol !== 'custom')
  const [hotspotName, setHotspotName]     = useState(initial.hotspotName)
  const [currencySelect, setCurrencySelect] = useState(isKnown ? initial.currency : 'custom')
  const [customCurrency, setCustomCurrency] = useState(isKnown ? '' : initial.currency)
  const [loginUrl, setLoginUrl]           = useState(initial.loginUrl ?? '')
  const [timezone, setTimezone]           = useState(initial.timezone ?? 'Asia/Manila')

  const effectiveCurrency = currencySelect === 'custom' ? customCurrency : currencySelect

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = hotspotName.trim()
    const trimmedCurrency = effectiveCurrency.trim()
    if (!trimmedName || !trimmedCurrency) return
    onSave({
      hotspotName: trimmedName,
      currency:    trimmedCurrency,
      loginUrl:    loginUrl.trim() || undefined,
      timezone,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-6 pt-5 pb-6 text-white relative">
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg
                         bg-white/15 hover:bg-white/30 text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            {onCancel ? 'Edit Hotspot Settings' : 'Hotspot Setup'}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Hotspot Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="setup-hotspot-name" className={labelCls} style={{ marginBottom: 0 }}>
                  Hotspot Name
                </label>
                <span className={`text-xs tabular-nums ${hotspotName.length >= 25 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                  {hotspotName.length}/25
                </span>
              </div>
              <input id="setup-hotspot-name" name="hotspotName" type="text" required maxLength={25}
                placeholder="e.g. My WiFi Shop" value={hotspotName}
                onChange={(e) => setHotspotName(e.target.value)}
                className={inputCls} autoFocus />
            </div>

            {/* Currency */}
            <div>
              <label htmlFor="setup-currency" className={labelCls}>Currency</label>
              <select id="setup-currency" name="currency" value={currencySelect}
                onChange={(e) => setCurrencySelect(e.target.value)}
                className={`${inputCls} appearance-none dark:[color-scheme:dark]`}>
                {CURRENCIES.map((c) => (
                  <option key={c.symbol} value={c.symbol}>{c.label}</option>
                ))}
              </select>
              {currencySelect === 'custom' && (
                <input id="setup-custom-currency" name="customCurrency" type="text" required maxLength={5}
                  placeholder="Type symbol, e.g. KSh" value={customCurrency}
                  onChange={(e) => setCustomCurrency(e.target.value)}
                  className={`mt-2 ${inputCls}`} />
              )}
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="setup-timezone" className={labelCls}>Timezone</label>
              <select id="setup-timezone" name="timezone" value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={`${inputCls} appearance-none dark:[color-scheme:dark]`}>
                {TIMEZONES.map(({ group, zones }) => (
                  <optgroup key={group} label={group}>
                    {zones.map((z) => (
                      <option key={z.value} value={z.value}>{z.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Used for the timestamp on generated voucher batches.
              </p>
            </div>

            {/* Hotspot Login URL */}
            <div>
              <label htmlFor="setup-login-url" className={labelCls}>
                Hotspot Login URL <span className="text-slate-400 dark:text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <input id="setup-login-url" name="loginUrl" type="text"
                placeholder="e.g. http://192.168.88.1/login"
                value={loginUrl}
                onChange={(e) => setLoginUrl(e.target.value)}
                className={inputCls} />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Used for QR code generation. Defaults to router IP if left blank.
              </p>
            </div>

            {/* Preview */}
            {hotspotName.trim() && effectiveCurrency.trim() && (
              <div className="bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-xl p-3">
                <p className={`${labelCls} mb-1.5`}>Voucher Preview</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200 truncate max-w-[60%]">
                    {hotspotName.trim()}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {effectiveCurrency.trim()}50
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-2 flex gap-2">
            {onCancel && (
              <button type="button" onClick={onCancel}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300
                           hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold rounded-xl transition-colors">
                Cancel
              </button>
            )}
            <button type="submit" disabled={!hotspotName.trim() || !effectiveCurrency.trim()}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                         disabled:from-indigo-300 disabled:to-violet-300 text-white text-sm font-semibold rounded-xl transition-all">
              {onCancel ? 'Save Changes' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
