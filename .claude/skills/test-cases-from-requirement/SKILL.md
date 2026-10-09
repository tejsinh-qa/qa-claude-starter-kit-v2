---
name: test-cases-from-requirement
description: Turn a user story or requirement into a structured, reviewable set of test cases covering positive, negative, and edge scenarios. Use when the user shares a requirement, user story, acceptance criteria, or asks "what should we test".
---

# Test Cases from a Requirement

## Step 1 — Understand before generating
Read the requirement fully. Before writing any test cases, list:
- **Acceptance criteria** you extracted (numbered).
- **Ambiguities / open questions** — anything a developer could implement two ways. Do not guess silently; list them.
- **Assumptions** you will make to proceed, each marked as an assumption.

## Step 2 — Generate test cases
Produce a table with these columns:

| ID | Type | Title | Preconditions | Steps | Expected result | Maps to AC |
|----|------|-------|---------------|-------|-----------------|------------|

Rules:
- **Type** is one of: Positive, Negative, Edge, Security, Accessibility.
- Every acceptance criterion maps to at least one Positive and one Negative case.
- Include boundary values explicitly (min, min-1, max, max+1, empty, whitespace-only, very long input).
- Include at least one security-minded case where input is user-controlled (injection-style strings, script tags).
- Titles describe behaviour: "Rejects login when password is empty", not "Test 3".

## Step 3 — Self-review before returning
Check your own table and fix it before replying:
- Any acceptance criterion with no negative case? Add one.
- Any two cases that test the same thing? Merge them.
- Any expected result that is vague ("works correctly")? Make it observable and specific.

## Step 4 — Output
1. The clarifying questions (Step 1) first — these are often the most valuable output.
2. The test case table.
3. A one-line suggestion of which 3–5 cases to automate first and why (highest risk × most stable).
