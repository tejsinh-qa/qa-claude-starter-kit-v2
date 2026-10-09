"""Route QA tasks to the right Claude model, with prompt caching.

Pattern: start with the cheapest model that can do the job, escalate only
when the task needs it. The shared QA context (conventions, product notes)
is marked cacheable, so repeated calls reuse it at a fraction of the cost.

Setup:
    pip install anthropic
    export ANTHROPIC_API_KEY=...        # never hardcode it
Run:
    python api-examples/qa_model_router.py
Model IDs change over time — check the current list before your talk/demo:
    https://docs.claude.com/en/docs/about-claude/models/overview
"""
import os
import sys

import anthropic

# Current public model IDs (verify against the models page before use).
MODELS = {
    "fast": "claude-haiku-4-5-20251001",   # high-volume, simple: classify/triage/extract
    "balanced": "claude-sonnet-5",          # default: test design, code, review
    "deep": "claude-opus-5-5",              # hard: multi-system root cause, complex agents
    "frontier": "claude-fable-5-1",         # hardest long-running work, when cost is secondary
}

# Which tier each QA task starts at. Escalate only when evaluation shows a gap.
TASK_ROUTING = {
    "classify_failure": "fast",       # "is this failure infra, test, or product?"
    "generate_test_cases": "balanced",
    "review_test_code": "balanced",
    "root_cause_analysis": "deep",
}

# Large, stable context shared by every call -> ideal for prompt caching.
QA_CONTEXT = open(os.path.join(os.path.dirname(__file__), "..", "CLAUDE.md")).read()


def ask(task: str, user_prompt: str, max_tokens: int = 1500) -> str:
    model = MODELS[TASK_ROUTING[task]]
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=[
            {"type": "text", "text": "You are a senior QA engineer. Be precise and concise."},
            {
                "type": "text",
                "text": QA_CONTEXT,
                # Cache the stable project context: later calls read it from cache.
                "cache_control": {"type": "ephemeral"},
            },
        ],
        messages=[{"role": "user", "content": user_prompt}],
    )
    usage = response.usage
    print(f"[{task} -> {model}] input={usage.input_tokens} "
          f"cache_read={getattr(usage, 'cache_read_input_tokens', 0)} output={usage.output_tokens}")
    return "".join(block.text for block in response.content if block.type == "text")


if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY first (export it in your shell — never commit it).")

    failure_log = (
        "TimeoutError: locator.click: Timeout 30000ms exceeded.\n"
        "waiting for getByRole('button', { name: 'Sign in' })\n"
        "  - element is disabled"
    )
    print(ask("classify_failure",
              "Classify this failure as INFRA, TEST, or PRODUCT, with a one-line reason:\n" + failure_log,
              max_tokens=200))
