export interface ParsedTime {
  rosValue: string  // RouterOS API format: "01:30:00" or "1d 12:00:00"
  label: string     // Human label: "1 Hour 30 Mins"
}

/**
 * Parses a user-friendly time string into RouterOS API format.
 * Accepted units: d (days), h (hours), m (minutes)
 * Examples: "1h30m", "2h", "30m", "1d", "1d12h30m", "90m" (→ 1h30m), "unlimited"
 */
export function parseTimeLimit(raw: string): ParsedTime | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '')

  if (!s || s === 'unlimited' || s === 'none' || s === '∞' || s === '0') {
    return { rosValue: 'unlimited', label: 'Unlimited' }
  }

  // Accept any combination of Nd Nh Nm in that order (each part optional, but at least one required)
  const match = s.match(/^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/)
  if (!match || (!match[1] && !match[2] && !match[3])) return null

  let days  = parseInt(match[1] ?? '0')
  let hours = parseInt(match[2] ?? '0')
  let mins  = parseInt(match[3] ?? '0')

  // Normalize overflow
  hours += Math.floor(mins / 60);  mins  %= 60
  days  += Math.floor(hours / 24); hours %= 24

  if (!days && !hours && !mins) {
    return { rosValue: 'unlimited', label: 'Unlimited' }
  }

  const hh = String(hours).padStart(2, '0')
  const mm = String(mins).padStart(2, '0')
  const rosValue = days > 0 ? `${days}d ${hh}:${mm}:00` : `${hh}:${mm}:00`

  const parts: string[] = []
  if (days)  parts.push(`${days} Day${days   !== 1 ? 's' : ''}`)
  if (hours) parts.push(`${hours} Hour${hours !== 1 ? 's' : ''}`)
  if (mins)  parts.push(`${mins} Min${mins   !== 1 ? 's' : ''}`)

  return { rosValue, label: parts.join(' ') }
}
