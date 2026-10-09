import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { attachSession, detachSession, noteOutput, type SessionName } from './terminalBus'

const SESSIONS: SessionName[] = ['main', 'agent', 'evals']

const LABELS: Record<SessionName, string> = {
  main: 'main · Claude Code · no API key',
  agent: 'agent · router, batch, triage',
  evals: 'evals · naive, then full',
}

const CLAUDE_THEME = {
  background: '#1c1b19',
  foreground: '#eceae4',
  cursor: '#d97757',
  cursorAccent: '#1c1b19',
  selectionBackground: 'rgba(217, 119, 87, 0.35)',
  selectionForeground: '#faf9f5',
  black: '#1c1b19',
  red: '#e06c75',
  green: '#8fbc7a',
  yellow: '#e5c07b',
  blue: '#61afef',
  magenta: '#c678dd',
  cyan: '#56b6c2',
  white: '#d4cfc7',
  brightBlack: '#6b6560',
  brightRed: '#ff7b72',
  brightGreen: '#b5d99c',
  brightYellow: '#f0d090',
  brightBlue: '#79b8ff',
  brightMagenta: '#d7a3e0',
  brightCyan: '#7fdbda',
  brightWhite: '#faf9f5',
}

export function TerminalDeck({ active, fontSize }: { active: SessionName | null; fontSize: number }) {
  const deckRef = useRef<HTMLElement>(null)

  function onResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    const column = deckRef.current?.parentElement
    const deck = deckRef.current
    if (!column || !deck) return
    event.preventDefault()
    const startY = event.clientY
    const startHeight = deck.getBoundingClientRect().height
    const move = (ev: PointerEvent) => {
      const next = Math.min(window.innerHeight * 0.78, Math.max(180, startHeight - (ev.clientY - startY)))
      column.style.setProperty('--terminal-h', `${Math.round(next)}px`)
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  return (
    <section
      ref={deckRef}
      className={active ? 'terminal-deck' : 'terminal-deck is-hidden'}
      aria-label="Demo terminal"
    >
      <button type="button" className="terminal-resize" aria-label="Resize terminal" onPointerDown={onResizeStart} />
      <div className="terminal-bar">
        <span className="term-brand">
          <i className="term-mark" />
          Claude Code
        </span>
        <span>{active ? LABELS[active] : 'No terminal for this demo'}</span>
        <span className="terminal-hint">Click to type. New output stays in view.</span>
      </div>
      {SESSIONS.map((name) => (
        <TerminalPane key={name} name={name} active={name === active} fontSize={fontSize} />
      ))}
    </section>
  )
}

function TerminalPane({ name, active, fontSize }: { name: SessionName; active: boolean; fontSize: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const stickRef = useRef(true)
  const activeRef = useRef(active)
  const [following, setFollowing] = useState(true)
  const [metrics, setMetrics] = useState({ y: 0, base: 0, rows: 1 })
  const fontSizeRef = useRef(fontSize)
  activeRef.current = active

  useEffect(() => {
    const host = ref.current
    if (!host) return

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      scrollback: 5000,
      fontSize: fontSizeRef.current,
      lineHeight: 1.2,
      fontFamily: '"Cascadia Mono", "Cascadia Code", "Segoe UI Mono", ui-monospace, monospace',
      theme: CLAUDE_THEME,
      scrollOnUserInput: true,
      smoothScrollDuration: 0,
      scrollSensitivity: 1,
      // ConPTY rewraps lines on resize itself; without this xterm rewraps them again and lines repeat.
      windowsPty: { backend: 'conpty', buildNumber: 26200 },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host)
    termRef.current = term
    fitRef.current = fit

    let socket: WebSocket | null = null
    let stopped = false
    let retry = 0

    const sendRaw = (data: string) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ t: 'in', d: data }))
      }
    }

    let pinning = false
    let lastCols = 0
    let lastRows = 0
    const pinToLatest = () => {
      pinning = true
      stickRef.current = true
      term.scrollToBottom()
      setFollowing(true)
      pinning = false
    }

    const sendResize = () => {
      if (!activeRef.current) return
      const keep = stickRef.current
      fit.fit()
      const cols = term.cols
      const rows = term.rows
      if (cols === lastCols && rows === lastRows) return
      lastCols = cols
      lastRows = rows
      if (keep) pinToLatest()
      if (socket && socket.readyState === WebSocket.OPEN && cols > 0 && rows > 0) {
        socket.send(JSON.stringify({ t: 'resize', cols, rows }))
      }
    }

    const connect = () => {
      if (stopped) return
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      socket = new WebSocket(`${proto}://${location.host}/pty?session=${name}`)
      socketRef.current = socket
      socket.onopen = () => {
        attachSession(name, (data) => {
          term.focus()
          sendRaw(data)
        })
        sendResize()
      }
      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') return
        noteOutput(name, event.data)
        term.write(event.data, () => {
          const buffer = term.buffer.active
          if (stickRef.current && buffer.viewportY < buffer.baseY) pinToLatest()
          else publish()
        })
      }
      socket.onclose = () => {
        detachSession(name)
        if (!stopped) retry = window.setTimeout(connect, 1000)
      }
    }

    let publishFrame = 0
    const publish = () => {
      window.cancelAnimationFrame(publishFrame)
      publishFrame = window.requestAnimationFrame(() => {
        const buffer = term.buffer.active
        setMetrics({ y: buffer.viewportY, base: buffer.baseY, rows: term.rows })
      })
    }

    term.onData(sendRaw)
    term.onWriteParsed(publish)
    term.onScroll(() => {
      publish()
      if (pinning) return
      const buffer = term.buffer.active
      const atBottom = buffer.viewportY >= buffer.baseY
      stickRef.current = atBottom
      setFollowing(atBottom)
    })
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        stickRef.current = false
        setFollowing(false)
      }
    }
    host.addEventListener('wheel', onWheel, { capture: true, passive: true })
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (host.contains(target)) term.focus()
      else if (term.element?.contains(document.activeElement)) term.blur()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    connect()

    const observer = new ResizeObserver(() => sendResize())
    observer.observe(host)

    return () => {
      stopped = true
      window.clearTimeout(retry)
      detachSession(name)
      observer.disconnect()
      window.cancelAnimationFrame(publishFrame)
      host.removeEventListener('wheel', onWheel, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
      socket?.close()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [name])

  useEffect(() => {
    fontSizeRef.current = fontSize
    const term = termRef.current
    if (term && term.options.fontSize !== fontSize) term.options.fontSize = fontSize
  }, [fontSize])

  useEffect(() => {
    if (!active) return
    const fitNow = () => {
      const fit = fitRef.current
      const term = termRef.current
      const socket = socketRef.current
      if (!fit || !term) return
      fit.fit()
      if (stickRef.current) term.scrollToBottom()
      if (socket && socket.readyState === WebSocket.OPEN && term.cols > 0 && term.rows > 0) {
        socket.send(JSON.stringify({ t: 'resize', cols: term.cols, rows: term.rows }))
      }
    }
    const frame = requestAnimationFrame(fitNow)
    return () => cancelAnimationFrame(frame)
  }, [active, fontSize])

  return (
    <div className={active ? 'terminal-pane' : 'terminal-pane is-hidden'}>
      <div className="terminal-host" ref={ref} data-following={following ? 'yes' : 'no'} />
      <BufferRail
        metrics={metrics}
        onScrollTo={(line) => {
          const term = termRef.current
          if (!term) return
          stickRef.current = false
          setFollowing(false)
          term.scrollToLine(Math.max(0, line))
        }}
      />
      <button
        type="button"
        className={following ? 'follow-toggle is-on' : 'follow-toggle'}
        onClick={() => {
          if (following) {
            stickRef.current = false
            setFollowing(false)
            return
          }
          pinFromButton(termRef, stickRef, setFollowing)
        }}
      >
        {following ? 'Following' : 'Jump to latest'}
      </button>
    </div>
  )
}

