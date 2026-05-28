import { NextRequest, NextResponse } from 'next/server'
import { rosCmd, isMacAddress, resolveMacToIp } from '@/lib/mikrotik'
import { rateLimit } from '@/lib/rateLimit'

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function validateCreds(host: unknown, port: unknown, username: unknown, password: unknown): string | null {
  if (!host || typeof host !== 'string' || host.trim().length === 0 || host.length > 255)
    return 'Invalid host'
  if (!username || typeof username !== 'string' || username.trim().length === 0 || username.length > 64)
    return 'Invalid username'
  if (password !== undefined && password !== null && typeof password !== 'string')
    return 'Invalid password'
  if ((password as string)?.length > 128)
    return 'Password too long'
  const portNum = Number(port)
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535)
    return 'Invalid port (must be 1–65535)'
  return null
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  // Rate-limit: 10 attempts per IP per minute
  const rl = rateLimit(`login:${ip}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rl.resetIn}s.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.resetIn),
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  const body = await req.json()
  const { host, port, username, password } = body

  const validationError = validateCreds(host, port, username, password)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  try {
    const resolvedHost = isMacAddress(host) ? await resolveMacToIp(host) : host
    await rosCmd(resolvedHost, Number(port), username, password ?? '', [])
    return NextResponse.json({ success: true, resolvedHost })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 })
  }
}
