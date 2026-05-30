import { NextRequest, NextResponse } from 'next/server'
import { rosCmd, isMacAddress, resolveMacToIp } from '@/lib/mikrotik'
import { parseCreds } from '@/lib/validate'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = parseCreds(body)
  if ('error' in result) return result.error

  const { creds } = result
  try {
    const resolvedHost = isMacAddress(creds.host) ? await resolveMacToIp(creds.host) : creds.host
    const results = await rosCmd(resolvedHost, creds.port, creds.username, creds.password, [
      ['/ip/hotspot/user/profile/print'],
    ])
    const profiles = results[0]
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id:             r.attrs['.id']              ?? '',
        name:           r.attrs['name']             ?? '',
        rateLimit:      r.attrs['rate-limit']       ?? '',
        sessionTimeout: r.attrs['session-timeout']  ?? '',
        idleTimeout:    r.attrs['idle-timeout']     ?? '',
        sharedUsers:    r.attrs['shared-users']     ?? '1',
        addressPool:    r.attrs['address-pool']     ?? '',
      }))
    return NextResponse.json({ profiles })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
