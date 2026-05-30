import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/')) {
    // ── CSRF / same-origin check ─────────────────────────────
    // Browsers always send Origin on cross-origin POST requests.
    // If Origin is present and doesn't match our host, reject.
    const origin = req.headers.get('origin')
    const host   = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''

    if (origin) {
      try {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          return new NextResponse(
            JSON.stringify({ error: 'Forbidden — cross-origin request rejected' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
          )
        }
      } catch {
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden — invalid origin' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    // ── Content-Type enforcement ──────────────────────────────
    // All our API routes expect JSON bodies on POST.
    if (req.method === 'POST') {
      const ct = req.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        return new NextResponse(
          JSON.stringify({ error: 'Content-Type must be application/json' }),
          { status: 415, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    // ── Method whitelist ─────────────────────────────────────
    // Only GET and POST are used; reject everything else.
    if (!['GET', 'POST'].includes(req.method)) {
      return new NextResponse(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET, POST' } },
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
