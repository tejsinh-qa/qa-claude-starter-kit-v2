---
name: product-context
description: Answer how TravelDesk is supposed to behave, or check a story, test, or bug against the product docs in product-docs/. Use when the user asks what a rule, limit, message, or flow is, or whether a requirement or test matches the documented behaviour.
---

# Product context

The product docs in `product-docs/` are the source of truth for how TravelDesk behaves. Look things up there before answering. Do not answer product questions from general knowledge.

## Step 1 — Search
Grep `product-docs/` for the key nouns in the question (for example `lock`, `attempt`, `reset`). Try a synonym if the first search finds nothing.

## Step 2 — Read the section
Read the matching `##` section in full, plus any release note that mentions the same feature. A release note can change or break a documented rule.

## Step 3 — Answer with a citation
Answer in two to four plain sentences. Cite every fact as `file#section`, for example `sign-in.md#Lockout`.

## Step 4 — When the docs are silent or disagree
- Silent: say "Not in the product docs", list it as an open question for the product owner, and stop. Do not guess a number, a message, or a limit.
- Disagree: if the docs contradict the story, a test, or a release note, show a short table: what each source says, and which one a tester should trust until the product owner decides.

## Step 5 — Hand off
- If the question was about a story, offer to run `test-cases-from-requirement` with the answers filled in.
- If a release note shows a known issue that breaks a documented rule, offer the `bug-report` skill.
