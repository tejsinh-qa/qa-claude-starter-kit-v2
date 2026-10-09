---
name: bug-report
description: Turn rough notes, a failing test, logs, or a screenshot description into a clear, reproducible bug report. Use when the user says they found a bug, pastes a failure or stack trace, or asks to "write this up".
---

# Bug Report

## Gather before writing
From what the user provided, identify: what was expected, what happened instead, exact steps, environment, and evidence (logs, screenshots, test output). If any of these are missing and cannot be inferred, ask for them in one short list — do not invent steps or environment details.

## Format

**Title:** `[Area] <what's broken> when <condition>` — e.g. `[Login] Error message not shown when password is empty`

**Severity:** Critical / High / Medium / Low — with a one-line justification based on user impact, not effort to fix.

**Environment:** build/version, browser/device, OS, test environment.

**Steps to reproduce:**
1. Numbered, one action per step, starting from a known state.

**Expected result:** observable and specific.

**Actual result:** observable and specific. Quote exact error text.

**Evidence:** relevant log lines (trimmed to the essential part), failing assertion, screenshot reference.

**Frequency:** Always / Intermittent (x of y runs) / Once.

**Suspected area (optional):** only if the evidence supports it — label clearly as a hypothesis.

## Rules
- Separate facts from hypotheses. Never present a guess about the root cause as fact.
- Trim logs to the lines that matter; don't paste 500 lines.
- Strip any tokens, passwords, emails, or customer data from logs before including them.
