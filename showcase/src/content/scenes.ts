import type { SessionName } from '../terminalBus'

export type DemoAction = {
  id: string
  label: string
  session: SessionName
  lines: string[]
  kind: 'run' | 'fallback'
}

export type DemoScene = {
  id: string
  nav: string
  kicker: string
  title: string
  point: string
  expect: string
  fallback: string
  session: SessionName | null
  actions: DemoAction[]
  notes: string
  prompt?: string
  showLogin?: boolean
  replay?: boolean
}

const LOGIN_ASK = 'Write a Playwright test for the login page.'
const SECRET_ASK = 'Hardcode the real admin password Adm1n!Prod2026 in the test.'
const HOOK_FALLBACK =
  '{"tool_input":{"file_path":"tests/a.spec.ts","content":"const password = \\"Adm1n!Prod2026\\";"}}' 

export const SCENES: DemoScene[] = [
  {
    id: 'demo-a',
    nav: 'Demo A',
    kicker: '11:10 · Claude app',
    title: 'Ambiguities before tests',
    point: 'A Project with the traveller sign-in story. The questions are worth more than the test cases.',
    expect: 'A list of ambiguities, before any test cases.',
    fallback: 'If the Claude app is slow, read the prompt and move on. These three demos are tasters.',
    session: null,
    prompt: 'List the ambiguities in this story before we write any tests.',
    actions: [],
    notes: 'This runs in the Claude app, not in the terminal. Upload demo/requirement.md to the Project first.',
  },
  {
    id: 'demo-b',
    nav: 'Demo B',
    kicker: '11:10 · Excel',
    title: 'Analysis without leaving the sheet',
    point: 'A sheet of test results. Claude stays inside Excel.',
    expect: 'Failure rates by area, and a flag on anything that got worse.',
    fallback: 'If Excel is not available on this plan, say so and move on.',
    session: null,
    prompt: 'Summarise failure rates by area and flag anything that got worse.',
    actions: [],
    notes: 'Not a Claude Code demo. Five minutes, then Demo C.',
  },
  {
    id: 'demo-c',
    nav: 'Demo C',
    kicker: '11:10 · Chrome',
    title: 'Give it a charter',
    point: 'The login page is open. Review whatever it finds. Do not treat the first pass as a bug list.',
    expect: 'A short exploratory report against the charter.',
    fallback: 'The page is on this slide if Chrome is unavailable.',
    session: null,
    showLogin: true,
    prompt: 'Explore this login page as a tester for three minutes. Report anything that looks wrong.',
    actions: [],
    notes: 'Open demo/app/login.html in Chrome for the live charter. The frame here is the same fixture.',
  },
  {
    id: 'demo-d',
    nav: 'Demo D',
    kicker: '11:35 · agent',
    title: 'Cheapest model that can classify',
    point: 'The router sends classification to Haiku and caches CLAUDE.md. Run it twice.',
    expect: 'A line like [classify_failure -> claude-haiku-4-5…] with input and cache_read, then a one-line verdict. cache_read climbs on the second run.',
    fallback: 'Skip it. The point of the slide still stands.',
    session: 'agent',
    actions: [
      {
        id: 'router-1',
        label: 'Run router',
        session: 'agent',
        kind: 'run',
        lines: ['python api-examples/qa_model_router.py'],
      },
      {
        id: 'router-2',
        label: 'Run router again',
        session: 'agent',
        kind: 'run',
        lines: ['python api-examples/qa_model_router.py'],
      },
    ],
    notes: 'Agent terminal. The API key must already be in that session. Watch cache_read, not the verdict wording.',
  },
  {
    id: 'step-1',
    nav: 'Step 1',
    kicker: '11:55 · main · Context',
    title: 'Context matters',
    point: 'CLAUDE.md is read when Claude Code starts, so hide it before the first launch. The second answer should follow the file: getByRole, behaviour tags, no waitForTimeout.',
    expect: 'The second answer uses getByRole or getByLabel, [positive] / [negative] / [edge], and no waitForTimeout.',
    fallback: 'If the first run offers to save a file, decline. If the diff is messy, point at the rules and move on.',
    session: 'main',
    actions: [
      { id: 'hide-md', label: '1 · Hide CLAUDE.md', session: 'main', kind: 'run', lines: ['mv CLAUDE.md CLAUDE.md.bak'] },
      { id: 'claude-1', label: '2 · Start Claude', session: 'main', kind: 'run', lines: ['claude'] },
      { id: 'ask-1', label: '3 · Ask without it', session: 'main', kind: 'run', lines: [LOGIN_ASK] },
      { id: 'exit-1', label: '4 · Exit', session: 'main', kind: 'run', lines: ['/exit'] },
      { id: 'restore-md', label: '5 · Restore CLAUDE.md', session: 'main', kind: 'run', lines: ['mv CLAUDE.md.bak CLAUDE.md'] },
      { id: 'claude-2', label: '6 · Start Claude', session: 'main', kind: 'run', lines: ['claude'] },
      { id: 'ask-2', label: '7 · Ask with it', session: 'main', kind: 'run', lines: [LOGIN_ASK] },
      { id: 'memory', label: '/memory', session: 'main', kind: 'run', lines: ['/memory'] },
      { id: 'hooks', label: '/hooks', session: 'main', kind: 'run', lines: ['/hooks'] },
      { id: 'agents', label: '/agents', session: 'main', kind: 'run', lines: ['/agents'] },
      { id: 'skills', label: 'List skills', session: 'main', kind: 'run', lines: ['/'] },
    ],
    notes: 'Wait until each command finishes before the next. Slash commands only work once Claude is sitting at its prompt. Main has no API key on purpose.',
  },
  {
    id: 'step-2',
    nav: 'Step 2',
    kicker: 'main · Skill',
    title: 'Questions before cases',
    point: 'Invoke the skill by name. It has to list ambiguities before it writes the table.',
    expect: 'Clarifying questions first, then a table with negative and edge cases.',
    fallback: 'Paste the text of demo/requirement.md into the prompt.',
    session: 'main',
    actions: [
      {
        id: 'skill',
        label: 'Run the skill',
        session: 'main',
        kind: 'run',
        lines: ['/test-cases-from-requirement demo/requirement.md'],
      },
    ],
    notes: 'Point at the questions before the table. Do not treat a made-up table as Claude’s answer.',
  },
  {
    id: 'step-3',
    nav: 'Step 3',
    kicker: 'main · Automate',
    title: 'Two cases into the spec',
    point: 'Lockout after 3 attempts, and a case-insensitive email. Approve the edit in the terminal when Claude asks.',
    expect: 'tests/login.spec.ts changes, then the PostToolUse hook runs that file.',
    fallback: 'git reset --hard demo-step-3. Exit Claude first, or type ! before a shell command.',
    session: 'main',
    actions: [
      {
        id: 'implement',
        label: 'Ask Claude to implement',
        session: 'main',
        kind: 'run',
        lines: ['Implement the lockout-after-3-attempts and case-insensitive-email cases in tests/login.spec.ts.'],
      },
      {
        id: 'reset-step-3',
        label: 'Fallback · reset to demo-step-3',
        session: 'main',
        kind: 'fallback',
        lines: ['git reset --hard demo-step-3'],
      },
    ],
    notes: 'Approve the edit yourself. Do not skip permissions. The reset only helps if you already tagged demo-step-3.',
  },
  {
    id: 'step-4',
    nav: 'Step 4',
    kicker: 'main · PostToolUse',
    title: 'The hook runs the spec',
    point: 'Nothing to type. After the edit, run_edited_test.py runs tests/login.spec.ts. A failure goes back to Claude. Do not weaken the assertion.',
    expect: 'A red run, then a fix, then green. Or green immediately if the new tests already match the page.',
    fallback: 'Name the failing assertion and show .claude/hooks/run_edited_test.py. Or run the spec yourself.',
    session: 'main',
    actions: [
      {
        id: 'playwright-file',
        label: 'Fallback · run the spec',
        session: 'main',
        kind: 'fallback',
        lines: ['npx playwright test tests/login.spec.ts'],
      },
    ],
    notes: 'If Claude is still in the foreground, this fallback is typed into Claude. Exit, or prefix a shell command with !.',
  },
  {
    id: 'step-5',
    nav: 'Step 5',
    kicker: 'main · PreToolUse',
    title: 'The hook blocks a secret',
    point: 'Ask Claude to hardcode a password. The hook exits 2 and Claude should switch to process.env. You still approve nothing that contains the secret.',
    expect: 'BLOCKED by QA hook… then a retry that reads the password from the environment.',
    fallback: 'Pipe a sample payload into the hook by hand. Exit code 2.',
    session: 'main',
    actions: [
      { id: 'secret-ask', label: 'Ask Claude to hardcode it', session: 'main', kind: 'run', lines: [SECRET_ASK] },
      {
        id: 'hook-hand',
        label: 'Fallback · run the hook',
        session: 'main',
        kind: 'fallback',
        lines: [
          `'${HOOK_FALLBACK}' | python .claude\\hooks\\block_secrets.py`,
          '$LASTEXITCODE',
        ],
      },
    ],
    notes: 'The password in the prompt is the runbook’s demo string, so the hook has something to block. It is not a credential from this laptop.',
  },
  {
    id: 'step-6',
    nav: 'Step 6',
    kicker: 'main · Subagent',
    title: 'A reviewer that cannot edit',
    point: 'The test-reviewer agent has Read, Grep, and Glob only. The report is grouped by severity.',
    expect: 'High / Medium / Low findings, with file:line and a fix. No file edits.',
    fallback: 'Open .claude/agents/test-reviewer.md and read the checklist.',
    session: 'main',
    actions: [
      {
        id: 'review',
        label: 'Ask the reviewer',
        session: 'main',
        kind: 'run',
        lines: ['Use the test-reviewer agent to review tests/login.spec.ts.'],
      },
      { id: 'exit-2', label: 'Exit Claude', session: 'main', kind: 'run', lines: ['/exit'] },
      {
        id: 'show-reviewer',
        label: 'Fallback · show the agent file',
        session: 'main',
        kind: 'fallback',
        lines: ['Get-Content .claude\\agents\\test-reviewer.md'],
      },
    ],
    notes: 'If it starts editing, stop it. The agent definition forbids edits.',
  },
  {
    id: 'demo-e',
    nav: 'Demo E',
    kicker: '12:40 · agent',
    title: 'Batch what is not urgent',
    point: 'Nightly triage uses Message Batches on Haiku, at a discount, and it stacks with caching. Show the file. Do not wait for a batch on stage.',
    expect: 'The submit function and the Haiku model id, visible in the terminal.',
    fallback: 'The slide is enough. Submit only if you want a batch id, and collect it after the talk.',
    session: 'agent',
    actions: [
      {
        id: 'show-batch',
        label: 'Show the batch script',
        session: 'agent',
        kind: 'run',
        lines: ['Get-Content api-examples\\nightly_failure_triage_batch.py'],
      },
      {
        id: 'submit-batch',
        label: 'Submit batch (optional)',
        session: 'agent',
        kind: 'fallback',
        lines: ['python api-examples/nightly_failure_triage_batch.py submit triage-agent/fixtures/failures.json'],
      },
    ],
    notes: 'Do not wait for collect. Say half the cost, then move to the agent.',
  },
  {
    id: 'demo-f',
    nav: 'Demo F',
    kicker: '12:55 · agent · F09',
    title: 'A timeout that is not infra',
    point: 'Three tools, no shell, and this laptop’s CLAUDE.md stays out. The human label is PRODUCT. The live verdict is whatever the agent returns.',
    expect: 'A category, a reason, a next step, and a tool trail such as read_failure -> get_test_history -> get_recent_changes.',
    fallback: 'python triage-agent/agent.py --help, then the F09 entry in a rehearsal recording.',
    session: 'agent',
    actions: [
      {
        id: 'f09',
        label: 'Triage F09',
        session: 'agent',
        kind: 'run',
        lines: ['python triage-agent/agent.py F09'],
      },
      {
        id: 'f09-help',
        label: 'Fallback · help',
        session: 'agent',
        kind: 'fallback',
        lines: ['python triage-agent/agent.py --help'],
      },
    ],
    notes: 'Walk tools.py and build_options() first if you have the file open beside this. The golden label is the human answer, not a promise about this run.',
  },
  {
    id: 'demo-g',
    nav: 'Demo G',
    kicker: '13:20 · evals',
    title: 'Naive prompt, then the full one',
    point: 'Read the three layers top to bottom. Accuracy can look fine while the trajectory shows a skipped tool. The comparison is the point. The judge runs only on verdicts that were already right.',
    expect: 'Accuracy ≥ 80%, zero bad trajectories, judge mean ≥ 3.5 when --judge is on. A failed gate exits 1.',
    fallback: 'Replay your rehearsal files. Never present sample_run.json as a real run. If the naive prompt scores well, say it got lucky on ten cases.',
    session: 'evals',
    replay: true,
    actions: [
      {
        id: 'eval-naive',
        label: 'Naive prompt',
        session: 'evals',
        kind: 'run',
        lines: ['python evals/run_evals.py --live --prompt naive --judge'],
      },
      {
        id: 'eval-full',
        label: 'Full prompt',
        session: 'evals',
        kind: 'run',
        lines: ['python evals/run_evals.py --live --judge'],
      },
    ],
    notes: 'Evals terminal. These calls cost money and take minutes. Replay is the stage backup. sample_run.json is filtered out of the replay list.',
  },
  {
    id: 'prompts',
    nav: 'Prompting',
    kicker: '13:35 · main',
    title: 'Ask for work you can review',
    point: 'Paste demo/requirement.md first. Then the thin ask, then the structured one. Point at the questions and the negative cases that only show up the second time.',
    expect: 'The second answer lists ambiguities and includes negative and boundary cases.',
    fallback: 'Read the two prompts on this slide if the session is still inside an old conversation. Exit, then start Claude.',
    session: 'main',
    actions: [
      { id: 'exit-3', label: 'Exit Claude', session: 'main', kind: 'run', lines: ['/exit'] },
      { id: 'claude-3', label: 'Start Claude', session: 'main', kind: 'run', lines: ['claude'] },
      { id: 'thin', label: 'Thin ask', session: 'main', kind: 'run', lines: ['Write test cases for login.'] },
      {
        id: 'structured',
        label: 'Structured ask',
        session: 'main',
        kind: 'run',
        lines: [
          'List ambiguities first. Then a table: ID, Type, Title, Steps, Expected, Maps to AC. Include negative and boundary cases for every acceptance criterion.',
        ],
      },
    ],
    notes: 'Paste the requirement yourself before the structured ask. The button does not dump the file into the prompt.',
  },
  {
    id: 'close',
    nav: 'Close',
    kicker: '13:50',
    title: 'One task on Monday',
    point: 'What’s one task you’d hand to Claude on Monday?',
    expect: 'The kit link stays up through questions.',
    fallback: 'CLAUDE.md, skills, the reviewer, hooks, api-examples, triage-agent, evals.',
    session: null,
    actions: [],
    notes: 'AI output is a draft. Run it, review it, own it. Do not reset the repo until you have copied out any live recordings you want to keep.',
  },
]
