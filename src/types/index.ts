export interface AppConfig {
  hotspotName: string
  currency: string
  loginUrl?: string
  timezone?: string
}

export interface MikrotikCreds {
  host: string
  port: number
  username: string
  password: string
}

export interface Voucher {
  code: string
  profile: string
  timeLimit: string
  timeLimitLabel: string
  amount: string
  createdAt: string
}

export interface Batch {
  id: string
  batchNumber: number
  createdAt: string
  profile: string
  timeLimitLabel: string
  amount: string
  vouchers: Voucher[]
}

export interface HotspotUser {
  id: string
  name: string
  password: string
  profile: string
  limitUptime: string
  uptime: string
  bytesIn: number
  bytesOut: number
  disabled: boolean
  comment: string
}

export interface ActiveUser {
  id: string
  user: string
  address: string
  macAddress: string
  uptime: string
  idleTime: string
  sessionTimeLeft: string
  bytesIn: number
  bytesOut: number
  server: string
}

export interface TimeLimitOption {
  label: string
  value: string
}

export const TIME_LIMITS: TimeLimitOption[] = [
  { label: '30 Minutes', value: '00:30:00' },
  { label: '1 Hour', value: '01:00:00' },
  { label: '2 Hours', value: '02:00:00' },
  { label: '3 Hours', value: '03:00:00' },
  { label: '6 Hours', value: '06:00:00' },
  { label: '12 Hours', value: '12:00:00' },
  { label: '1 Day', value: '1d 00:00:00' },
  { label: '3 Days', value: '3d 00:00:00' },
  { label: '7 Days', value: '7d 00:00:00' },
  { label: '30 Days', value: '30d 00:00:00' },
  { label: 'Unlimited', value: 'unlimited' },
]
