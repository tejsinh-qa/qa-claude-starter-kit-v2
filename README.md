# QA × Claude Starter Kit

A ready-to-clone repo showing how QA engineers can get far more out of Claude than "write me a test case": standing context, reusable workflows, isolated reviewers, deterministic guardrails, and API automation.

Companion to the BrowserStack QA Meetup talk by Tejsinh Pratap Wagh.

## What's inside

| Path | Claude feature | What it does for QA |
|---|---|---|
| `CLAUDE.md` | **Project memory** — loaded every session | Your test conventions, so Claude writes tests your team's way |
| `.claude/skills/test-cases-from-requirement/` | **Skill** — on-demand procedure | Requirement → clarifying questions → structured test cases |
| `.claude/skills/bug-report/` | **Skill** | Rough notes / logs → reproducible bug report |
| `.claude/skills/flaky-test-triage/` | **Skill** | Measure, diagnose, and fix a flaky test at the root |
| `.claude/agents/test-reviewer.md` | **Subagent** — isolated, read-only | Reviews tests for flakiness and gaps without cluttering your session |
| `.claude/hooks/block_secrets.py` | **Hook** (PreToolUse) | Blocks any edit that writes a secret — deterministically |
| `.claude/hooks/run_edited_test.py` | **Hook** (PostToolUse) | Runs the spec Claude just edited; failures go straight back to Claude |
| `api-examples/qa_model_router.py` | **Claude API** — routing + prompt caching | Right model per QA task, cached shared context |
| `api-examples/nightly_failure_triage_batch.py` | **Claude API** — Message Batches | Bulk, non-urgent failure triage at a discount |
| `triage-agent/` | **Claude Agent SDK** — custom in-process tools | An agent that investigates a failed test and returns INFRA / TEST / PRODUCT with evidence |
| `evals/` | **Evaluation** — golden set, trajectory checks, LLM judge | Scores the agent in three layers and fails the build below threshold; replays saved runs offline |
| `docs/model-guide.md` | — | Which model for which QA task |
| `docs/prompting-patterns.md` | — | 10 prompting patterns that work for QA |
| `docs/demo-runbook.md` | — | Every live demo from the talk: commands, expected output, fallbacks |
| `docs/demo-commands.md` | — | Every command for the talk, start to end, Mac/Linux and Windows |

**The one-line mental model:** CLAUDE.md = standing facts · Skills = repeatable procedures · Subagents = isolated workers · Hooks = guarantees · MCP = connections to your tools · Agent SDK = the same engine inside your own code · Evals = proof it works.

## Setup
```bash
npm install
npx playwright install chromium
npx playwright test          # the seed tests should pass
```
Requires Node 18+, Python 3.10+, and Claude Code. For the API, agent and eval examples: `pip install -r requirements.txt` and `export ANTHROPIC_API_KEY=...`.

Try the eval harness with no API key at all:
```bash
python evals/run_evals.py --replay evals/recordings/sample_run.json
```
(The sample recording is illustrative, hand-written data. Record a real one with `--live`.)

## Live demo script (the talk)
1. **Context matters** — ask Claude (without CLAUDE.md) for a login test, then with it. Compare locators, tags, and waits.
2. **Skill** — `/test-cases-from-requirement` on `demo/requirement.md`. Point out the clarifying questions it raises before generating.
3. **Automate** — "Implement the lockout-after-3-attempts and case-insensitive-email cases in tests/login.spec.ts."
4. **PostToolUse hook** — the edited spec runs automatically. If a test fails, Claude reads the output and fixes it.
5. **PreToolUse hook** — ask Claude to "hardcode the real admin password in the test". The hook blocks it and Claude switches to an environment variable.
6. **Subagent** — "Use the test-reviewer agent to review tests/login.spec.ts."

### Part 5 — build and test an agent
7. **Agent** — walk through `triage-agent/agent.py` and `tools.py`, then run `python triage-agent/agent.py F09`.
8. **Eval, naive prompt** — `python evals/run_evals.py --live --prompt naive --judge`. Read the three layers.
9. **Eval, full prompt** — `python evals/run_evals.py --live --judge`. Compare. That comparison is the point: evals are how you prove a change helped.
10. **Fallback** — if anything misbehaves, `python evals/run_evals.py --replay evals/recordings/<your rehearsal run>.json`.

Backup: tag each step (`git tag demo-step-1` …) so you can jump ahead if a live step drifts.

## Safety notes
- Never paste production customer data or real credentials into any AI tool.
- Hooks run with your user permissions — read any hook before enabling it in your own repo.
- AI output is a draft. Run it, review it, own it.
