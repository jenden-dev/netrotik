import { NextResponse } from 'next/server'

export interface Creds {
  host: string
  port: number
  username: string
  password: string
}

export function parseCreds(body: Record<string, unknown>): { creds: Creds } | { error: NextResponse } {
  const { host, port, username, password } = body

  if (!host || typeof host !== 'string' || host.trim().length === 0 || host.length > 255)
    return { error: NextResponse.json({ error: 'Invalid host' }, { status: 400 }) }

  if (!username || typeof username !== 'string' || username.trim().length === 0 || username.length > 64)
    return { error: NextResponse.json({ error: 'Invalid username' }, { status: 400 }) }

  if (password !== undefined && typeof password !== 'string')
    return { error: NextResponse.json({ error: 'Invalid password' }, { status: 400 }) }

  const portNum = Number(port)
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535)
    return { error: NextResponse.json({ error: 'Invalid port' }, { status: 400 }) }

  return {
    creds: {
      host: host.trim(),
      port: portNum,
      username: username.trim(),
      password: typeof password === 'string' ? password : '',
    },
  }
}
