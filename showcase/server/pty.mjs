/**
 * Local-only terminals for the talk. Three PowerShell sessions.
 * Never logs input, and never puts ANTHROPIC_API_KEY in a response.
 */
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pty from 'node-pty'
import { WebSocketServer } from 'ws'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const port = 5174
const sessions = new Map()

function readDotEnv(file) {
  if (!fs.existsSync(file)) return {}
  const found = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    found[key] = value
  }
  return found
}

function claudeKey(...candidates) {
  for (const value of candidates) {
    if (typeof value === 'string' && value.startsWith('sk-ant-')) return value
  }
  return ''
}

const apiKey = claudeKey(readDotEnv(path.join(repoRoot, '.env')).ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY)
const keyReady = apiKey.length > 0

const state = {
  claudeOnPath: false,
  demoStart: false,
  playwright: 'pending',
  playwrightSummary: 'Running the seed tests…',
  agentKey: keyReady ? 'ready' : 'missing',
  evalsKey: keyReady ? 'ready' : 'missing',
  recordings: [],
}

function stringEnv(source) {
  const env = {}
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') env[key] = value
  }
  return env
}

function redact(text) {
  return text.replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, 'sk-ant-…')
}

function listRecordings() {
  const dir = path.join(repoRoot, 'evals', 'recordings')
  if (!fs.existsSync(dir)) return []
  const names = []
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json') || name === 'sample_run.json') continue
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))
      if (data?.meta?.illustrative === true) continue
      names.push(name)
    } catch {
      // Skip files that are not recordings.
    }
  }
  return names.sort()
}

function run(command, args, shell = false) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd: repoRoot, timeout: 180000, windowsHide: true, shell }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout ?? ''),
        stderr: String(stderr ?? ''),
      })
    })
  })
}

async function refreshChecks() {
  state.recordings = listRecordings()
  const claude = await run('where.exe', ['claude'])
  state.claudeOnPath = claude.ok && claude.stdout.trim().length > 0
  const tag = await run('git', ['tag', '--list', 'demo-start'])
  state.demoStart = tag.ok && tag.stdout.trim() === 'demo-start'
  const tests = await run('cmd.exe', ['/d', '/s', '/c', 'npx playwright test'])
  const combined = redact(`${tests.stdout}\n${tests.stderr}`).trim()
  const lines = combined.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const passed = lines.find((line) => /\d+\s+passed/.test(line))
  state.playwright = tests.ok ? 'pass' : 'fail'
  state.playwrightSummary = (passed ?? lines.at(-1) ?? (tests.ok ? 'passed' : 'failed')).slice(0, 240)
}

function openSession(name) {
  const env = stringEnv(process.env)
  delete env.ANTHROPIC_API_KEY
  if (name !== 'main' && keyReady) env.ANTHROPIC_API_KEY = apiKey
  const shell = pty.spawn('powershell.exe', ['-NoLogo', '-NoExit'], {
    name: 'xterm-256color',
    cols: 120,
    rows: 28,
    cwd: repoRoot,
    env,
    useConpty: true,
  })
  const clients = new Set()
  let scrollback = ''
  shell.onData((data) => {
    scrollback = (scrollback + data).slice(-200000)
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(data)
    }
  })
  sessions.set(name, { shell, clients, replay: () => scrollback })
}

for (const name of ['main', 'agent', 'evals']) openSession(name)

const wss = new WebSocketServer({ noServer: true })
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  if (req.method === 'GET' && url.pathname === '/api/preflight') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(state))
    return
  }
  res.statusCode = 404
  res.end()
})

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const name = url.searchParams.get('session')
  const session = name ? sessions.get(name) : undefined
  if (url.pathname !== '/pty' || !session) {
    socket.destroy()
    return
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    session.clients.add(ws)
    const prior = session.replay()
    if (prior) ws.send(prior)
    ws.on('message', (buf) => {
      let msg
      try {
        msg = JSON.parse(buf.toString())
      } catch {
        return
      }
      if (msg.t === 'in' && typeof msg.d === 'string') session.shell.write(msg.d)
      if (msg.t === 'resize' && Number.isInteger(msg.cols) && Number.isInteger(msg.rows)) {
        if (msg.cols > 0 && msg.rows > 0) session.shell.resize(msg.cols, msg.rows)
      }
    })
    ws.on('close', () => session.clients.delete(ws))
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`pty server on 127.0.0.1:${port}`)
  refreshChecks().catch((error) => {
    state.playwright = 'fail'
    state.playwrightSummary = 'Preflight could not finish'
    console.error(error instanceof Error ? error.message : 'preflight failed')
  })
})

function shutdown() {
  for (const session of sessions.values()) {
    try {
      session.shell.kill()
    } catch {
      // The shell may already be gone.
    }
  }
  server.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
