import { NextRequest, NextResponse } from 'next/server'
import { rosCmd } from '@/lib/mikrotik'
import { customAlphabet } from 'nanoid'

const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', 8)

export async function POST(req: NextRequest) {
  const { host, port, username, password, quantity, profile, timeLimit, timeLimitLabel, amount } =
    await req.json()

  if (!host || !username || !password || !quantity || !profile) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const codes: string[] = Array.from({ length: Number(quantity) }, () => genCode())

  const commands = codes.map((code) => {
    const words = [
      '/ip/hotspot/user/add',
      `=name=${code}`,
      `=password=${code}`,
      `=profile=${profile}`,
    ]
    if (timeLimit && timeLimit !== 'unlimited') {
      words.push(`=limit-uptime=${timeLimit}`)
    }
    return words
  })

  try {
    await rosCmd(host, Number(port) || 8728, username, password, commands)

    const createdAt = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
    const vouchers = codes.map((code) => ({
      code,
      profile,
      timeLimit: timeLimit ?? '',
      timeLimitLabel: timeLimitLabel ?? timeLimit ?? '',
      amount: amount ?? '',
      createdAt,
    }))

    return NextResponse.json({ vouchers })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
