"""Product-knowledge agent built with the Claude Agent SDK.

Ask a question about how TravelDesk should behave. The agent searches the
product docs with its tools, answers only from what it found, and cites
the file and section. If the docs do not say, it says so instead of guessing.
This is retrieval-augmented generation (RAG): look it up, then answer.

Setup (from the repo root):
    pip install claude-agent-sdk          # also needs Claude Code installed
    export ANTHROPIC_API_KEY=...          # never hardcode it
Ask a question:
    python product-agent/agent.py "How long is an account locked after failed sign-ins?"
See what retrieval finds, with no API call:
    python product-agent/agent.py --search "account locked failed sign-ins"
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

from claude_agent_sdk import (AssistantMessage, ClaudeAgentOptions, ResultMessage,
                              ToolUseBlock, query)

sys.path.insert(0, str(Path(__file__).parent))
from tools import ALLOWED_TOOLS, SERVER_NAME, product_server, search_docs  # noqa: E402

DEFAULT_MODEL = "claude-haiku-4-5-20251001"  # retrieval does the heavy lifting; check the models page for current IDs

SYSTEM_PROMPT = """You answer QA questions about the TravelDesk product.

How to work:
1. Always call search_docs before answering. Try a second search with different words if the first misses.
2. Call read_doc when a section is cut short or you need the surrounding rules.
3. Answer only from what the tools returned. Cite every fact as file#section.
4. If the docs do not answer the question, set found to false, say what is missing,
   and name it as an open question for the product owner. Never fill the gap from general knowledge.
5. If the docs contradict a story, a test, or a release note, say so plainly.

Return only the structured answer."""

ANSWER_SCHEMA = {
    "type": "json_schema",
    "schema": {
        "type": "object",
        "properties": {
            "answer": {"type": "string", "description": "Two to four sentences, plain language."},
            "sources": {"type": "array", "items": {"type": "string"}, "description": "file#section for every fact used."},
            "found": {"type": "boolean", "description": "False when the docs do not answer the question."},
        },
        "required": ["answer", "sources", "found"],
        "additionalProperties": False,
    },
}


def build_options(model: str) -> ClaudeAgentOptions:
    return ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT,
        model=model,
        mcp_servers={SERVER_NAME: product_server},
        allowed_tools=ALLOWED_TOOLS,   # search, read, list: no shell, no file edits, no web
        tools=[],                      # no built-in tools at all
        setting_sources=[],            # isolated: ignore any CLAUDE.md/skills on this machine
        max_turns=6,
        output_format=ANSWER_SCHEMA,
    )


async def ask(question: str, model: str = DEFAULT_MODEL) -> dict:
    tool_calls: list[str] = []
    answer, cost = None, None

    async for message in query(prompt=question, options=build_options(model)):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, ToolUseBlock) and block.name.startswith("mcp__"):
                    tool_calls.append(block.name.split("__")[-1])
        elif isinstance(message, ResultMessage):
            cost = message.total_cost_usd
            answer = message.structured_output
            if answer is None and message.result:
                try:
                    answer = json.loads(message.result)
                except json.JSONDecodeError:
                    answer = {"answer": message.result, "sources": [], "found": False}

    return {
        "question": question,
        "answer": answer or {"answer": "No result returned", "sources": [], "found": False},
        "tool_calls": tool_calls,
        "cost_usd": cost,
    }


def show_search(text: str) -> None:
    result = search_docs(text)
    print(f"Search: {text}")
    print("No request was sent. This is the retrieval step on its own.\n")
    if not result["results"]:
        print("No matching section. The agent would answer: not in the docs.")
    for hit in result["results"]:
        print(f"[{hit['score']}] {hit['source']}")
        for line in hit["text"].splitlines():
            if line.strip():
                print(f"    {line.strip()}")
        print()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("question", nargs="?", help="a question about the product, in quotes")
    parser.add_argument("--search", metavar="TEXT", help="show retrieval results only, no API call")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()

    if args.search:
        show_search(args.search)
        return
    if not args.question:
        parser.error('ask a question in quotes, or use --search "words"')

    r = asyncio.run(ask(args.question, args.model))
    a = r["answer"]
    print(f"\nQ: {r['question']}")
    print(f"A: {a['answer']}")
    print(f"   sources: {', '.join(a['sources']) or '(none)'}")
    print(f"   in the docs: {'yes' if a['found'] else 'no'}")
    print(f"   tools: {' -> '.join(r['tool_calls']) or '(none)'}")


if __name__ == "__main__":
    main()
