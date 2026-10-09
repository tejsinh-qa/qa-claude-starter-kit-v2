"""Nightly triage of every failed test with the Message Batches API.

Why batches: nightly triage is not time-sensitive, and batch requests are
billed at a discount versus standard calls. Submit tonight, collect results
in the morning. Combine with prompt caching for the shared context.

Setup:
    pip install anthropic
    export ANTHROPIC_API_KEY=...
Usage:
    python api-examples/nightly_failure_triage_batch.py submit failures.json
    python api-examples/nightly_failure_triage_batch.py collect <batch_id>

failures.json format: [{"test": "login.spec.ts > ...", "error": "..."}, ...]
(The agent fixtures also work: triage-agent/fixtures/failures.json)
"""
import json
import os
import sys

import anthropic

MODEL = "claude-haiku-4-5-20251001"  # classification at volume -> fastest, cheapest tier

INSTRUCTIONS = (
    "Classify this automated test failure as INFRA, TEST, or PRODUCT. "
    "Reply as JSON: {\"category\": ..., \"reason\": <one sentence>, \"next_step\": <one sentence>}"
)


def load_failures(path: str) -> list:
    data = json.load(open(path, encoding="utf-8"))
    return data["failures"] if isinstance(data, dict) else data


def preview(path: str) -> None:
    """Print the queue. No network, no API key. This is the on-stage view."""
    failures = load_failures(path)
    print("Nightly batch preview. No request was sent.")
    print(f"Model: {MODEL}")
    print(f"Failures in the queue: {len(failures)}")
    for i, failure in enumerate(failures):
        print(f"  failure-{i:<2}  {failure.get('id', '?'):<4}  {failure.get('test', '')}")
    print("Submit sends this queue to the batch API. Collect the labels in the morning.")


def submit(path: str) -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("ANTHROPIC_API_KEY is not set in this window. Show the queue instead.")
    failures = load_failures(path)
    client = anthropic.Anthropic()
    batch = client.messages.batches.create(
        requests=[
            {
                "custom_id": f"failure-{i}",
                "params": {
                    "model": MODEL,
                    "max_tokens": 200,
                    "system": [{"type": "text", "text": INSTRUCTIONS,
                                "cache_control": {"type": "ephemeral"}}],
                    "messages": [{"role": "user",
                                  "content": f"Test: {f['test']}\nError:\n{f.get('error') or f.get('output', '')}"}],
                },
            }
            for i, f in enumerate(failures)
        ]
    )
    print(f"Submitted batch {batch.id} with {len(failures)} failures. Collect it tomorrow morning.")


def collect(batch_id: str) -> None:
    client = anthropic.Anthropic()
    batch = client.messages.batches.retrieve(batch_id)
    if batch.processing_status != "ended":
        print(f"Batch {batch_id} is still {batch.processing_status}. Try again later.")
        return
    for result in client.messages.batches.results(batch_id):
        if result.result.type == "succeeded":
            text = "".join(b.text for b in result.result.message.content if b.type == "text")
            print(f"{result.custom_id}: {text}")
        else:
            print(f"{result.custom_id}: {result.result.type}")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("preview", "submit", "collect"):
        sys.exit(__doc__)
    if sys.argv[1] == "preview":
        preview(sys.argv[2])
    elif sys.argv[1] == "submit":
        submit(sys.argv[2])
    else:
        collect(sys.argv[2])
