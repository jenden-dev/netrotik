import { Socket } from 'net'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export function isMacAddress(host: string): boolean {
  return /^([0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}$/.test(host)
}

function normalizeMac(mac: string): string {
  return mac.toLowerCase().replace(/-/g, ':')
}

export async function resolveMacToIp(mac: string): Promise<string> {
  const needle = normalizeMac(mac)
  try {
    const { stdout } = await execAsync('arp -a')
    for (const line of stdout.split('\n')) {
      if (normalizeMac(line).includes(needle)) {
        // macOS/Linux: ? (192.168.x.x) at ...
        // Windows:  192.168.x.x   48-a9-... dynamic
        const match = line.match(/\(?([\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3})\)?/)
        if (match) return match[1]
      }
    }
    throw new Error(
      `Router with MAC ${mac} not found in ARP table. ` +
      `Make sure the router is on the same network, or use its IP address directly.`
    )
  } catch (err) {
    if ((err as Error).message.includes('not found in ARP')) throw err
    throw new Error('ARP lookup failed: ' + (err as Error).message)
  }
}

export interface RosResponse {
  type: string
  attrs: Record<string, string>
}

class RosSocket {
  private sock: Socket
  private buf: Buffer = Buffer.alloc(0)
  private pendingRead: { n: number; resolve: (buf: Buffer) => void } | null = null

  constructor(private host: string, private port: number, private timeout = 8000) {
    this.sock = new Socket()
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sock.setTimeout(this.timeout)
      this.sock.on('data', (chunk: Buffer) => {
        this.buf = Buffer.concat([this.buf, chunk])
        this.processRead()
      })
      this.sock.on('error', reject)
      this.sock.on('timeout', () => {
        this.sock.destroy()
        reject(new Error('Connection timed out — check IP and port'))
      })
      this.sock.connect(this.port, this.host, resolve)
    })
  }

  private processRead() {
    if (!this.pendingRead) return
    if (this.buf.length >= this.pendingRead.n) {
      const { n, resolve } = this.pendingRead
      this.pendingRead = null
      const result = Buffer.from(this.buf.slice(0, n))
      this.buf = this.buf.slice(n)
      resolve(result)
    }
  }

  private readBytes(n: number): Promise<Buffer> {
    return new Promise((resolve) => {
      if (n === 0) { resolve(Buffer.alloc(0)); return }
      if (this.buf.length >= n) {
        const result = Buffer.from(this.buf.slice(0, n))
        this.buf = this.buf.slice(n)
        resolve(result)
      } else {
        this.pendingRead = { n, resolve }
      }
    })
  }

  async readWord(): Promise<string> {
    const first = await this.readBytes(1)
    const b = first[0]
    let length: number

    if ((b & 0x80) === 0) {
      length = b
    } else if ((b & 0xc0) === 0x80) {
      const rest = await this.readBytes(1)
      length = ((b & 0x3f) << 8) | rest[0]
    } else if ((b & 0xe0) === 0xc0) {
      const rest = await this.readBytes(2)
      length = ((b & 0x1f) << 16) | (rest[0] << 8) | rest[1]
    } else if ((b & 0xf0) === 0xe0) {
      const rest = await this.readBytes(3)
      length = ((b & 0x0f) << 24) | (rest[0] << 16) | (rest[1] << 8) | rest[2]
    } else {
      const rest = await this.readBytes(4)
      length = (rest[0] << 24) | (rest[1] << 16) | (rest[2] << 8) | rest[3]
    }

    if (length === 0) return ''
    const word = await this.readBytes(length)
    return word.toString('utf8')
  }

  async readSentence(): Promise<string[]> {
    const words: string[] = []
    for (;;) {
      const word = await this.readWord()
      if (word === '') break
      words.push(word)
    }
    return words
  }

  parseSentence(words: string[]): RosResponse {
    const type = words[0] ?? ''
    const attrs: Record<string, string> = {}
    for (const w of words.slice(1)) {
      if (w.startsWith('=')) {
        const idx = w.indexOf('=', 1)
        if (idx !== -1) attrs[w.slice(1, idx)] = w.slice(idx + 1)
      }
    }
    return { type, attrs }
  }

  async readResponses(): Promise<RosResponse[]> {
    const responses: RosResponse[] = []
    for (;;) {
      const words = await this.readSentence()
      const resp = this.parseSentence(words)
      responses.push(resp)
      if (resp.type === '!done' || resp.type === '!fatal') break
    }
    return responses
  }

  writeWords(words: string[]): void {
    const bufs: Buffer[] = []
    for (const word of words) {
      const wb = Buffer.from(word, 'utf8')
      const len = wb.length
      let lenBuf: Buffer
      if (len < 0x80) {
        lenBuf = Buffer.from([len])
      } else if (len < 0x4000) {
        lenBuf = Buffer.from([0x80 | (len >> 8), len & 0xff])
      } else if (len < 0x200000) {
        lenBuf = Buffer.from([0xc0 | (len >> 16), (len >> 8) & 0xff, len & 0xff])
      } else {
        lenBuf = Buffer.from([0xe0 | (len >> 24), (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff])
      }
      bufs.push(lenBuf, wb)
    }
    bufs.push(Buffer.from([0]))
    this.sock.write(Buffer.concat(bufs))
  }

  close(): void {
    this.sock.destroy()
  }
}

export async function rosCmdWithProgress(
  host: string,
  port: number,
  user: string,
  pass: string,
  commands: string[][],
  onProgress: (done: number, total: number) => void
): Promise<RosResponse[][]> {
  const ros = new RosSocket(host, port)
  await ros.connect()
  try {
    ros.writeWords(['/login', `=name=${user}`, `=password=${pass}`])
    const loginResp = await ros.readResponses()
    const loginTrap = loginResp.find((r) => r.type === '!trap')
    if (loginTrap) throw new Error(loginTrap.attrs.message || 'Login failed — check credentials')

    const results: RosResponse[][] = []
    for (let i = 0; i < commands.length; i++) {
      ros.writeWords(commands[i])
      const resp = await ros.readResponses()
      const trap = resp.find((r) => r.type === '!trap')
      if (trap) throw new Error(trap.attrs.message || `Command failed: ${commands[i][0]}`)
      results.push(resp)
      onProgress(i + 1, commands.length)
    }
    return results
  } finally {
    ros.close()
  }
}

export async function rosCmd(
  host: string,
  port: number,
  user: string,
  pass: string,
  commands: string[][]
): Promise<RosResponse[][]> {
  const ros = new RosSocket(host, port)
  await ros.connect()
  try {
    ros.writeWords(['/login', `=name=${user}`, `=password=${pass}`])
    const loginResp = await ros.readResponses()
    const loginTrap = loginResp.find((r) => r.type === '!trap')
    if (loginTrap) throw new Error(loginTrap.attrs.message || 'Login failed — check credentials')

    const results: RosResponse[][] = []
    for (const cmd of commands) {
      ros.writeWords(cmd)
      const resp = await ros.readResponses()
      const trap = resp.find((r) => r.type === '!trap')
      if (trap) throw new Error(trap.attrs.message || `Command failed: ${cmd[0]}`)
      results.push(resp)
    }
    return results
  } finally {
    ros.close()
  }
}
