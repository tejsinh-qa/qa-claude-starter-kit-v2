export type SessionName = 'main' | 'agent' | 'evals'

type Slot = {
  send: (data: string) => void
}

const slots = new Map<SessionName, Slot>()
const claudeOpen: Record<SessionName, boolean> = { main: false, agent: false, evals: false }
const recent: Record<SessionName, { text: string; at: number }> = {
  main: { text: '', at: 0 },
  agent: { text: '', at: 0 },
  evals: { text: '', at: 0 },
}

export function attachSession(name: SessionName, send: (data: string) => void) {
  slots.set(name, { send })
}

/** Called for every chunk the terminal prints, so typing can wait for the screen instead of a fixed delay. */
export function noteOutput(name: SessionName, data: string) {
  const entry = recent[name]
  entry.text = (entry.text + data).slice(-20000)
  entry.at = Date.now()
}

function plain(text: string) {
  return text.replace(/\x1b\[[0-9;?>=]*[ -/]*[@-~]/g, '').replace(/\x1b\][^\x07]*\x07/g, '')
}

async function waitForQuiet(name: SessionName, quietMs: number, maxMs: number) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (Date.now() - recent[name].at >= quietMs) return
    await wait(100)
  }
}

/** Whichever was drawn last wins: Claude's footer, or a PowerShell prompt. Survives a page reload. */
function claudeOnScreen(name: SessionName): boolean | null {
  const screen = plain(recent[name].text.slice(-6000))
  const footer = Math.max(
    screen.lastIndexOf('shift+tab'),
    screen.lastIndexOf('for shortcuts'),
    screen.lastIndexOf('esc to interrupt'),
  )
  let lastShell = -1
  for (const match of screen.matchAll(/PS [A-Za-z]:\\[^\n>]*>/g)) lastShell = match.index
  if (footer < 0 && lastShell < 0) return null
  return footer > lastShell
}

/** Claude Code takes 5–20 s to boot. Its input box is ready once the footer hint is drawn. */
async function waitForClaudePrompt(name: SessionName, maxMs: number) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const screen = plain(recent[name].text)
    if (/Try "|for shortcuts|shift\+tab/.test(screen)) break
    await wait(200)
  }
  await waitForQuiet(name, 600, 4000)
}

export function detachSession(name: SessionName) {
  slots.delete(name)
}

export function sessionReady(name: SessionName) {
  return slots.has(name)
}

const INSPECTION = new Set(['/memory', '/hooks', '/agents', '/', '/exit'])

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isPowerShell(line: string) {
  return /^(mv |npx |python |git |Get-Content|dir |\$|Clear-Host|\.\\)/.test(line) || line.includes('| python')
}

function isProse(line: string) {
  return line !== 'claude' && !line.startsWith('/') && !isPowerShell(line)
}

function isFreshClaudeTask(line: string) {
  return isProse(line) || (line.startsWith('/') && !INSPECTION.has(line))
}

/** Text and Enter must be separate writes. One chunk is pasted and sits there until Enter. */
async function submit(slot: Slot, line: string) {
  if (line.length > 0) slot.send(line)
  await wait(line.length > 80 ? 500 : 250)
  slot.send('\r')
}

/** A prompt to Claude: Enter only after the text is drawn, and once more if nothing started. */
async function submitToClaude(name: SessionName, slot: Slot, line: string) {
  slot.send(line)
  await wait(300)
  await waitForQuiet(name, 400, 3000)
  const before = recent[name].at
  slot.send('\r')
  await wait(1800)
  if (recent[name].at <= before + 50 || Date.now() - recent[name].at > 1500) {
    slot.send('\r')
  }
}

export async function typeLines(name: SessionName, lines: string[]) {
  const slot = slots.get(name)
  if (!slot) throw new Error('That terminal is not connected yet.')

  const seen = claudeOnScreen(name)
  if (seen !== null) claudeOpen[name] = seen

  let queue = lines
  if (name === 'main' && !claudeOpen[name] && queue.length > 0 && isFreshClaudeTask(queue[0])) {
    queue = ['claude', ...queue]
  }
  if (claudeOpen[name] && queue.some(isPowerShell)) {
    await submit(slot, '/exit')
    await wait(1600)
    claudeOpen[name] = false
    await submit(slot, 'Clear-Host')
    await wait(400)
    if (queue[0] === '/exit') queue = queue.slice(1)
  } else if (claudeOpen[name] && queue.includes('claude')) {
    await submit(slot, '/exit')
    await wait(1600)
    claudeOpen[name] = false
    await submit(slot, 'Clear-Host')
    await wait(400)
  } else if (claudeOpen[name] && queue.some(isFreshClaudeTask)) {
    await submit(slot, '/clear')
    await wait(1200)
  } else if (!claudeOpen[name] && queue.includes('claude')) {
    await submit(slot, 'Clear-Host')
    await wait(400)
  }

  for (const line of queue) {
    if (claudeOpen[name] && isFreshClaudeTask(line)) {
      await submitToClaude(name, slot, line)
      continue
    }
    if (line === 'claude') recent[name].text = ''
    await submit(slot, line)
    if (line === 'claude') {
      await waitForClaudePrompt(name, 30000)
      claudeOpen[name] = true
    } else if (line === '/exit') {
      await wait(1600)
      claudeOpen[name] = false
    } else if (line === '/clear') {
      await wait(1200)
    } else {
      await wait(350)
    }
  }
}
