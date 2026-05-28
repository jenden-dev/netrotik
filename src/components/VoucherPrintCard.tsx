'use client'

import { QRCodeSVG } from 'qrcode.react'
import type { Voucher } from '@/types'
import type { PrintOptions } from './PrintOptionsModal'

// Deterministic color from profile name
const PALETTE = [
  '#059669', '#1e40af', '#dc2626', '#d97706',
  '#7c3aed', '#0891b2', '#16a34a', '#ea580c',
]

function profileColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function lighten(hex: string, f: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const n = (c: number) => Math.min(255, Math.round(c + (255 - c) * f)).toString(16).padStart(2, '0')
  return `#${n(r)}${n(g)}${n(b)}`
}

interface Props {
  voucher: Voucher
  index: number
  hotspotName: string
  currency: string
  options: PrintOptions
  routerHost?: string
}

export default function VoucherPrintCard({ voucher, index, hotspotName, currency, options, routerHost }: Props) {
  const { design, style } = options
  const color     = profileColor(voucher.profile)
  const colorL    = lighten(color, 0.3)   // light — for gradient end
  const colorVL   = lighten(color, 0.9)   // very light — for code bg & footer bg
  const colorMid  = lighten(color, 0.7)   // mid — for footer border
  const seq       = String(index + 1).padStart(3, '0')
  const isD3      = design === 3
  const showCreds = (design === 2 || design === 3) && style === 'user'
  const qrUrl     = `http://${routerHost ?? '192.168.88.1'}/login?username=${encodeURIComponent(voucher.code)}&password=${encodeURIComponent(voucher.code)}`

  const ff = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'

  return (
    <div style={{
      width:           isD3 ? '2in' : '1.7in',
      height:          isD3 ? '2in' : '1in',
      background:      '#fff',
      display:         'flex',
      flexDirection:   'column',
      overflow:        'hidden',
      pageBreakInside: 'avoid',
      breakInside:     'avoid',
      border:          `1px solid ${color}`,
      margin:          0,
      padding:         0,
      boxSizing:       'border-box',
    }}>

      {/* Header */}
      <div style={{
        background:     `linear-gradient(90deg, ${color}, ${colorL})`,
        color:          '#fff',
        fontSize:       '10px',
        fontWeight:     700,
        textAlign:      'center',
        padding:        '2px 6px',
        fontFamily:     ff,
        whiteSpace:     'nowrap',
        overflow:       'hidden',
        textOverflow:   'ellipsis',
      }}>
        {hotspotName || 'WiFi Hotspot'}
      </div>

      {/* Body */}
      <div style={{
        flex:           '1 1 0',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'space-evenly',
        alignItems:     'center',
        padding:        '2px 4px',
        textAlign:      'center',
        fontFamily:     ff,
      }}>

        {/* Title */}
        <div style={{ fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', color, letterSpacing: '0.04em' }}>
          {style === 'user' && design !== 3 ? 'Hotspot Access Code' : 'Wi-Fi Voucher'}
        </div>

        {/* QR Code — Design 3 only */}
        {isD3 && (
          <div style={{
            border:         `1px dashed ${color}`,
            padding:        '2px',
            display:        'flex',
            justifyContent: 'center',
            alignItems:     'center',
          }}>
            <QRCodeSVG value={qrUrl} size={showCreds ? 52 : 62} level="L" />
          </div>
        )}

        {/* Credentials row — Design 2 & 3 user style */}
        {showCreds && (
          <div style={{ fontSize: '8px', lineHeight: 1.5, color: '#111827' }}>
            <div>User: <strong style={{ fontFamily: 'monospace' }}>{voucher.code}</strong></div>
            <div>Pass: <strong style={{ fontFamily: 'monospace' }}>{voucher.code}</strong></div>
          </div>
        )}

        {/* Voucher Code */}
        <div style={{
          fontSize:     isD3 ? '11px' : '14px',
          fontWeight:   'bold',
          color:        '#000',
          border:       `1px dashed ${color}`,
          background:   colorVL,
          padding:      '1px 6px',
          fontFamily:   'monospace',
          letterSpacing: '0.08em',
        }}>
          {voucher.code}
        </div>

        {/* Meta */}
        <div style={{ fontSize: '7.5px', color: '#6b7280', whiteSpace: 'nowrap' }}>
          {voucher.timeLimitLabel}&nbsp;&nbsp;|&nbsp;&nbsp;{currency}{voucher.amount}
        </div>

      </div>

      {/* Footer */}
      <div style={{
        background:   colorVL,
        color,
        borderTop:    `1px solid ${colorMid}`,
        fontSize:     '8px',
        textAlign:    'center',
        padding:      '2px',
        fontWeight:   700,
        fontFamily:   ff,
      }}>
        #{seq}
      </div>
    </div>
  )
}
