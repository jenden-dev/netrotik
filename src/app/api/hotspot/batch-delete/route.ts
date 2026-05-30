import { NextRequest, NextResponse } from 'next/server'
import { rosCmd, isMacAddress, resolveMacToIp } from '@/lib/mikrotik'
import { parseCreds } from '@/lib/validate'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = parseCreds(body)
  if ('error' in result) return result.error

  const { creds } = result
  const { codes }: { codes: string[] } = body

  if (!Array.isArray(codes) || codes.length === 0)
    return NextResponse.json({ error: 'No codes provided' }, { status: 400 })

  try {
    const resolvedHost = isMacAddress(creds.host) ? await resolveMacToIp(creds.host) : creds.host

    // Fetch all hotspot users to find matching IDs by name
    const listResult = await rosCmd(resolvedHost, creds.port, creds.username, creds.password, [
      ['/ip/hotspot/user/print'],
    ])

    const codeSet = new Set(codes)
    const matchedIds = listResult[0]
      .filter((r) => r.type === '!re' && codeSet.has(r.attrs['name']))
      .map((r) => r.attrs['.id'])
      .filter(Boolean)

    if (matchedIds.length === 0)
      return NextResponse.json({ deleted: 0, notFound: codes.length })

    // Delete each matched user by ID
    const deleteCommands = matchedIds.map((id) => ['/ip/hotspot/user/remove', `=.id=${id}`])
    await rosCmd(resolvedHost, creds.port, creds.username, creds.password, deleteCommands)

    return NextResponse.json({ deleted: matchedIds.length, notFound: codes.length - matchedIds.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
