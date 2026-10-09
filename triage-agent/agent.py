"""Failure-triage agent built with the Claude Agent SDK.

Given a failed test, the agent investigates with its tools and returns a
verdict: INFRA (environment/CI), TEST (the test itself is wrong or flaky),
or PRODUCT (a real bug in the app), plus the evidence behind it.

Setup (from the repo root):
    pip install claude-agent-sdk          # also needs Claude Code installed
    export ANTHROPIC_API_KEY=...          # never hardcode it
Run one failure:
    python triage-agent/agent.py F09
Run all fixture failures:
    python triage-agent/agent.py --all
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

from claude_agent_sdk import (AssistantMessage, ClaudeAgentOptions, ResultMessage,
                              ToolUseBlock, query)

sys.path.insert(0, str(Path(__file__).parent))
from tools import ALLOWED_TOOLS, SERVER_NAME, triage_server  # noqa: E402

DEFAULT_MODEL = "claude-sonnet-5"  # check the models page for current IDs

SYSTEM_PROMPT = """You are a senior QA engineer triaging automated test failures.

For each failure, classify it as exactly one of:
- INFRA: the environment, network, CI runner, or tooling failed; the app and test are fine.
- TEST: the test itself is wrong, outdated, flaky, or badly isolated; the app behaves as intended.
- PRODUCT: the application has a real bug or violates its requirements.

How to work:
1. Always read the failure output AND the test history before deciding.
2. Check recent changes when the failure could be caused by a code or config change.
3. Don't judge by the error type alone: a timeout can be a product bug, and an
   assertion failure can be a test problem. Look at what the evidence says.
4. Intended, approved app changes that break an old assertion are TEST problems.
   Unapproved behaviour changes that break a requirement are PRODUCT problems.

Return only the structured verdict."""

# A deliberately thin prompt for the live demo: run the eval with this first,
# then with the full prompt, and let the scores show what the guidance is worth.
NAIVE_PROMPT = """You triage automated test failures. Classify each as INFRA, TEST, or PRODUCT.
Return only the structured verdict."""

PROMPTS = {"full": SYSTEM_PROMPT, "naive": NAIVE_PROMPT}

VERDICT_SCHEMA = {
    "type": "json_schema",
    "schema": {
        "type": "object",
        "properties": {
            "category": {"type": "string", "enum": ["INFRA", "TEST", "PRODUCT"]},
            "reason": {"type": "string", "description": "One or two sentences, citing specific evidence."},
            "next_step": {"type": "string", "description": "The single most useful next action."},
        },
        "required": ["category", "reason", "next_step"],
        "additionalProperties": False,
    },
}


def build_options(model: str, prompt: str = "full") -> ClaudeAgentOptions:
    return ClaudeAgentOptions(
        system_prompt=PROMPTS[prompt],
        model=model,
        mcp_servers={SERVER_NAME: triage_server},
        allowed_tools=ALLOWED_TOOLS,   # only our three tools: no shell, no file edits
        tools=[],                      # no built-in tools at all
        setting_sources=[],            # isolated: ignore any CLAUDE.md/skills on this machine
        max_turns=8,
        effort="medium",
        output_format=VERDICT_SCHEMA,
    )


async def triage(failure_id: str, model: str = DEFAULT_MODEL, prompt: str = "full") -> dict:
    """Run the agent on one failure. Returns the verdict plus the trajectory."""
    tool_calls: list[str] = []
    verdict, cost, turns = None, None, None

    async for message in query(prompt=f"Triage failure {failure_id}.", options=build_options(model, prompt)):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, ToolUseBlock):
                    tool_calls.append(block.name.split("__")[-1])  # mcp__triage__read_failure -> read_failure
        elif isinstance(message, ResultMessage):
            cost, turns = message.total_cost_usd, message.num_turns
            verdict = message.structured_output
            if verdict is None and message.result:
                try:
                    verdict = json.loads(message.result)
                except json.JSONDecodeError:
                    verdict = {"category": "UNKNOWN", "reason": message.result, "next_step": ""}

    return {
        "id": failure_id,
        "model": model,
        "prompt": prompt,
        "verdict": verdict or {"category": "UNKNOWN", "reason": "No result returned", "next_step": ""},
        "tool_calls": tool_calls,
        "turns": turns,
        "cost_usd": cost,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("failure_id", nargs="?", help="e.g. F09")
    parser.add_argument("--all", action="store_true", help="triage every fixture failure")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--prompt", choices=list(PROMPTS), default="full")
    args = parser.parse_args()

    if args.all:
        fixtures = json.loads((Path(__file__).parent / "fixtures" / "failures.json").read_text())
        ids = [f["id"] for f in fixtures["failures"]]
    elif args.failure_id:
        ids = [args.failure_id]
    else:
        parser.error("give a failure id (e.g. F09) or --all")

    for fid in ids:
        r = asyncio.run(triage(fid, args.model, args.prompt))
        v = r["verdict"]
        print(f"\n{fid}  ->  {v['category']}")
        print(f"   why:   {v['reason']}")
        print(f"   next:  {v['next_step']}")
        print(f"   tools: {' -> '.join(r['tool_calls']) or '(none)'}")


if __name__ == "__main__":
    main()