function BufferRail({
  metrics,
  onScrollTo,
}: {
  metrics: { y: number; base: number; rows: number }
  onScrollTo: (line: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const total = Math.max(1, metrics.base + metrics.rows)
  const thumbPct = Math.min(100, Math.max(8, (metrics.rows / total) * 100))
  const travel = 100 - thumbPct
  const topPct = metrics.base <= 0 ? 0 : (metrics.y / metrics.base) * travel

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track || metrics.base <= 0) return
    event.preventDefault()
    event.stopPropagation()
    const rect = track.getBoundingClientRect()
    const thumbH = (thumbPct / 100) * rect.height
    const lineAt = (clientY: number) => {
      const offset = clientY - rect.top - thumbH / 2
      const ratio = Math.min(1, Math.max(0, offset / Math.max(1, rect.height - thumbH)))
      return Math.round(ratio * metrics.base)
    }
    onScrollTo(lineAt(event.clientY))
    const move = (ev: PointerEvent) => onScrollTo(lineAt(ev.clientY))
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  return (
    <div
      className="buffer-rail"
      ref={trackRef}
      onPointerDown={onPointerDown}
      role="scrollbar"
      aria-orientation="vertical"
      aria-valuenow={metrics.y}
      aria-valuemax={metrics.base}
    >
      <div className="buffer-thumb" style={{ height: `${thumbPct}%`, top: `${topPct}%` }} />
    </div>
  )
}

function pinFromButton(
  termRef: { current: Terminal | null },
  stickRef: { current: boolean },
  setFollowing: (value: boolean) => void,
) {
  const term = termRef.current
  if (!term) return
  stickRef.current = true
  term.scrollToBottom()
  setFollowing(true)
}
