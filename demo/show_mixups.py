"""Print the common mix-ups. No API key and no network."""
PAIRS = [
    (
        "Skill vs agent",
        "A skill is the recipe card. An agent is the cook who can follow it and look things up.",
        "The test-case skill writes a table in the chat. The triage agent is sent failure F09 and comes back with PRODUCT, TEST, or INFRA.",
    ),
    (
        "Skill vs hook",
        "A skill is advice Claude can follow. A hook always runs.",
        '"Do not paste a password" in a skill can be skipped. The secret hook refuses the save.',
    ),
    (
        "Skill vs Agent SDK",
        "A skill lives in the project and is used while someone is in Claude Code.",
        "The SDK is a Python program, triage-agent/agent.py, that you run from a script when nobody is sitting there.",
    ),
    (
        "Agent vs subagent",
        "A subagent is a specialist you call inside the chat, such as the read-only test reviewer.",
        "The SDK agent is the whole program.",
    ),
    (
        "Skill vs MCP tool",
        "A tool fetches one fact, such as the log.",
        "A skill says when to fetch it and what to do next.",
    ),
    (
        "CLAUDE.md vs skill",
        "CLAUDE.md is the house rule on the wall: accessible locators, no hard waits.",
        "A skill is the procedure for one job, such as turning a story into cases.",
    ),
    (
        "Claude API vs Agent SDK",
        'The API is one question and one answer, such as "label this failure."',
        "The SDK is a loop: Claude asks for the log, the program returns it, Claude asks for the history, then it decides.",
    ),
    (
        "One demo run vs an eval",
        "Running F09 shows one label.",
        "An eval marks ten failures whose answers you already know.",
    ),
    (
        "RAG vs retraining",
        "RAG looks the answer up in your docs at the moment you ask, and cites the page. Retraining changes the model itself.",
        "For product rules that change every release, look them up. The product agent searches product-docs/; nothing is retrained.",
    ),
]

print("Common mix-ups")
for title, first, second in PAIRS:
    print(f"\n{title}")
    print(first)
    print(second)
