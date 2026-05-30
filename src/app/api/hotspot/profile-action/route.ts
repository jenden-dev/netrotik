import { NextRequest, NextResponse } from 'next/server'
import { rosCmd, isMacAddress, resolveMacToIp } from '@/lib/mikrotik'
import { parseCreds } from '@/lib/validate'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = parseCreds(body)
  if ('error' in result) return result.error

  const { creds } = result
  const { action, profileId, name, rateLimit, sessionTimeout, idleTimeout, sharedUsers, addressPool } = body

  if (!['add', 'edit', 'remove'].includes(action))
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  try {
    const resolvedHost = isMacAddress(creds.host) ? await resolveMacToIp(creds.host) : creds.host

    if (action === 'remove') {
      await rosCmd(resolvedHost, creds.port, creds.username, creds.password, [
        ['/ip/hotspot/user/profile/remove', `=.id=${profileId}`],
      ])
      return NextResponse.json({ ok: true })
    }

    const words: string[] = action === 'add'
      ? ['/ip/hotspot/user/profile/add']
      : ['/ip/hotspot/user/profile/set', `=.id=${profileId}`]

    if (name)           words.push(`=name=${name}`)
    if (rateLimit)      words.push(`=rate-limit=${rateLimit}`)
    if (sessionTimeout) words.push(`=session-timeout=${sessionTimeout}`)
    if (idleTimeout)    words.push(`=idle-timeout=${idleTimeout}`)
    if (sharedUsers)    words.push(`=shared-users=${sharedUsers}`)
    if (addressPool)    words.push(`=address-pool=${addressPool}`)

    await rosCmd(resolvedHost, creds.port, creds.username, creds.password, [words])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
