import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { SCENES, sceneUsesTerminal } from './content/scenes'
import { gateReason, preflightChecks, type Preflight } from './preflight'
import { Stage } from './Stage'
import { TerminalDeck } from './TerminalDeck'
import { typeLines } from './terminalBus'

const LAST = SCENES.length - 1
const ZOOM_STEPS = [0.9, 1, 1.1, 1.2, 1.3, 1.45, 1.6]
const ZOOM_KEY = 'showcase-zoom'

function initialZoom() {
  const saved = Number(window.localStorage.getItem(ZOOM_KEY))
  if (ZOOM_STEPS.includes(saved)) return saved
  return window.innerWidth >= 1800 ? 1.2 : 1
}

function stepZoom(current: number, direction: 1 | -1) {
  const index = ZOOM_STEPS.indexOf(current)
  const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, (index < 0 ? 1 : index) + direction))]
  window.localStorage.setItem(ZOOM_KEY, String(next))
  return next
}

export function App() {
  const [index, setIndex] = useState(0)
  const [notesOpen, setNotesOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [preflight, setPreflight] = useState<Preflight | null>(null)
  const [serverDown, setServerDown] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(initialZoom)
  const scene = SCENES[index]
  const usesTerminal = sceneUsesTerminal(scene)
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
      const active = document.activeElement
      if (active instanceof HTMLElement && active.closest('.terminal-deck, .xterm, textarea')) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('.terminal-deck, .xterm, textarea, input')) return

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
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        setZoom((current) => stepZoom(current, 1))
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        setZoom((current) => stepZoom(current, -1))
      } else if (event.key === '0') {
        event.preventDefault()
        window.localStorage.removeItem(ZOOM_KEY)
        setZoom(1)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [helpOpen])

  async function onRun(actionId: string) {
    if (blocked || sending) return
    const replay = actionId.startsWith('replay:') ? actionId.slice('replay:'.length) : null
    const action = scene.actions.find((item) => item.id === actionId)
    const session = action?.session ?? (replay ? scene.window : null)
    const lines = action?.lines ?? (replay ? [`.\\.venv\\Scripts\\python.exe evals\\run_evals.py --replay "evals\\recordings\\${replay}"`] : null)
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
    <div className={notesOpen ? 'shell with-notes' : 'shell'} style={{ '--zoom': zoom } as CSSProperties}>
      <nav className="rail" aria-label="Run of show">
        <p className="brand">
          QA × Claude
          <span>Run of show</span>
        </p>
        <ol>
          {SCENES.map((item, itemIndex) => {
            const showGroup = itemIndex === 0 || item.group !== SCENES[itemIndex - 1].group
            return (
              <li key={item.id}>
                {showGroup ? <p className="nav-group">{item.group}</p> : null}
                <button
                  type="button"
                  className={itemIndex === index ? 'active' : undefined}
                  aria-current={itemIndex === index ? 'step' : undefined}
                  onClick={() => setIndex(itemIndex)}
                >
                  {item.nav}
                  {item.canCut && notesOpen ? <span className="cut-tag">can cut</span> : null}
                </button>
              </li>
            )
          })}
        </ol>
        <p className="rail-hint">
          <span>
            {index + 1} of {SCENES.length}
          </span>
          <Pace index={index} />
        </p>
      </nav>
      <button type="button" className="rail-resize" aria-label="Resize navigation" onPointerDown={onRailResize} />

      <div className={usesTerminal ? 'column' : 'column no-terminal'}>
        <PreflightStrip preflight={preflight} serverDown={serverDown} />
        <main>
          <Stage scene={scene} preflight={preflight} blocked={blocked} sending={sending} onRun={(id) => void onRun(id)} />
          {runError ? <p className="gate run-error">{runError}</p> : null}
        </main>
        <TerminalDeck active={usesTerminal ? scene.window : null} fontSize={Math.round(16 * zoom)} />
        {notesOpen ? (
          <aside className="notes" aria-label="Speaker notes">
            <p className="notes-label">Speaker</p>
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
                <kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd> Larger, smaller, reset text
              </li>
              <li>
                <kbd>?</kbd> This help
              </li>
            </ul>
            <p>Run types the next command. Approve edits in the terminal. The terminal follows new output; scroll up to pause, then choose Latest output.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function onRailResize(event: ReactPointerEvent<HTMLButtonElement>) {
  const shell = event.currentTarget.parentElement
  if (!shell) return
  event.preventDefault()
  const rail = shell.querySelector('.rail')
  if (!rail) return
  const startX = event.clientX
  const startW = rail.getBoundingClientRect().width
  const move = (ev: PointerEvent) => {
    const next = Math.min(480, Math.max(220, startW + ev.clientX - startX))
    shell.style.setProperty('--rail-w', `${Math.round(next)}px`)
  }
  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
}

function minutesOf(hhmm: string) {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return hours * 60 + minutes
}

function Pace({ index }: { index: number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 20000)
    return () => window.clearInterval(timer)
  }, [])

  const scene = SCENES[index]
  const planned = minutesOf(scene.at)
  const next = SCENES.slice(index + 1).find((item) => minutesOf(item.at) > planned)
  const current = now.getHours() * 60 + now.getMinutes()
  const clock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const duringTalk = current >= minutesOf(SCENES[0].at) - 30 && current <= minutesOf(SCENES[LAST].at) + 60
  if (!duringTalk) return <span title="Planned start for this scene">Planned {scene.at}</span>

  const late = next ? current - minutesOf(next.at) : 0
  return (
    <span className={late > 0 ? 'pace late' : 'pace'} title={`Planned ${scene.at}${next ? `, next section ${next.at}` : ''}`}>
      {clock} · {late > 0 ? `${late} min behind` : 'on time'}
    </span>
  )
}

function PreflightStrip({ preflight, serverDown }: { preflight: Preflight | null; serverDown: boolean }) {
  const [open, setOpen] = useState(false)
  if (serverDown) return <div className="preflight bad">Terminal server is not running. Restart npm run showcase.</div>
  if (!preflight) return <div className="preflight">Checking this laptop…</div>
  const checks = preflightChecks(preflight)
  const failing = checks.filter((check) => !check.ok)
  const pending = preflight.playwright === 'pending'
  const summary = pending ? 'Checking…' : failing.length === 0 ? 'Ready' : `${failing.length} to check`
  const tone = pending ? 'pending' : failing.length === 0 ? 'ok' : 'warn'
  return (
    <div className={open ? 'preflight is-open' : 'preflight'}>
      <button
        type="button"
        className={`status-pill ${tone}`}
        aria-expanded={open}
        title={failing.map((check) => check.label).join(' · ') || 'All checks passed'}
        onClick={() => setOpen((value) => !value)}
      >
        <i className="status-dot" />
        {summary}
      </button>
      {open ? (
        <>
          {checks.map((check) => (
            <span key={check.label} className={check.ok ? 'chip ok' : 'chip'}>
              {check.label}
            </span>
          ))}
          <button
            type="button"
            className="chip recheck"
            disabled={pending}
            onClick={() => void fetch('/api/preflight/refresh', { method: 'POST' })}
          >
            Check again
          </button>
        </>
      ) : null}
    </div>
  )
}
