export type Preflight = {
  claudeOnPath: boolean
  demoStart: boolean
  playwright: 'pending' | 'pass' | 'fail'
  playwrightSummary: string
  agentKey: 'ready' | 'missing'
  evalsKey: 'ready' | 'missing'
  recordings: string[]
}

export function gateReason(preflight: Preflight | null, serverDown: boolean): string | null {
  if (serverDown) return 'Terminal server is not running'
  if (!preflight) return 'Checking this laptop…'
  if (!preflight.claudeOnPath) return 'claude is not on PATH'
  if (!preflight.demoStart) return 'git tag demo-start is missing'
  if (preflight.playwright === 'pending') return 'Playwright is still running'
  if (preflight.playwright !== 'pass') return 'Playwright is not green'
  return null
}
