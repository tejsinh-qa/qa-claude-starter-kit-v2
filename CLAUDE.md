# QA Project — Context for Claude

> Standing facts and rules for this repo. Loaded into every Claude Code session.
> Keep it short: procedures belong in skills (.claude/skills/), guarantees belong in hooks (.claude/hooks/).

## Stack
- UI & API tests: Playwright + TypeScript (`tests/*.spec.ts`)
- Run all tests: `npx playwright test`
- Run one file: `npx playwright test tests/<file>.spec.ts`
- App under test for the demo: `demo/app/login.html` (static page, no server needed)

## Test conventions
- One `test.describe` block per feature; test titles read as behaviour: `rejects login when password is empty`.
- Tag every test with its type in the title: `[positive]`, `[negative]`, `[edge]`.
- Locators: prefer `getByRole` / `getByLabel`; use `data-testid` only when no accessible locator exists. Never use XPath or CSS nth-child.
- No hard waits (`waitForTimeout`). Use web-first assertions (`await expect(locator).toBeVisible()`).
- Each test is independent — no shared state, no ordering assumptions.
- Test data lives in the test file as named constants at the top. Never real user data, never real credentials.

## When writing or changing tests
- Cover positive, negative, and edge/boundary cases — negative cases are not optional.
- State assumptions explicitly as a comment when the requirement is ambiguous. Don't silently guess.
- After editing a test, the PostToolUse hook runs that file automatically. If it fails, fix the cause — do not weaken the assertion to make it pass.

## Never
- Commit secrets, tokens, passwords, or `.env` contents (a PreToolUse hook blocks this).
- Delete or skip a failing test without explaining why in the PR description.
- Mark a flaky test as fixed by adding retries alone.
