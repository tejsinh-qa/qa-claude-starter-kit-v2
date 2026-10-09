import { useEffect, useRef } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { attachSession, detachSession, type SessionName } from './terminalBus'

const SESSIONS: SessionName[] = ['main', 'agent', 'evals']

const LABELS: Record<SessionName, string> = {
  main: 'main · Claude Code · no API key',
  agent: 'agent · router, batch, triage',
  evals: 'evals · naive, then full',
}

export function TerminalDeck({ active }: { active: SessionName | null }) {
  return (
    <section className={active ? 'terminal-deck' : 'terminal-deck is-hidden'} aria-label="Demo terminal">
      <div className="terminal-bar">
        <span>{active ? LABELS[active] : 'No terminal for this demo'}</span>
        <span className="terminal-hint">Click the terminal to type. Approvals stay here.</span>
      </div>
      {SESSIONS.map((name) => (
        <TerminalPane key={name} name={name} active={name === active} />
      ))}
    </section>
  )
}

function TerminalPane({ name, active }: { name: SessionName; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const host = ref.current
    if (!host) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 18,
      fontFamily: '"Cascadia Mono", "Segoe UI Mono", ui-monospace, monospace',
      theme: {
        background: '#0c1211',
        foreground: '#f3f6f5',
        cursor: '#1aafa0',
        selectionBackground: 'rgba(26, 175, 160, 0.35)',
      },
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

    const sendResize = () => {
      if (!activeRef.current) return
      fit.fit()
      const cols = term.cols
      const rows = term.rows
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
        attachSession(name, sendRaw)
        sendResize()
      }
      socket.onmessage = (event) => {
        if (typeof event.data === 'string') term.write(event.data)
      }
      socket.onclose = () => {
        detachSession(name)
        if (!stopped) retry = window.setTimeout(connect, 1000)
      }
    }

    term.onData(sendRaw)
    connect()

    const observer = new ResizeObserver(() => sendResize())
    observer.observe(host)

    return () => {
      stopped = true
      window.clearTimeout(retry)
      detachSession(name)
      observer.disconnect()
      socket?.close()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [name])

  useEffect(() => {
    if (!active) return
    const fitNow = () => {
      const fit = fitRef.current
      const term = termRef.current
      const socket = socketRef.current
      if (!fit || !term) return
      fit.fit()
      if (socket && socket.readyState === WebSocket.OPEN && term.cols > 0 && term.rows > 0) {
        socket.send(JSON.stringify({ t: 'resize', cols: term.cols, rows: term.rows }))
      }
    }
    const frame = requestAnimationFrame(fitNow)
    return () => cancelAnimationFrame(frame)
  }, [active])

  return <div className={active ? 'terminal-host' : 'terminal-host is-hidden'} ref={ref} />
}
