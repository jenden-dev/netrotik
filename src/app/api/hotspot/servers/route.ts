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
      ['/ip/hotspot/profile/print'],
    ])
    const servers = results[0]
      .filter((r) => r.type === '!re')
      .map((r) => r.attrs.name)
      .filter(Boolean) as string[]
    return NextResponse.json({ servers })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
