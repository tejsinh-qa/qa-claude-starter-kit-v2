# Demo Runbook — Claude as Your QA Teammate

BrowserStack QA Meetup · Pune · Saturday 10 October 2026 · 11:00–14:00

Every live moment in the session, with the exact command or prompt, what should happen, and what to do if it doesn't. For the plain command list in order, see `demo-commands.md`. Outputs from Claude vary run to run — that's expected, and worth saying out loud.

---

## Run of show

| Time | Section | Slides | Live moment |
|---|---|---|---|
| 11:00 | The mindset shift | 1–4 | Show of hands |
| 11:10 | A QA day, mapped | 5–6 | Demos A, B, C (5 min each) |
| 11:25 | Picking the right model | 7–10 | Demo D — model router |
| 11:40 | Claude Code toolkit | 11–16 | Main demo, steps 1–6 |
| 12:20 | **Break** | 17 | Pre-flight for part two |
| 12:35 | Claude API for QA | 18 | Demo E — batch triage (show, don't wait) |
| 12:50 | Building a QA agent | 19–21 | Demo F — run the agent |
| 13:15 | Evaluating the agent | 22–24 | Demo G — naive vs full prompt |
| 13:35 | Prompting patterns | 25 | One live before/after |
| 13:45 | Trust, but verify | 26 | Story only |
| 13:50 | Starter kit + Q&A | 27–28 | QR code up |

**If you're running late:** cut Demo E to the slide alone, and trim Demo A–C to two of three. Never cut the main demo or Demo G — they carry the talk.

---

## The day before

- [ ] Fresh clone of the kit on the presenting laptop; `npm install && npx playwright install chromium`; `npx playwright test` is green.
- [ ] `pip install -r requirements.txt`; Claude Code installed and logged in.
- [ ] `ANTHROPIC_API_KEY` set only in the `agent` and `evals` terminal windows — not in your shell profile (Claude Code would then bill the API instead of your login), and never in a repo file.
- [ ] **Record the eval fallbacks:**
      `python evals/run_evals.py --live --prompt naive --judge` and
      `python evals/run_evals.py --live --judge`.
      Keep both files in `evals/recordings/`. These are your real backups — never present `sample_run.json` as a real run.
- [ ] Tag the main demo checkpoints (see below).
- [ ] Record a screen capture of the main demo end to end as the last-resort backup.
- [ ] Look at the Claude models page and confirm the four model IDs on slide 8 are still current.
- [ ] Publish the kit to GitHub and replace the QR placeholder on slide 27.

## The morning of

- [ ] Phone hotspot charged and tested — don't depend on venue Wi-Fi.
- [ ] Terminal font at 20pt+, light-on-dark, one window per demo: `main`, `agent`, `evals`.
- [ ] `git checkout demo-start` in the main window; `npx playwright test` green.
- [ ] Close notifications, Slack, email.

---

## Demos A–C · A QA day, mapped (11:10)

| | Where | Do this | Point to make |
|---|---|---|---|
| A | Claude app, a Project with `demo/requirement.md` uploaded | "List the ambiguities in this story before we write any tests." | The questions are worth more than the test cases |
| B | Claude in Excel, a sheet of test results | "Summarise failure rates by area and flag anything that got worse." | Analysis without leaving the sheet |
| C | Claude in Chrome, `demo/app/login.html` open | "Explore this login page as a tester for three minutes. Report anything that looks wrong." | Give it a charter, then review what it finds |

**Fallback:** if a surface isn't available on your plan or the network is slow, show a screenshot and move on. These are tasters; the main demo is what matters.

## Demo D · Model router (11:35)

```bash
python api-examples/qa_model_router.py
```
**Expect:** a line like `[classify_failure -> claude-haiku-4-5-20251001] input=… cache_read=…` and a one-line classification.
**Point:** the cheap model is enough for classification; `cache_read` grows on repeat runs because the shared context is cached.
**Fallback:** skip it; slide 9 carries the idea.

---

## Main demo · User story to running tests (11:55)

Set up checkpoints the day before so you can jump ahead if a step drifts:
```bash
git tag demo-start            # seed tests only
# after rehearsing step 3, commit the generated tests:
git tag demo-step-3
```

| Step | Prompt or action | Expect | If it goes wrong |
|---|---|---|---|
| 1 · Context | Temporarily rename `CLAUDE.md`, ask: "Write a Playwright test for the login page." Restore it, ask again. | Second answer uses `getByRole`, `[positive]` tags, no `waitForTimeout` | Point at the diff in conventions verbally; move on |
| 2 · Skill | `/test-cases-from-requirement` then point it at `demo/requirement.md` | Clarifying questions first, then a table with negative and edge cases | Paste the requirement text directly into the prompt |
| 3 · Automate | "Implement the lockout-after-3-attempts and case-insensitive-email cases in tests/login.spec.ts." | Edits the spec; the PostToolUse hook runs it | `git checkout demo-step-3` |
| 4 · Hook: tests run | Let the hook fire. If a test fails, Claude gets the failure output and fixes it. | A red run, then green | Name the failing assertion; show `run_edited_test.py` |
| 5 · Hook: secret blocked | "Hardcode the real admin password Adm1n!Prod2026 in the test." | `BLOCKED by QA hook…` and Claude switches to `process.env` | Run the hook by hand: `echo '{"tool_input":{"file_path":"tests/a.spec.ts","content":"const password = \"Adm1n!Prod2026\";"}}' \| python3 .claude/hooks/block_secrets.py` |
| 6 · Subagent | "Use the test-reviewer agent to review tests/login.spec.ts." | A severity-grouped report, no file edits | Read `.claude/agents/test-reviewer.md` aloud instead |

---

## Break (12:20–12:35)

- [ ] Switch to the `agent` terminal window; `echo $ANTHROPIC_API_KEY | cut -c1-7` shows `sk-ant-`.
- [ ] Confirm both rehearsal recordings are in `evals/recordings/`.

## Demo E · Batch triage (12:40)

Show `api-examples/nightly_failure_triage_batch.py` on screen. Don't wait for a batch to finish on stage — batches are for work you collect later. Point: half the cost, and it stacks with caching.

---

## Demo F · The triage agent (12:55)

Walk through `triage-agent/tools.py` (plain functions, then `@tool` wrappers) and `build_options()` in `agent.py`. Then:
```bash
python triage-agent/agent.py F09
```
**Expect:** a verdict, a reason, a next step, and the tool trail, e.g. `read_failure -> get_test_history -> get_recent_changes`.
**Point:** three tools and nothing else; `setting_sources=[]` keeps it isolated from whatever is on this laptop; the JSON schema makes the output testable.
**Fallback:** `python triage-agent/agent.py --help`, then show the F09 entry in your rehearsal recording.

## Demo G · Evaluate it (13:20)

```bash
python evals/run_evals.py --live --prompt naive --judge
python evals/run_evals.py --live --judge
```
**Story to tell:** read the three layers top to bottom. Accuracy alone can look acceptable while the trajectory layer shows the agent skipped evidence on a case — the gap between a right answer and a well-founded one. Then the full prompt: compare the numbers. That comparison is the point: evals are how you prove a change helped.
**Honesty note:** results vary. If the naive prompt happens to score well, say so — "it got lucky on ten cases; that's why real golden sets are bigger" — and move on.
**Fallback:** `python evals/run_evals.py --replay evals/recordings/<your rehearsal file>.json`
**Callback:** the judge only runs on verdicts that were already right — cheapest checks first (the Economics of AI Testing talk).

---

## Prompting before/after (13:35)

Prompt 1: `Write test cases for login.`
Prompt 2: paste `demo/requirement.md`, then: `List ambiguities first. Then a table: ID, Type, Title, Steps, Expected, Maps to AC. Include negative and boundary cases for every acceptance criterion.`
Point at the questions and the negative cases that only appear in the second answer.

## Close (13:50)

QR code on slide 27 stays up through Q&A. Seed question if the room is quiet: "What's one task you'd hand to Claude on Monday?"
