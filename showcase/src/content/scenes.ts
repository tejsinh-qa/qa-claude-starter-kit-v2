import type { SessionName } from '../terminalBus'

export type DemoAction = {
  id: string
  label: string
  session: SessionName
  lines: string[]
  kind: 'run' | 'follow' | 'fallback'
}

export type CompareTable = {
  columns: string[]
  rows: { label: string; cells: string[] }[]
  footnote: string
}

export type DemoScene = {
  id: string
  group: string
  nav: string
  /** Planned start, HH:MM on the day, from the runbook's run of show. */
  at: string
  canCut?: boolean
  eyebrow?: string
  title: string
  about: string
  why: string
  window: SessionName
  command?: string
  watch?: string
  drift?: string
  showLogin?: boolean
  replayMatch?: string
  steps?: string[]
  compare?: CompareTable
  qr?: { src: string; url: string }
  actions: DemoAction[]
  notes: string
}

export function sceneUsesTerminal(scene: DemoScene) {
  return Boolean(scene.command) || scene.actions.length > 0 || Boolean(scene.replayMatch)
}

const AMBIGUITY =
  'Read demo/requirement.md. List the ambiguities in this story before we write any tests.'
const FAILURES =
  'Read demo/test-results.csv. Summarise failure rates by area and flag anything that got worse since the previous night.'
const CHARTER =
  'Read demo/app/login.html. Explore this login page as a tester for three minutes. Report anything that looks wrong.'
const LOGIN_ASK = 'Write a Playwright test for the login page.'
const SECRET_ASK = 'Hardcode the real admin password Adm1n!Prod2026 in the test.'
const IMPLEMENT =
  'Implement the lockout-after-3-attempts and case-insensitive-email cases in tests/login.spec.ts.'
const REVIEW = 'Use the test-reviewer agent to review tests/login.spec.ts.'
const THIN = 'Write test cases for login.'
const STRUCTURED =
  'Read demo/requirement.md. List ambiguities first. Then a table: ID, Type, Title, Steps, Expected, Maps to AC. Include negative and boundary cases for every acceptance criterion.'
const HOOK_PAYLOAD =
  '{"tool_input":{"file_path":"tests/a.spec.ts","content":"const password = \\"Adm1n!Prod2026\\";"}}'

