# Prompting Patterns That Work for QA

Treat Claude like a sharp new teammate on day one: capable, but it doesn't know your product, your conventions, or what "done" means to you. Most weak output comes from missing context, not a weak model.

## 1. Give context before the ask
❌ `Write test cases for login.`
✅ `Here's the user story and acceptance criteria [paste]. Our app locks accounts after 3 failed attempts. We use Playwright + TypeScript. Write test cases covering positive, negative, and edge scenarios.`

## 2. Ask it to surface ambiguity first
`Before writing anything, list the ambiguities in this requirement and the assumptions you'd make.`
The questions it raises are often more valuable than the test cases — they catch requirement bugs before code exists.

## 3. Specify the output format
`Return a table with columns: ID, Type, Title, Steps, Expected Result, Maps to AC.`
Structured output is easier to review, diff, and paste into your test management tool.

## 4. Show one example of "good"
Paste one test case or test file written the way your team likes. One good example beats a paragraph of style rules.

## 5. Ask for negatives explicitly
Models lean toward the happy path unless asked. Say: `Include negative, boundary, and security-minded cases for every acceptance criterion.`

## 6. Make it check its own work
`Review your test cases: which acceptance criterion has no negative case? Fix it before returning.`

## 7. Give it the real error, not your summary
Paste the actual stack trace and failing assertion. "The test is broken" gives it nothing to work with.

## 8. Break big asks into steps
Plan first (`propose the approach, don't write code yet`), then implement. In Claude Code, use plan mode for this.

## 9. Trust, but verify — always
- Run the code it writes. Render the files it creates. Check the numbers it quotes.
- Ask where a claim comes from when it matters.
- Never paste production customer data, credentials, or secrets into a prompt.

## 10. Move repeated prompts out of chat
If you've typed the same instructions three times, make it:
- a **Project** instruction or uploaded doc (Claude apps),
- a **CLAUDE.md** entry (standing facts for a repo),
- or a **skill** (a repeatable procedure you invoke by name).
