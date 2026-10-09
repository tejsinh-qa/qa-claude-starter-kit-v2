import { useEffect, useState } from 'react'
import { SCENES } from './content/scenes'
import { gateReason, type Preflight } from './preflight'
import { Stage } from './Stage'
import { TerminalDeck } from './TerminalDeck'
import { typeLines } from './terminalBus'

const LAST = SCENES.length - 1

export function App() {
  const [index, setIndex] = useState(0)
  const [notesOpen, setNotesOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [preflight, setPreflight] = useState<Preflight | null>(null)
  const [serverDown, setServerDown] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const scene = SCENES[index]
  const blocked = gateReason(preflight, serverDown)

  useEffect(() => {
    let stopped = false
    async function poll() {
      try {
        const response = await fetch('/api/preflight')
        if (!response.ok) throw new Error('bad status')
        const body = (await response.json()) as Preflight
        if (!stopped) {
          setPreflight(body)
          setServerDown(false)
        }
      } catch {
        if (!stopped) setServerDown(true)
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 3000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('.xterm, input, textarea')) return

      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault()
        setHelpOpen((open) => !open)
        return
      }
      if (event.key === 'Escape') {
        setHelpOpen(false)
        return
      }
      if (helpOpen) return

      if (event.key === 'ArrowRight' || event.key === 'j' || event.key === 'J') {
        event.preventDefault()
        setIndex((current) => Math.min(LAST, current + 1))
      } else if (event.key === 'ArrowLeft' || event.key === 'k' || event.key === 'K') {
        event.preventDefault()
        setIndex((current) => Math.max(0, current - 1))
      } else if (event.key === 'Home') {
        event.preventDefault()
        setIndex(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        setIndex(LAST)
      } else if (event.key === 's' || event.key === 'S') {
        event.preventDefault()
        setNotesOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [helpOpen])

  async function onRun(actionId: string) {
    if (blocked || sending) return
    const replay = actionId.startsWith('replay:') ? actionId.slice('replay:'.length) : null
    const action = scene.actions.find((item) => item.id === actionId)
    const session = action?.session ?? (replay ? scene.session : null)
    const lines = action?.lines ?? (replay ? [`python evals/run_evals.py --replay "evals/recordings/${replay}"`] : null)
    if (!session || !lines) return
    if (replay && (replay.includes('..') || replay.includes('/') || replay.includes('\\') || replay === 'sample_run.json')) return
    setRunError(null)
    setSending(actionId)
    try {
      await typeLines(session, lines)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Could not type into the terminal')
    } finally {
      setSending(null)
    }
  }

  return (
    <div className={notesOpen ? 'shell with-notes' : 'shell'}>
      <nav className="rail" aria-label="Run of show">
        <p className="brand">
          QA × Claude
          <span>Run of show</span>
        </p>
        <ol>
          {SCENES.map((item, itemIndex) => (
            <li key={item.id}>
              <button
                type="button"
                className={itemIndex === index ? 'active' : undefined}
                aria-current={itemIndex === index ? 'step' : undefined}
                onClick={() => setIndex(itemIndex)}
              >
                <span className="nav-n">{String(itemIndex + 1).padStart(2, '0')}</span>
                {item.nav}
              </button>
            </li>
          ))}
        </ol>
        <p className="rail-hint">← → · S notes · ? help</p>
      </nav>

      <div className={scene.session ? 'column' : 'column no-terminal'}>
        <PreflightStrip preflight={preflight} serverDown={serverDown} />
        <main>
          <Stage scene={scene} preflight={preflight} blocked={blocked} sending={sending} onRun={(id) => void onRun(id)} />
          {runError ? <p className="gate">{runError}</p> : null}
          <p className="progress">
            {index + 1} / {SCENES.length}
          </p>
        </main>
        <TerminalDeck active={scene.session} />
        {notesOpen ? (
          <aside className="notes" aria-label="Speaker notes">
            <p className="kicker">Speaker</p>
            <p>{scene.notes}</p>
          </aside>
        ) : null}
      </div>

      {helpOpen ? (
        <div className="help-backdrop" role="presentation" onClick={() => setHelpOpen(false)}>
          <div
            className="help"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="help-title">On stage</h2>
            <ul>
              <li>
                <kbd>→</kbd> <kbd>J</kbd> Next scene
              </li>
              <li>
                <kbd>←</kbd> <kbd>K</kbd> Previous scene
              </li>
              <li>
                <kbd>Home</kbd> <kbd>End</kbd> First and last
              </li>
              <li>
                <kbd>S</kbd> Speaker notes
              </li>
              <li>
                <kbd>?</kbd> This help
              </li>
            </ul>
            <p>Run types the next command. Approve edits in the terminal. Keys typed in the terminal stay there.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PreflightStrip({ preflight, serverDown }: { preflight: Preflight | null; serverDown: boolean }) {
  if (serverDown) return <p className="preflight bad">Terminal server is not running.</p>
  if (!preflight) return <p className="preflight">Checking this laptop…</p>
  return (
    <p className="preflight">
      <Chip ok={preflight.claudeOnPath} label={preflight.claudeOnPath ? 'claude on PATH' : 'claude missing'} />
      <Chip ok={preflight.demoStart} label={preflight.demoStart ? 'demo-start' : 'no demo-start tag'} />
      <Chip
        ok={preflight.playwright === 'pass'}
        label={
          preflight.playwright === 'pending'
            ? 'Playwright running'
            : preflight.playwright === 'pass'
              ? preflight.playwrightSummary
              : 'Playwright failed'
        }
      />
      <Chip ok={preflight.agentKey === 'ready'} label={preflight.agentKey === 'ready' ? 'agent key ready' : 'ANTHROPIC_API_KEY in .env'} />
      <Chip ok={preflight.evalsKey === 'ready'} label={preflight.evalsKey === 'ready' ? 'evals key ready' : 'same .env key for evals'} />
    </p>
  )
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? 'chip ok' : 'chip'}>{label}</span>
}
