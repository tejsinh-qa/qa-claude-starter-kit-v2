export type Preflight = {
  claudeOnPath: boolean
  demoStart: boolean
  playwright: 'pending' | 'pass' | 'fail'
  playwrightSummary: string
  passedCount: number | null
  testsClean: boolean | null
  agentKey: 'ready' | 'missing'
  evalsKey: 'ready' | 'missing'
  recordings: string[]
}

export const SEED_TESTS = 2

export type Check = { ok: boolean; label: string }

export function preflightChecks(preflight: Preflight): Check[] {
  const seedOk = preflight.playwright === 'pass' && preflight.passedCount === SEED_TESTS
  return [
    { ok: preflight.claudeOnPath, label: preflight.claudeOnPath ? 'claude on PATH' : 'claude is not on PATH' },
    { ok: preflight.demoStart, label: preflight.demoStart ? 'demo-start tag' : 'no demo-start tag' },
    {
      ok: seedOk,
      label:
        preflight.playwright === 'pending'
          ? 'Playwright running'
          : preflight.playwright !== 'pass'
            ? 'Playwright failed'
            : seedOk
              ? preflight.playwrightSummary
              : `${preflight.passedCount ?? '?'} passed, expected ${SEED_TESTS}`,
    },
    {
      ok: preflight.testsClean === true,
      label: preflight.testsClean ? 'tests/ matches demo-start' : 'tests/ differs from demo-start',
    },
    { ok: preflight.agentKey === 'ready', label: preflight.agentKey === 'ready' ? 'agent key ready' : 'no key for agent' },
    { ok: preflight.evalsKey === 'ready', label: preflight.evalsKey === 'ready' ? 'evals key ready' : 'no key for evals' },
    {
      ok: preflight.recordings.length > 0,
      label: preflight.recordings.length > 0 ? `${preflight.recordings.length} eval recordings` : 'no eval recordings',
    },
  ]
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
