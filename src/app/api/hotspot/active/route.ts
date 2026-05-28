import { NextRequest, NextResponse } from 'next/server'
import { rosCmd } from '@/lib/mikrotik'
import type { ActiveUser } from '@/types'

export async function POST(req: NextRequest) {
  const { host, port, username, password } = await req.json()
  try {
    const results = await rosCmd(host, Number(port) || 8728, username, password, [
      ['/ip/hotspot/active/print'],
    ])
    const users: ActiveUser[] = results[0]
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id:              r.attrs['.id']               ?? '',
        user:            r.attrs['user']              ?? '',
        address:         r.attrs['address']           ?? '',
        macAddress:      r.attrs['mac-address']       ?? '',
        uptime:          r.attrs['uptime']            ?? '',
        idleTime:        r.attrs['idle-time']         ?? '',
        sessionTimeLeft: r.attrs['session-time-left'] ?? '',
        bytesIn:         parseInt(r.attrs['bytes-in']  ?? '0', 10),
        bytesOut:        parseInt(r.attrs['bytes-out'] ?? '0', 10),
        server:          r.attrs['server']            ?? '',
      }))
    return NextResponse.json({ users })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
