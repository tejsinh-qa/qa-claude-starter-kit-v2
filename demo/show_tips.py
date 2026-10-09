"""Print the working rules for Claude Code. No API key and no network."""
TIPS = [
    "Keep CLAUDE.md short. Facts and rules only. Put procedures in a skill.",
    "One skill, one job. The description line is how Claude decides to pick it up.",
    "A skill is the checklist. An MCP tool is a fact the checklist is allowed to look up.",
    "Allow only the tools that job needs. The triage agent has three tools and no shell.",
    "Start a fresh conversation with /clear when the task changes. Old chat leaks into the next answer.",
    "Ask for the open questions before the test cases. A table you can trace beats a paragraph.",
    "Use a hook when the rule must always run, such as blocking a secret or running the spec you just edited.",
    "If you cannot score it on a labelled set, do not trust it on a release.",
    "Watch tokens and cost. Use /cost in Claude Code, and the cache_read line on the model-router demo. A small model plus a cache is cheaper than a long chat.",
    "Keep a person in the loop on writes. Approve the edit, and do not skip the permission prompt. A hook is a backstop, not a replacement for reading the diff.",
    "Treat personal data like a secret. Real emails, names, and tickets stay out of prompts, test data, and recordings. Use named constants and fixtures, the same rule as the password hook.",
]

print("How to get a useful result from Claude Code")
for index, tip in enumerate(TIPS, start=1):
    print(f"{index}. {tip}")