export const SCENES: DemoScene[] = [
  {
    id: 'opening',
    group: 'Opening',
    nav: 'Claude as a QA teammate',
    at: '11:00',
    eyebrow: 'BrowserStack QA Meetup · Pune · 10 October 2026',
    title: 'Claude as a QA teammate',
    about: 'Not “write me a test case”. A teammate that knows your rules, checks its own work, and gets scored like a release.',
    why: 'Show of hands: who has asked an AI for test cases? Keep your hand up if you used them without editing. Today is about the gap between those two hands.',
    window: 'main',
    steps: [
      'Review the work: a login story, last night’s failures, and the sign-in page.',
      'Write the tests: project rules, a reusable skill, hooks that always run, and a reviewer.',
      'Let it run: the Claude API, the Agent SDK, and an agent that labels a failed test.',
      'Check the result: score the agent, then the habits that keep it honest.',
    ],
    actions: [],
    notes:
      'Opening · slides 1–4. Ask for the show of hands, then read the four lines. Everything after this is live in the terminal.',
  },
  {
    id: 'demo-a',
    group: 'Review the work',
    nav: 'Find the gaps in the story',
    at: '11:10',
    title: 'Find the gaps in the story',
    about: 'Read the login story and list what two testers could build differently.',
    why: 'Those gaps are ambiguities: open questions for the author, not tests. The story is TD-142, traveller sign-in. If “temporarily locked” could mean five minutes or until an admin resets it, that question goes back to the product owner before anyone writes a case.',
    window: 'main',
    command: `claude\n${AMBIGUITY}`,
    watch: 'A list of ambiguities and assumptions, before any test-case table.',
    drift: 'Paste the text of demo/requirement.md into the prompt.',
    actions: [
      {
        id: 'run-a',
        label: 'Run',
        session: 'main',
        kind: 'run',
        lines: ['claude', AMBIGUITY],
      },
    ],
    notes:
      'Demo A · main. The meetup script uses a Claude Project with the story attached. This demo types the same ask into Claude Code and points it at demo/requirement.md. Wait until Claude is at its prompt. Point at the questions, not at a table.',
  },
  {
    id: 'demo-b',
    group: 'Review the work',
    nav: 'Sort last night’s failures',
    at: '11:10',
    canCut: true,
    title: 'Sort last night’s failures',
    about: 'Group yesterday’s red tests by area, and say which ones got worse.',
    why: 'A flat list is not a triage. You want a failure rate by area, and a flag where that rate got worse, so someone knows what needs a person today. The file has two nights of results for six areas.',
    window: 'main',
    command: FAILURES,
    watch: 'A rate per area, with login and payments flagged: both jumped on the second night.',
    drift: 'If Claude is not open, start it, then send the prompt again.',
    actions: [
      { id: 'run-b', label: 'Run', session: 'main', kind: 'run', lines: [FAILURES] },
      { id: 'start-b', label: 'Start Claude', session: 'main', kind: 'fallback', lines: ['claude'] },
    ],
    notes:
      'Demo B · main. The meetup script does this in Excel. Here Claude Code reads demo/test-results.csv instead. Five minutes. Cut this one first if you are running late.',
  },
  {
    id: 'demo-c',
    group: 'Review the work',
    nav: 'Explore the login page',
    at: '11:10',
    title: 'Explore the login page',
    about: 'Spend three minutes on the sign-in page and write down what looks wrong.',
    why: 'That time box is a charter: a short mission so the session does not wander. The notes are findings. You still decide what is a bug. The page on this screen is the one under test.',
    window: 'main',
    command: CHARTER,
    watch: 'A short report against the charter. You still decide what is a bug.',
    drift: 'If Claude is not open, start it. The page is also on this screen.',
    showLogin: true,
    actions: [
      { id: 'run-c', label: 'Run', session: 'main', kind: 'run', lines: [CHARTER] },
      { id: 'start-c', label: 'Start Claude', session: 'main', kind: 'fallback', lines: ['claude'] },
    ],
    notes:
      'Demo C · main. The meetup script uses Claude in Chrome. Here the charter is typed into Claude Code. Give it the three minutes, then review the findings out loud.',
  },
  {
    id: 'morning',
    group: 'Review the work',
    nav: 'Confirm the two tests pass',
    at: '11:25',
    title: 'Confirm the two tests pass',
    about: 'Run the two tests that are already in the suite, before anyone adds more.',
    why: 'Valid sign-in and empty email should both pass. That green run is the baseline. If it is red, you cannot tell a new failure from an old one. CLAUDE.md, the file of team test rules, is already in place for the later demos.',
    window: 'main',
    command: 'npx playwright test',
    watch: '2 passed.',
    drift: 'If more than two tests run, put the tests folder back to the demo-start tag, then run the tests again.',
    actions: [
      { id: 'tests', label: 'Run', session: 'main', kind: 'run', lines: ['npx playwright test'] },
      {
        id: 'reset-start',
        label: 'Restore tests/ from demo-start',
        session: 'main',
        kind: 'fallback',
        lines: ['git checkout demo-start -- tests/', 'npx playwright test'],
      },
    ],
    notes: 'Morning · main. Exit Claude first if this terminal is still inside it. This command is for PowerShell.',
  },
  {
    id: 'demo-d',
    group: 'Review the work',
    nav: 'Pick a smaller model first',
    at: '11:25',
    title: 'Pick a smaller model first',
    about: 'Label a failure with the smallest model that can do the job.',
    why: 'Sorting a failure into infra, test, or product is high-volume work. Haiku is the small, fast model for that. The team rules in CLAUDE.md are cached, so the next call does not pay full price to read them again. Move to a larger model only when the labels are wrong.',
    window: 'agent',
    command: '.\\.venv\\Scripts\\python.exe api-examples\\qa_model_router.py',
    watch:
      'A line like [classify_failure -> claude-haiku-4-5…] with input and cache_read, then a one-line verdict. cache_read climbs on the second run.',
    drift: 'Skip the live call. The routing table on this screen is the point.',
    actions: [
      {
        id: 'router',
        label: 'Run',
        session: 'agent',
        kind: 'run',
        lines: ['.\\.venv\\Scripts\\python.exe api-examples\\qa_model_router.py'],
      },
      {
        id: 'router-again',
        label: 'Run again',
        session: 'agent',
        kind: 'follow',
        lines: ['.\\.venv\\Scripts\\python.exe api-examples\\qa_model_router.py'],
      },
    ],
    notes: 'Demo D · agent. This window has the API key and the virtualenv. Point at cache_read, not at the wording of the verdict.',
  },
  {
    id: 'step-1-without',
    group: 'Write the tests',
    nav: 'Write a test with no project rules',
    at: '11:40',
    title: 'Write a test with no project rules',
    about: 'Hide the team rules, then ask for a login test.',
    why: 'CLAUDE.md is the standard Claude Code loads at the start of a session: which locators to use, how to title a test, and no hard waits. Without it, this session is a new joiner. Expect a brittle locator, a sleep, or only the happy path.',
    window: 'main',
    command: `mv CLAUDE.md CLAUDE.md.bak\nclaude\n${LOGIN_ASK}`,
    watch: 'A Playwright test that does not follow this repo: often a CSS or XPath locator, a hard wait, and no [positive] or [negative] tag.',
    drift: 'If Claude offers to save a file, decline it.',
    actions: [
      {
        id: 'without',
        label: 'Run',
        session: 'main',
        kind: 'run',
        lines: ['mv CLAUDE.md CLAUDE.md.bak', 'claude', LOGIN_ASK],
      },
    ],
    notes: 'Step 1 · main. Do not restore CLAUDE.md until you have shown this answer. The next screen puts it back.',
  },
  {
    id: 'step-1-with',
    group: 'Write the tests',
    nav: 'Write the same test with project rules',
    at: '11:40',
    title: 'Write the same test with project rules',
    about: 'Put the team rules back, start a fresh session, and ask for the same login test.',
    why: 'The second answer should use an accessible locator such as getByRole, a title that states the behaviour, and a tag such as [positive] or [negative]. That is the difference between a one-off prompt and a convention you would accept in review. The extra buttons list what this project has loaded: memory, hooks, reviewers, and skills.',
    window: 'main',
    command: `/exit\nmv CLAUDE.md.bak CLAUDE.md\nclaude\n${LOGIN_ASK}`,
    watch: 'getByRole or getByLabel, a [positive] / [negative] / [edge] tag, and no waitForTimeout.',
    drift: 'If the diff is messy, say the rule out loud and move on.',
    actions: [
      {
        id: 'with',
        label: 'Run',
        session: 'main',
        kind: 'run',
        lines: ['/exit', 'mv CLAUDE.md.bak CLAUDE.md', 'claude', LOGIN_ASK],
      },
      { id: 'memory', label: '/memory', session: 'main', kind: 'follow', lines: ['/memory'] },
      { id: 'hooks', label: '/hooks', session: 'main', kind: 'follow', lines: ['/hooks'] },
      { id: 'agents', label: '/agents', session: 'main', kind: 'follow', lines: ['/agents'] },
      { id: 'skills', label: '/', session: 'main', kind: 'follow', lines: ['/'] },
    ],
    notes:
      'Step 1 · main. Press the slash commands only once Claude is sitting at its prompt. Point at test-cases-from-requirement, bug-report, and flaky-test-triage.',
  },
  {
    id: 'step-2',
    group: 'Write the tests',
    nav: 'Agent skills: a checklist you can reuse',
    at: '11:40',
    title: 'Agent skills: a checklist you can reuse',
    about: 'Turn the login story into a table a reviewer can argue with.',
    why: 'An agent skill is that checklist, stored in SKILL.md. Claude Code picks it up when the task matches the description. This one lists the acceptance criteria first and will not guess past an ambiguity. Every criterion needs a negative case, plus the boundary and abuse cases.',
    window: 'main',
    command: '/test-cases-from-requirement demo/requirement.md',
    watch: 'Clarifying questions first, then a table that includes negative and edge cases.',
    drift: 'Paste the text of demo/requirement.md into the prompt.',
    actions: [
      {
        id: 'skill',
        label: 'Run',
        session: 'main',
        kind: 'run',
        lines: ['/test-cases-from-requirement demo/requirement.md'],
      },
    ],
    notes: 'Step 2 · main. Point at the questions before you point at the table.',
  },
  {
    id: 'step-3',
    group: 'Write the tests',
    nav: 'Add the lockout and email cases',
    at: '11:40',
    title: 'Add the lockout and email cases',
    about: 'Add the two missing checks: lockout after three failures, and an email that ignores capital letters.',
    why: 'Those are acceptance criteria AC5 and AC6. Claude edits tests/login.spec.ts, and you approve that diff the way you would approve a pull request. A hook, a rule that runs on its own, will then run the file and block a password if one is pasted in.',
    window: 'main',
    command: IMPLEMENT,
    watch: 'tests/login.spec.ts changes. The PostToolUse hook then runs that file.',
    drift: 'Restore tests/ from the demo-step-3 tag. That tag exists only if you rehearsed step 3 and tagged it.',
    actions: [
      { id: 'implement', label: 'Run', session: 'main', kind: 'run', lines: [IMPLEMENT] },
      {
        id: 'reset-3',
        label: 'Restore tests/ from demo-step-3',
        session: 'main',
        kind: 'fallback',
        lines: ['git checkout demo-step-3 -- tests/'],
      },
    ],
    notes: 'Step 3 · main. Approve the edit yourself. Do not skip the permission prompt. The restore button exits Claude first.',
  },
  {
    id: 'step-4',
    group: 'Write the tests',
    nav: 'Run the test as soon as it is saved',
    at: '11:40',
    title: 'Run the test as soon as it is saved',
    about: 'Saving a test file runs that file. A red result has to be fixed, not softened.',
    why: 'The hook is a gate, the same idea as CI. After the spec is saved, Playwright runs it and a failed assertion comes back. Weakening the expect to make it pass is not allowed.',
    window: 'main',
    command: 'npx playwright test tests/login.spec.ts',
    watch: 'The hook output in the Claude session. Red, then a fix, then green — or green immediately if the new tests already match the page.',
    drift: 'Run the spec yourself with the command above. Do not weaken the assertion.',
    actions: [
      {
        id: 'spec',
        label: 'Run',
        session: 'main',
        kind: 'run',
        lines: ['npx playwright test tests/login.spec.ts'],
      },
    ],
    notes: 'Step 4 · main. If Claude is in the foreground, this command is typed into Claude. Exit, or prefix it with !.',
  },
  {
    id: 'step-5',
    group: 'Write the tests',
    nav: 'Stop a password from being saved',
    at: '11:40',
    title: 'Stop a password from being saved',
    about: 'Try to paste a password into the test. The write should be refused.',
    why: 'Before the file is saved, a hook scans the edit for passwords and keys. A match blocks the write and tells Claude to read the secret from the environment instead. The password in this prompt is a demo string, not a real credential.',
    window: 'main',
    command: SECRET_ASK,
    watch: 'BLOCKED by QA hook… then a retry that reads the password from the environment.',
    drift: 'Run the hook by hand. The exit code is 2.',
    actions: [
      { id: 'secret', label: 'Run', session: 'main', kind: 'run', lines: [SECRET_ASK] },
      {
        id: 'hook-hand',
        label: 'Run the hook by hand',
        session: 'main',
        kind: 'fallback',
        lines: [`'${HOOK_PAYLOAD}' | python .claude\\hooks\\block_secrets.py`, '$LASTEXITCODE'],
      },
    ],
    notes: 'Step 5 · main. Do not approve a write that still contains the password. The hook is what stops it.',
  },
  {
    id: 'step-6',
    group: 'Write the tests',
    nav: 'Ask for a review, not an edit',
    at: '11:40',
    title: 'Ask for a review, not an edit',
    about: 'Ask for a review of the new tests, and do not let the reviewer change them.',
    why: 'The reviewer looks for flaky patterns, assertions that would still pass if the feature were broken, missing negative cases, and locators that ignore the team standard. Findings come back as High, Medium, and Low. Read-only means the review cannot become another edit.',
    window: 'main',
    command: REVIEW,
    watch: 'Findings grouped High, Medium, and Low, with file:line and a concrete fix. No file edits.',
    drift: 'Open .claude/agents/test-reviewer.md and read the checklist.',
    actions: [
      { id: 'review', label: 'Run', session: 'main', kind: 'run', lines: [REVIEW] },
      { id: 'exit-review', label: '/exit', session: 'main', kind: 'follow', lines: ['/exit'] },
      {
        id: 'show-reviewer',
        label: 'Show the agent file',
        session: 'main',
        kind: 'fallback',
        lines: ['Get-Content .claude\\agents\\test-reviewer.md'],
      },
    ],
    notes: 'Step 6 · main. If it starts editing, stop it. Exit Claude when the report is done, before the agent-window work.',
  },
  {
    id: 'break',
    group: 'Let it run',
    nav: 'Check the key and the backup',
    at: '12:20',
    title: 'Check the key and the backup',
    about: 'Before the unattended jobs, confirm the key is loaded and last night’s recordings are on disk.',
    why: 'The command prints the first seven characters of the key, not the key. The recordings are the backup if a live score is too slow. sample_run.json was written by hand and is not a real run.',
    window: 'agent',
    command: '$env:ANTHROPIC_API_KEY.Substring(0,7)\ndir evals\\recordings',
    watch: 'sk-ant- and the two rehearsal files. sample_run.json is hand-written and is not a real run.',
    drift: 'If the prefix is empty, the key was not loaded. Restart the presenter.',
    actions: [
      {
        id: 'preflight',
        label: 'Run',
        session: 'agent',
        kind: 'run',
        lines: ['$env:ANTHROPIC_API_KEY.Substring(0,7)', 'dir evals\\recordings'],
      },
    ],
    notes: 'Break · agent. Do not read the rest of the key aloud.',
  },
  {
    id: 'demo-e',
    group: 'Let it run',
    nav: 'Claude API: queue the night’s failures',
    at: '12:35',
    canCut: true,
    title: 'Claude API: queue the night’s failures',
    about: 'Send the pile off and read the labels in the morning.',
    why: 'The Claude API is the programming interface, not the chat. A batch is the queue, sent to the small model at a lower rate. Show the queue only prints the ten failures. It does not call the API. Submit is the only button that does.',
    window: 'agent',
    command: '.\\.venv\\Scripts\\python.exe api-examples\\nightly_failure_triage_batch.py preview triage-agent\\fixtures\\failures.json',
    watch: 'The line “No request was sent”, the Haiku model id, and ten rows from F01 onward.',
    drift: 'If the queue does not print, read the command on this screen. Submit is optional and is the only button that spends money.',
    steps: [
      'Show the queue clears the screen and lists ten failures. Nothing is sent.',
      'The model line and the count are the nightly job.',
      'Submit the real batch only if you want an id. Do not wait for the labels.',
    ],
    actions: [
      {
        id: 'show-batch',
        label: 'Show the queue',
        session: 'agent',
        kind: 'run',
        lines: [
          'Clear-Host',
          '.\\.venv\\Scripts\\python.exe api-examples\\nightly_failure_triage_batch.py preview triage-agent\\fixtures\\failures.json',
        ],
      },
      {
        id: 'submit',
        label: 'Submit the real batch',
        session: 'agent',
        kind: 'fallback',
        lines: [
          '.\\.venv\\Scripts\\python.exe api-examples\\nightly_failure_triage_batch.py submit triage-agent\\fixtures\\failures.json',
        ],
      },
    ],
    notes: 'Demo E · agent. Say the discount, then move to how the helper is built. Do not wait on collect. If you are running late, cut this to one sentence.',
  },
  {
    id: 'build-agent',
    group: 'Let it run',
    nav: 'Agent SDK: build the helper in code',
    at: '12:50',
    title: 'Agent SDK: build the helper in code',
    about: 'You are not typing in the chat. A Python program hires Claude, hands it one failed test, and takes back a label.',
    why: 'The Agent SDK is that library. Claude may ask for the log, the history, or the recent commits. The program answers those lookups and nothing else. There is no person at the keyboard, and there is no shell. A skill is the checklist. The SDK is how you run that kind of work from code, for example a nightly job.',
    window: 'agent',
    command: '.\\.venv\\Scripts\\python.exe demo\\show_build.py skill',
    watch: 'Three short printouts. Skill steps, then three tool names, then mcp_servers and allowed_tools.',
    drift: 'Read the three buttons in order if a printout scrolls off. None of them call the API.',
    steps: [
      'Skill is the checklist, and the line that decides when Claude uses it.',
      'MCP tools are the three allowed lookups: the log, the history, and the recent commits.',
      'Wire them is the program that allows those three and turns the shell off.',
    ],
    actions: [
      {
        id: 'skill',
        label: '1 · Skill',
        session: 'agent',
        kind: 'run',
        lines: ['Clear-Host', '.\\.venv\\Scripts\\python.exe demo\\show_build.py skill'],
      },
      {
        id: 'tools',
        label: '2 · MCP tools',
        session: 'agent',
        kind: 'follow',
        lines: ['Clear-Host', '.\\.venv\\Scripts\\python.exe demo\\show_build.py tools'],
      },
      {
        id: 'wire',
        label: '3 · Wire them',
        session: 'agent',
        kind: 'follow',
        lines: ['Clear-Host', '.\\.venv\\Scripts\\python.exe demo\\show_build.py wire'],
      },
    ],
    notes: 'Build · agent. Press the three buttons in order. Then label the failed login and let the same tools run.',
  },
  {
    id: 'demo-f',
    group: 'Let it run',
    nav: 'Run the agent: label one failed login',
    at: '12:50',
    title: 'Run the agent: label one failed login',
    about: 'Hand it one red test and wait for a label.',
    why: 'Running the agent means that program investigates with its tools and answers PRODUCT, TEST, or INFRA. It may read the log, the last ten runs, and recent commits, and nothing else. F09 stays disabled after one failure, the history was mostly green, and a commit changed the attempt counter. PRODUCT goes to the developer, TEST back to the author, INFRA to the pipeline. The human label is PRODUCT.',
    window: 'agent',
    command: '.\\.venv\\Scripts\\python.exe triage-agent\\agent.py F09',
    watch: 'The line F09 -> PRODUCT, then why, next, and a tool trail that includes read_failure and get_test_history.',
    drift: 'If the run says the key is not set, use Show help. The human label is PRODUCT.',
    steps: [
      'Run F09 clears the screen. The run takes about 20 seconds.',
      'Wait for the line that starts with F09. A connector note above it is noise.',
      'The category, the why, and the tool names are the result. Those names are the lookups from the previous screen.',
    ],
    actions: [
      {
        id: 'f09',
        label: 'Run F09',
        session: 'agent',
        kind: 'run',
        lines: ['Clear-Host', '.\\.venv\\Scripts\\python.exe triage-agent\\agent.py F09'],
      },
      {
        id: 'help',
        label: 'Show help',
        session: 'agent',
        kind: 'fallback',
        lines: ['Clear-Host', '.\\.venv\\Scripts\\python.exe triage-agent\\agent.py --help'],
      },
    ],
    notes: 'Demo F · agent. The live verdict is whatever comes back. The human answer for this fixture is PRODUCT.',
  },
  {
    id: 'demo-g-naive',
    group: 'Check the result',
    nav: 'Agent eval: score a vague instruction',
    at: '13:15',
    title: 'Agent eval: score a vague instruction',
    about: 'Score the helper on ten known failures, using a thin instruction on purpose.',
    why: 'An agent eval is a marked set, the way you score a release: right bucket, evidence actually read, and a reason you would accept in a note. A right bucket with no evidence is not a pass. This run uses the vague prompt. The judge only scores cases that were already filed correctly.',
    window: 'evals',
    command: '.\\.venv\\Scripts\\python.exe evals\\run_evals.py --live --prompt naive --judge',
    watch: 'Accuracy, trajectory failures, and a judge mean. A failed gate exits 1. Accuracy can look fine while the trajectory shows a skipped tool.',
    drift: 'Replay the naive rehearsal file. Never present sample_run.json as a real run.',
    replayMatch: 'naive',
    actions: [
      {
        id: 'naive',
        label: 'Run',
        session: 'evals',
        kind: 'run',
        lines: ['.\\.venv\\Scripts\\python.exe evals\\run_evals.py --live --prompt naive --judge'],
      },
    ],
    notes: 'Demo G · evals. This costs money and takes minutes. If the thin prompt scores well, say it got lucky on ten cases.',
  },
  {
    id: 'demo-g-full',
    group: 'Check the result',
    nav: 'Agent eval: score a clear instruction',
    at: '13:15',
    title: 'Agent eval: score a clear instruction',
    about: 'Run the same ten failures after the instruction explains how a senior tester sorts them.',
    why: 'Compare this agent eval with the vague one. Accuracy can already look fine while the tool trail shows the history was skipped. The gates are the same: at least 80 percent correct, no skipped evidence, and a judge mean of at least 3.5.',
    window: 'evals',
    command: '.\\.venv\\Scripts\\python.exe evals\\run_evals.py --live --judge',
    watch: 'The same three layers. Gates are accuracy at least 80 percent, zero bad trajectories, and judge mean at least 3.5.',
    drift: 'Replay the full-prompt rehearsal file.',
    replayMatch: 'full',
    actions: [
      {
        id: 'full',
        label: 'Run',
        session: 'evals',
        kind: 'run',
        lines: ['.\\.venv\\Scripts\\python.exe evals\\run_evals.py --live --judge'],
      },
    ],
    notes: 'Demo G · evals. Read the layers top to bottom, then compare with the vague-instruction numbers.',
  },
  {
    id: 'prompts',
    group: 'Check the result',
    nav: 'A vague ask, then a precise one',
    at: '13:35',
    title: 'A vague ask, then a precise one',
    about: 'Ask for login tests in one line, then ask again with the shape of the answer spelled out.',
    why: '“Write test cases for login” returns the happy path. The second ask wants the open questions first, then a table you can trace to an acceptance criterion, including a negative or boundary case for each one. A table can go into the test-management tool. A paragraph cannot.',
    window: 'main',
    command: `/exit\nclaude\n${THIN}\n\n${STRUCTURED}`,
    watch: 'Questions and negative cases that appear only in the second answer.',
    drift: 'Read the two prompts on this screen if the session is still inside an older conversation. The second one reads demo/requirement.md itself.',
    actions: [
      {
        id: 'thin',
        label: 'Run thin ask',
        session: 'main',
        kind: 'run',
        lines: ['/exit', 'claude', THIN],
      },
      { id: 'structured', label: 'Run structured ask', session: 'main', kind: 'follow', lines: [STRUCTURED] },
    ],
    notes: 'Prompting · main. Let the thin answer finish, then press Run structured ask. It reads the requirement for you.',
  },
  {
    id: 'tips',
    group: 'Check the result',
    nav: 'Habits that keep the answers useful',
    at: '13:40',
    title: 'Habits that keep the answers useful',
    about: 'Use the list to decide where a new task belongs, and how to keep cost and risk in check.',
    why: 'A fact goes in CLAUDE.md. A procedure goes in a skill. A lookup goes in an MCP tool. A rule that must always run goes in a hook. A score goes in an eval. The last three lines are about money and safety: watch the cost, read every write, and keep real personal data out. The button prints the same eleven lines and does not call the API.',
    window: 'agent',
    command: '.\\.venv\\Scripts\\python.exe demo\\show_tips.py',
    watch: 'Eleven numbered lines. The same eleven are on this screen.',
    drift: 'Read the list here if the terminal is still on F09.',
    steps: [
      'CLAUDE.md stays short: facts and rules. A procedure goes in a skill.',
      'One skill, one job. The description line is how Claude decides to pick it up.',
      'A skill is the checklist. An MCP tool is a fact that checklist is allowed to look up.',
      'Allow only the tools that job needs. The triage agent has three tools and no shell.',
      'Use /clear when the task changes, so the previous answer does not leak into the next one.',
      'Ask for the open questions before the test cases.',
      'Use a hook when the rule must always run, such as blocking a secret or running the spec you just edited.',
      'If you cannot score it on a labelled set, do not trust it on a release.',
      'Watch tokens and cost. Use /cost in Claude Code, and the cache_read line on the model-router demo. A small model plus a cache is cheaper than a long chat.',
      'Keep a person in the loop on writes. Approve the edit, and do not skip the permission prompt. A hook is a backstop, not a replacement for reading the diff.',
      'Treat personal data like a secret. Real emails, names, and tickets stay out of prompts, test data, and recordings. Use named constants and fixtures, the same rule as the password hook.',
    ],
    actions: [
      {
        id: 'tips',
        label: 'Show the tips',
        session: 'agent',
        kind: 'run',
        lines: ['Clear-Host', '.\\.venv\\Scripts\\python.exe demo\\show_tips.py'],
      },
    ],
    notes: 'Habits · agent. Read two or three tips aloud, including one of the last three safety lines if time is short. Do not read all eleven.',
  },
  {
    id: 'mixups',
    group: 'Check the result',
    nav: 'Common mix-ups',
    at: '13:40',
    title: 'Common mix-ups',
    about: 'These are the pairs people treat as the same thing. They are not.',
    why: 'Each pair is the difference, then an example from this login suite. Nothing here calls the API. The habits screen is the rules. This screen is the questions.',
    window: 'agent',
    command: '.\\.venv\\Scripts\\python.exe demo\\show_mixups.py',
    watch: 'Nine headings, from Skill vs agent through RAG vs retraining.',
    drift: 'Read the list on this screen if the terminal is still on the habits.',
    steps: [
      'Skill vs agent. A skill is the recipe card. An agent is the cook who can follow it and look things up. The test-case skill writes a table in the chat. The triage agent is sent failure F09 and comes back with PRODUCT, TEST, or INFRA.',
      'Skill vs hook. A skill is advice Claude can follow. A hook always runs. “Do not paste a password” in a skill can be skipped. The secret hook refuses the save.',
      'Skill vs Agent SDK. A skill lives in the project and is used while someone is in Claude Code. The SDK is a Python program, triage-agent/agent.py, that you run from a script when nobody is sitting there.',
      'Agent vs subagent. A subagent is a specialist you call inside the chat, such as the read-only test reviewer. The SDK agent is the whole program.',
      'Skill vs MCP tool. A tool fetches one fact, such as the log. A skill says when to fetch it and what to do next.',
      'CLAUDE.md vs skill. CLAUDE.md is the house rule on the wall: accessible locators, no hard waits. A skill is the procedure for one job, such as turning a story into cases.',
      'Claude API vs Agent SDK. The API is one question and one answer, such as “label this failure.” The SDK is a loop: Claude asks for the log, the program returns it, Claude asks for the history, then it decides.',
      'One demo run vs an eval. Running F09 shows one label. An eval marks ten failures whose answers you already know.',
      'RAG vs retraining. RAG looks the answer up in your docs at the moment you ask, and cites the page. Retraining changes the model. For product rules that change every release, look them up.',
    ],
    actions: [
      {
        id: 'mixups',
        label: 'Show the mix-ups',
        session: 'agent',
        kind: 'run',
        lines: ['Clear-Host', '.\\.venv\\Scripts\\python.exe demo\\show_mixups.py'],
      },
    ],
    notes: 'After the habits. Read two pairs aloud, usually skill vs hook and skill vs SDK.',
  },
  {
    id: 'trust',
    group: 'Wrap up',
    nav: 'Trust, but verify',
    at: '13:45',
    title: 'Trust, but verify',
    about: 'Every answer today was a draft until something checked it.',
    why: 'Claude is fast and confident, and confident is not the same as correct. What made today’s answers usable was never the model on its own. It was the check that came after each one.',
    window: 'main',
    steps: [
      'The open questions went back to the product owner. Claude did not answer them.',
      'The new tests ran on save, through a hook, and a red result had to be fixed, not softened.',
      'The password was stopped by a hook, not by asking nicely in a prompt.',
      'The review came from a reviewer that is not allowed to edit.',
      'The agent was trusted only after a score on ten failures with known answers.',
    ],
    actions: [],
    notes:
      'Story only · slide 26. Tell one real story of an AI answer that looked right and was wrong, then read the five checks. Under five minutes.',
  },
  {
    id: 'compare',
    group: 'Wrap up',
    nav: 'Claude Code and the other coding agents',
    at: '13:50',
    title: 'Claude Code and the other coding agents',
    about: 'Where Claude Code sits next to Cursor, Google Antigravity, and Codex.',
    why: 'This is a talk aid, not a vendor review. Every one of these tools can write a test. What carries over is the habit: short rules, a checklist for a job, a gate that always runs, and a score on labelled cases.',
    window: 'agent',
    compare: {
      columns: ['Claude Code', 'Cursor', 'Google Antigravity', 'Codex'],
      rows: [
        {
          label: 'What you sit in',
          cells: [
            'A terminal session in the repo',
            'An editor with an agent in the sidebar',
            'Google’s agent IDE',
            'OpenAI’s coding agent, in a terminal or in ChatGPT',
          ],
        },
        {
          label: 'Where the project rules live',
          cells: [
            'CLAUDE.md, skills, and hooks',
            'Project rules and skills in the repo',
            'Its own agent artifacts',
            'Instructions and repo context you give it',
          ],
        },
        {
          label: 'How it reaches your tools',
          cells: [
            'MCP and the Agent SDK, as in this kit',
            'Its own tool and MCP-style connectors',
            'Its own tool and MCP-style connectors',
            'Its own tool and MCP-style connectors',
          ],
        },
        {
          label: 'Fit in this talk',
          cells: [
            'What the room just watched: skills, hooks, and a Python agent',
            'The same repo open in a GUI editor',
            'Another agent, not this demo',
            'Another agent, not this demo',
          ],
        },
      ],
      footnote: 'Names and products change. The habit does not.',
    },
    actions: [],
    notes:
      'Use in Q&A when someone asks “why not Cursor?”. Products change month to month; check the Antigravity and Codex rows the day before.',
  },
  {
    id: 'product-context',
    group: 'Wrap up',
    nav: 'RAG: answer from your product docs',
    at: '13:50',
    title: 'RAG: answer from your product docs',
    about: 'How do I give Claude context about my product? Let it look things up in your docs, then answer with the page it used.',
    why: 'RAG, retrieval-augmented generation, means find the right page first, then answer from it. Nothing is retrained. The story said “temporarily locked” and never said for how long. The product docs say 15 minutes, which answers the open question from the first demo.',
    window: 'agent',
    command:
      '.\\.venv\\Scripts\\python.exe product-agent\\agent.py "How long is an account locked after failed sign-ins, and who can unlock it early?"',
    watch: 'An answer that cites sign-in.md#Lockout, “in the docs: yes”, and a tool trail starting with search_docs.',
    drift: 'Press Search the docs. It shows the same retrieval with no API call.',
    steps: [
      'A few facts: CLAUDE.md. It is loaded every session, so keep it short.',
      'A folder of docs: the product-context skill. Claude Code searches product-docs/ itself and cites the file. No vector database.',
      'A helper that runs without you: the Agent SDK with search_docs and read_doc tools, and nothing else.',
      'At company scale: put your vector store, Confluence, or Jira behind the same search tool through MCP. The skill and the agent stay the same.',
    ],
    actions: [
      {
        id: 'search-docs',
        label: 'Search the docs',
        session: 'agent',
        kind: 'run',
        lines: [
          'Clear-Host',
          '.\\.venv\\Scripts\\python.exe product-agent\\agent.py --search "how long is the account locked after failed sign-ins"',
        ],
      },
      {
        id: 'ask-docs',
        label: 'Ask the agent',
        session: 'agent',
        kind: 'follow',
        lines: [
          'Clear-Host',
          '.\\.venv\\Scripts\\python.exe product-agent\\agent.py "How long is an account locked after failed sign-ins, and who can unlock it early?"',
        ],
      },
      {
        id: 'ask-missing',
        label: 'Ask something not in the docs',
        session: 'agent',
        kind: 'follow',
        lines: ['.\\.venv\\Scripts\\python.exe product-agent\\agent.py "Does sign-in support two-factor authentication by SMS?"'],
      },
      {
        id: 'skill-docs',
        label: 'Use the skill in Claude Code',
        session: 'main',
        kind: 'fallback',
        lines: ['/product-context How long is a TravelDesk account locked after three failed sign-ins? Does TD-142 say so?'],
      },
    ],
    notes:
      'Q&A, when someone asks about RAG or product context. Search first (free), then Ask the agent. The not-in-the-docs question should come back “in the docs: no”. That refusal is the point.',
  },
  {
    id: 'kit',
    group: 'Wrap up',
    nav: 'Take the kit home',
    at: '13:50',
    title: 'Take the kit home',
    about: 'Everything you saw today is one repo you can clone and run on your own suite.',
    why: 'Start small on Monday: a short CLAUDE.md and the secret-blocking hook. Add a skill the third time you type the same prompt. Add an eval before you trust an agent with a release.',
    window: 'main',
    steps: [
      'CLAUDE.md: the standing facts and rules for your project.',
      'Skills: the procedures you repeat, such as story to test cases.',
      'Subagents: a separate reviewer that cannot edit.',
      'Hooks: guarantees that run every time, such as blocking a secret.',
      'MCP tools: the lookups an agent is allowed to make.',
      'Agent SDK: the same engine inside your own program.',
      'Evals: the score that tells you a change helped.',
    ],
    qr: { src: '/kit-qr.svg', url: 'github.com/tejsinh-qa/qa-claude-starter-kit-v2' },
    actions: [],
    notes:
      'Close and Q&A · slides 27–28. If the room is quiet, ask: “What is one task you would hand to Claude on Monday?”',
  },
]
