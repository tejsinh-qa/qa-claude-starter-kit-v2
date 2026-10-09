---
name: flaky-test-triage
description: Diagnose why an automated test passes sometimes and fails other times, and propose a root-cause fix. Use when the user mentions a flaky, intermittent, or unstable test, or a test that fails only in CI.
---

# Flaky Test Triage

## Step 1 — Reproduce and measure
Run the test repeatedly to confirm flakiness and get a failure rate:
`npx playwright test <file> --repeat-each=10 --reporter=line`
Report: X failures out of Y runs. If it never fails locally, say so — that points toward environment differences.

## Step 2 — Check the usual suspects, in this order
1. **Timing** — hard waits (`waitForTimeout`), assertions that don't auto-retry, actions on elements before they're ready.
2. **Test isolation** — shared state, dependence on test order, data left behind by another test.
3. **Test data** — non-unique values, dates/times, randomness without a seed.
4. **Locators** — brittle selectors matching multiple elements or depending on layout.
5. **Environment** — CI vs local differences: viewport, timezone, locale, network speed, parallelism.
6. **Genuine app bug** — a real race condition in the product. This is a valid finding, not a test problem.

## Step 3 — Fix the cause, not the symptom
- Replace hard waits with web-first assertions.
- Adding `retries` alone is NOT a fix — it hides the problem. Only acceptable alongside a root-cause fix or a filed bug.
- If the root cause is a product bug, stop and hand off to the `bug-report` skill.

## Step 4 — Verify
Re-run with `--repeat-each=20`. Only call it fixed at 20/20 passes, and report the before/after failure rate.
