import { NextRequest } from 'next/server'
import { isMacAddress, resolveMacToIp, rosCmdWithProgress } from '@/lib/mikrotik'
import { parseCreds } from '@/lib/validate'
import { customAlphabet } from 'nanoid'

const CHAR_SETS: Record<string, string> = {
  alphanumeric: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',
  numeric:      '0123456789',
  alpha:        'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz',
  uppercase:    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = parseCreds(body)
  if ('error' in result) return result.error

  const { creds } = result
  const { host, port, username, password } = creds
  const {
    quantity, profile, timeLimit, timeLimitLabel, amount,
    server, nameLength, characters, customChars, dataLimit, comment,
  } = body

  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > 3000)
    return Response.json({ error: 'Quantity must be 1–3000' }, { status: 400 })
  if (!profile || typeof profile !== 'string' || profile.length > 64)
    return Response.json({ error: 'Invalid profile' }, { status: 400 })

  const len = Math.min(Math.max(Number(nameLength) || 8, 4), 12)
  const charSet = characters === 'custom'
    ? (typeof customChars === 'string' && customChars.trim().length >= 2 ? customChars.trim() : null)
    : (CHAR_SETS[characters as string] ?? CHAR_SETS.alphanumeric)
  if (!charSet)
    return Response.json({ error: 'Custom character set must have at least 2 characters' }, { status: 400 })

  const genCode = customAlphabet(charSet, len)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const resolvedHost = isMacAddress(host) ? await resolveMacToIp(host) : host

        const codes: string[] = Array.from({ length: qty }, () => genCode())

        const commands = codes.map((code) => {
          const words = [
            '/ip/hotspot/user/add',
            `=name=${code}`,
            `=password=${code}`,
            `=profile=${profile}`,
          ]
          if (server)    words.push(`=server=${server}`)
          if (timeLimit && timeLimit !== 'unlimited') words.push(`=limit-uptime=${timeLimit}`)
          if (dataLimit) words.push(`=limit-bytes-total=${dataLimit}`)
          if (comment)   words.push(`=comment=${comment}`)
          else if (amount) words.push(`=comment=₱${amount}`)
          return words
        })

        await rosCmdWithProgress(
          resolvedHost,
          Number(port) || 8728,
          username,
          password ?? '',
          commands,
          (done, total) => send({ progress: done, total })
        )

        const createdAt = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
        const vouchers = codes.map((code) => ({
          code,
          profile,
          timeLimit: timeLimit ?? '',
          timeLimitLabel: timeLimitLabel ?? timeLimit ?? '',
          amount: amount ?? '',
          createdAt,
        }))

        send({ done: true, vouchers, createdAt })
        controller.close()
      } catch (err) {
        send({ error: (err as Error).message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
