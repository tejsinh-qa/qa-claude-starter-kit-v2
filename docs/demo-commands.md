# Demo Commands — Start to End

BrowserStack QA Meetup · Pune · Saturday 10 October 2026 · 11:00–14:00

Every command for the talk, in the order you run it. Mac/Linux first; Windows (PowerShell) variants are marked **Win**. Times match the run of show in `demo-runbook.md`.

**Three terminal windows on stage:**

| Window | Used for | API key set? |
|---|---|---|
| `main` | Claude Code and the main demo | **No** — Claude Code should use your Claude login |
| `agent` | Demos D, E, F | Yes |
| `evals` | Demo G | Yes |

---

## 0 · One-time setup (the day before)

### 0.1 Unpack and install
```bash
unzip qa-claude-starter-kit.zip
cd qa-claude-starter-kit

npm install
npx playwright install chromium
npx playwright test                 # expect: 2 passed
```

### 0.2 Python environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
**Win:**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
**Win only:** in `.claude/settings.json`, change both `python3` to `python`.

### 0.3 Check Claude Code
```bash
claude --version
claude                              # log in if asked; trust the folder when prompted
/exit
```

### 0.4 Put the kit under git
```bash
git init
git add .
git commit -m "starter kit"
```

### 0.5 Record the eval fallbacks (in the `evals` window)
Set the key in **this window only**, never in your shell profile:
```bash
source .venv/bin/activate
export ANTHROPIC_API_KEY=sk-ant-...
```
**Win:** `.venv\Scripts\Activate.ps1` then `$env:ANTHROPIC_API_KEY="sk-ant-..."`

```bash
python evals/run_evals.py --replay evals/recordings/sample_run.json   # no API call; proves the harness works
python evals/run_evals.py --live --prompt naive --judge               # records run_naive_<timestamp>.json
python evals/run_evals.py --live --judge                              # records run_full_<timestamp>.json
ls evals/recordings                                                   # Win: dir evals\recordings
```
Note both file names. These are your real backups; `sample_run.json` is hand-written and must never be shown as a real run.

### 0.6 Rehearse the agent once
```bash
python triage-agent/agent.py F09
python api-examples/qa_model_router.py
```

### 0.7 Commit the recordings and tag the starting point
```bash
git add evals/recordings
git commit -m "rehearsal recordings"
git tag demo-start
```

### 0.8 Rehearse the main demo and save a checkpoint after step 3
Run section 3 below once. After step 3 has produced green tests:
```bash
git add -A
git commit -m "demo step 3"
git tag demo-step-3
```

### 0.9 Reset to the start
```bash
git reset --hard demo-start
git clean -fd
npx playwright test                 # expect: 2 passed
```

---

## 1 · Morning of the talk

In `main` (no API key):
```bash
cd qa-claude-starter-kit
git status                          # expect: clean
git reset --hard demo-start         # only if it isn't clean
npx playwright test                 # expect: 2 passed
```
In `agent` and `evals`:
```bash
cd qa-claude-starter-kit
source .venv/bin/activate           # Win: .venv\Scripts\Activate.ps1
export ANTHROPIC_API_KEY=sk-ant-... # Win: $env:ANTHROPIC_API_KEY="sk-ant-..."
```

---

## 2 · Demo D — Model router (11:35) · `agent` window

```bash
python api-examples/qa_model_router.py
```
**Expect:** `[classify_failure -> claude-haiku-4-5-20251001] input=… cache_read=…` and a one-line verdict. Run it a second time: `cache_read` goes up.
**Fallback:** skip it; slide 9 carries the idea.

---

## 3 · Main demo — User story to running tests (11:55) · `main` window

### Step 1 · Context matters
CLAUDE.md is read when a session starts, so rename it **before** launching Claude Code.
```bash
mv CLAUDE.md CLAUDE.md.bak
claude
```
> Write a Playwright test for the login page.

```
/exit
```
```bash
mv CLAUDE.md.bak CLAUDE.md
claude
```
> Write a Playwright test for the login page.

**Point:** the second answer uses `getByRole`, `[positive]` / `[negative]` tags and no `waitForTimeout`.
If Claude offered to save a file in the first run, decline, or delete it before moving on.

Show the toolkit inside the same session:
```
/memory
/hooks
/agents
/
```
(`/` lists the skills — point at `test-cases-from-requirement`, `bug-report` and `flaky-test-triage`.)

### Step 2 · Skill
```
/test-cases-from-requirement demo/requirement.md
```
**Expect:** clarifying questions first, then a test-case table with negative and edge cases.
**Fallback:** paste the text of `demo/requirement.md` into the prompt.

### Step 3 · Automate
> Implement the lockout-after-3-attempts and case-insensitive-email cases in tests/login.spec.ts.

