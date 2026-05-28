import { NextRequest } from 'next/server'
import { isMacAddress, resolveMacToIp, rosCmd } from '@/lib/mikrotik'
import { parseCreds } from '@/lib/validate'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = parseCreds(body)
  if ('error' in result) return result.error

  const { action, sessionId } = body
  if (action !== 'remove') return Response.json({ error: 'Invalid action' }, { status: 400 })
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 32)
    return Response.json({ error: 'Invalid sessionId' }, { status: 400 })

  const { creds } = result
  try {
    const resolvedHost = isMacAddress(creds.host) ? await resolveMacToIp(creds.host) : creds.host
    await rosCmd(resolvedHost, creds.port, creds.username, creds.password, [
      ['/ip/hotspot/active/remove', `=.id=${sessionId}`],
    ])
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
