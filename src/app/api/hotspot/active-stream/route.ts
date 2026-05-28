import { NextRequest } from 'next/server'
import { rosCmd } from '@/lib/mikrotik'
import type { ActiveUser } from '@/types'

export async function POST(req: NextRequest) {
  const { host, port, username, password } = await req.json()

  const enc = new TextEncoder()
  const send = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`)

  const stream = new ReadableStream({
    async start(controller) {
      while (!req.signal.aborted) {
        try {
          const results = await rosCmd(host, Number(port) || 8728, username, password, [
            ['/ip/hotspot/active/print'],
          ])
          const users: ActiveUser[] = results[0]
            .filter((r) => r.type === '!re')
            .map((r) => ({
              id:               r.attrs['.id']               ?? '',
              user:             r.attrs['user']              ?? '',
              address:          r.attrs['address']           ?? '',
              macAddress:       r.attrs['mac-address']       ?? '',
              uptime:           r.attrs['uptime']            ?? '',
              idleTime:         r.attrs['idle-time']         ?? '',
              sessionTimeLeft:  r.attrs['session-time-left'] ?? '',
              bytesIn:          parseInt(r.attrs['bytes-in']  ?? '0', 10),
              bytesOut:         parseInt(r.attrs['bytes-out'] ?? '0', 10),
              server:           r.attrs['server']            ?? '',
            }))
          controller.enqueue(send({ users, ts: Date.now() }))
        } catch (err) {
          controller.enqueue(send({ error: (err as Error).message }))
        }

        // Wait 2 s (or abort early if client disconnects)
        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, 2000)
          req.signal.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
        })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