Approve the edit when asked.
**Fallback (in a second terminal, or type `!` first inside Claude Code):**
```bash
git reset --hard demo-step-3
```

### Step 4 · Hook runs the tests
Nothing to type. The PostToolUse hook runs `tests/login.spec.ts` after the edit. If it goes red, Claude reads the failure and fixes it.
To show the result yourself:
```bash
npx playwright test tests/login.spec.ts
```

### Step 5 · Hook blocks a secret
> Hardcode the real admin password Adm1n!Prod2026 in the test.

**Expect:** `BLOCKED by QA hook…`, then Claude switches to `process.env`.
**Fallback (run the hook by hand; Mac/Linux or Git Bash):**
```bash
echo '{"tool_input":{"file_path":"tests/a.spec.ts","content":"const password = \"Adm1n!Prod2026\";"}}' | python3 .claude/hooks/block_secrets.py
echo $?                             # expect: 2
```
**Win (PowerShell):**
```powershell
'{"tool_input":{"file_path":"tests/a.spec.ts","content":"const password = \"Adm1n!Prod2026\";"}}' | python .claude\hooks\block_secrets.py
$LASTEXITCODE                       # expect: 2
```

### Step 6 · Subagent
> Use the test-reviewer agent to review tests/login.spec.ts.

**Expect:** a severity-grouped review and no file edits.
**Fallback:** open `.claude/agents/test-reviewer.md` and read it aloud.

```
/exit
```

---

## 4 · Break (12:20–12:35) · pre-flight

In `agent`:
```bash
echo $ANTHROPIC_API_KEY | cut -c1-7  # expect: sk-ant-
ls evals/recordings                  # expect: your two rehearsal files
```
**Win:**
```powershell
$env:ANTHROPIC_API_KEY.Substring(0,7)
dir evals\recordings
```

---

## 5 · Demo E — Batch triage (12:40) · `agent` window

Show the code; don't wait for a batch on stage.
```bash
code api-examples/nightly_failure_triage_batch.py   # or open it in any editor
```
Optional, if you want a real batch ID on screen:
```bash
python api-examples/nightly_failure_triage_batch.py submit triage-agent/fixtures/failures.json
python api-examples/nightly_failure_triage_batch.py collect <batch_id>   # later, or after the talk
```

---

## 6 · Demo F — The triage agent (12:55) · `agent` window

Walk through the code first:
```bash
code triage-agent/tools.py triage-agent/agent.py
```
Then run it:
```bash
python triage-agent/agent.py F09
```
**Expect:** a verdict (PRODUCT), a reason, a next step, and the tool trail, e.g. `read_failure -> get_test_history -> get_recent_changes`.

Optional extras if time allows:
```bash
python triage-agent/agent.py F09 --prompt naive   # same case, thin prompt
python triage-agent/agent.py --all                # all ten fixtures (takes a few minutes)
```
**Fallback:** `python triage-agent/agent.py --help`, then open your rehearsal recording and show the F09 entry.

---

## 7 · Demo G — Evaluate it (13:20) · `evals` window

```bash
python evals/run_evals.py --live --prompt naive --judge
python evals/run_evals.py --live --judge
```
**Expect:** three layers per run (accuracy, trajectory, judge) and a PASS/FAIL gate. A failed gate exits with code 1:
```bash
echo $?                             # Win: $LASTEXITCODE
```
**Fallback (no network, or too slow):**
```bash
python evals/run_evals.py --replay evals/recordings/run_naive_<timestamp>.json
python evals/run_evals.py --replay evals/recordings/run_full_<timestamp>.json
```

---

## 8 · Prompting before/after (13:35)

In the Claude app or a fresh `claude` session in `main`:

Prompt 1:
> Write test cases for login.

Prompt 2 (paste `demo/requirement.md` first):
> List ambiguities first. Then a table: ID, Type, Title, Steps, Expected, Maps to AC. Include negative and boundary cases for every acceptance criterion.

---

## 9 · After the talk — reset

```bash
git reset --hard demo-start
git clean -fd
```
New recordings from the live runs are untracked, so `git clean -fd` deletes them. Copy them out first if you want to keep them.

---

## Quick reference

| When | Command |
|---|---|
| Seed tests | `npx playwright test` |
| Model router | `python api-examples/qa_model_router.py` |
| Agent, one case | `python triage-agent/agent.py F09` |
| Eval, naive | `python evals/run_evals.py --live --prompt naive --judge` |
| Eval, full | `python evals/run_evals.py --live --judge` |
| Eval, offline | `python evals/run_evals.py --replay evals/recordings/<file>.json` |
| Jump to step 3 | `git reset --hard demo-step-3` |
| Back to start | `git reset --hard demo-start` |
