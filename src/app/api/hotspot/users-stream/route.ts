import { NextRequest } from 'next/server'
import { isMacAddress, resolveMacToIp, rosCmd } from '@/lib/mikrotik'
import type { HotspotUser } from '@/types'

// Only fetch fields we actually display — critical for routers with 50k+ users
const PROPLIST = '.id,name,profile,limit-uptime,uptime,bytes-in,bytes-out,disabled,comment'

export async function POST(req: NextRequest) {
  const { host, port, username, password } = await req.json()

  const enc = new TextEncoder()
  const send = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`)

  const stream = new ReadableStream({
    async start(controller) {
      let resolvedHost = host
      try {
        if (isMacAddress(host)) resolvedHost = await resolveMacToIp(host)
      } catch (err) {
        controller.enqueue(send({ error: (err as Error).message }))
        controller.close()
        return
      }

      let firstLoad = true

      while (!req.signal.aborted) {
        // Tell client we are fetching so it can show a loading bar
        if (firstLoad) controller.enqueue(send({ loading: true }))

        try {
          const results = await rosCmd(resolvedHost, Number(port) || 8728, username, password, [
            ['/ip/hotspot/user/print', `=.proplist=${PROPLIST}`],
          ])
          const users: HotspotUser[] = results[0]
            .filter((r) => r.type === '!re')
            .map((r) => ({
              id:          r.attrs['.id']          ?? '',
              name:        r.attrs['name']         ?? '',
              password:    r.attrs['password']     ?? '',
              profile:     r.attrs['profile']      ?? '',
              limitUptime: r.attrs['limit-uptime'] ?? '',
              uptime:      r.attrs['uptime']       ?? '',
              bytesIn:     parseInt(r.attrs['bytes-in']  ?? '0', 10),
              bytesOut:    parseInt(r.attrs['bytes-out'] ?? '0', 10),
              disabled:    r.attrs['disabled'] === 'true',
              comment:     r.attrs['comment']      ?? '',
            }))
          controller.enqueue(send({ users, loading: false, ts: Date.now() }))
        } catch (err) {
          controller.enqueue(send({ error: (err as Error).message, loading: false }))
        }

        firstLoad = false

        // Poll every 60 s — users list doesn't change every 5 s
        // Abort early if client disconnects
        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, 60_000)
          req.signal.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
        })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
