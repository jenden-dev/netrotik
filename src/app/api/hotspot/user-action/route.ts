import { NextRequest } from 'next/server'
import { isMacAddress, resolveMacToIp, rosCmd } from '@/lib/mikrotik'
import { parseCreds } from '@/lib/validate'

const ACTION_CMD: Record<string, string> = {
  remove:  '/ip/hotspot/user/remove',
  disable: '/ip/hotspot/user/disable',
  enable:  '/ip/hotspot/user/enable',
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = parseCreds(body)
  if ('error' in result) return result.error

  const { action, userId } = body
  const cmd = ACTION_CMD[action]
  if (!cmd) return Response.json({ error: 'Invalid action' }, { status: 400 })
  if (!userId || typeof userId !== 'string' || userId.length > 32)
    return Response.json({ error: 'Invalid userId' }, { status: 400 })

  const { creds } = result
  try {
    const resolvedHost = isMacAddress(creds.host) ? await resolveMacToIp(creds.host) : creds.host
    await rosCmd(resolvedHost, creds.port, creds.username, creds.password, [
      [cmd, `=.id=${userId}`],
    ])
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
