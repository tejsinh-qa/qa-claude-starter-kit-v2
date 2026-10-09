export type SessionName = 'main' | 'agent' | 'evals'

type Slot = {
  send: (data: string) => void
}

const slots = new Map<SessionName, Slot>()

export function attachSession(name: SessionName, send: (data: string) => void) {
  slots.set(name, { send })
}

export function detachSession(name: SessionName) {
  slots.delete(name)
}

export function sessionReady(name: SessionName) {
  return slots.has(name)
}

export async function typeLines(name: SessionName, lines: string[]) {
  const slot = slots.get(name)
  if (!slot) throw new Error('That terminal is not connected yet.')
  for (const line of lines) {
    slot.send(line + '\r')
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}
