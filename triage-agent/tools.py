"""Tools the triage agent can call.

Plain functions first (easy to unit-test, no API needed), then thin wrappers
that expose them to Claude as in-process MCP tools via the Agent SDK.
"""
import json
from pathlib import Path

from claude_agent_sdk import create_sdk_mcp_server, tool

FIXTURES = Path(__file__).parent / "fixtures" / "failures.json"


def _load() -> dict:
    data = json.loads(FIXTURES.read_text())
    return {f["id"]: f for f in data["failures"]}


# ---------- plain functions (the real logic) ----------

def read_failure(failure_id: str) -> dict:
    """The raw error output for one failed test."""
    f = _load().get(failure_id)
    if not f:
        return {"error": f"No failure with id {failure_id}"}
    return {"id": f["id"], "test": f["test"], "run": f["run"], "output": f["output"]}


def get_test_history(failure_id: str) -> dict:
    """Last 10 results for this test (oldest first) and how many tests failed in the same run."""
    f = _load().get(failure_id)
    if not f:
        return {"error": f"No failure with id {failure_id}"}
    h = f["history"]
    return {
        "test": f["test"],
        "last_10_runs": h,
        "failure_rate": f"{h.count('fail')}/{len(h)}",
        "tests_failed_in_same_run": f["same_run_failures"],
    }


def get_recent_changes(failure_id: str) -> dict:
    """Commits that touched the app or test setup since this test last passed."""
    f = _load().get(failure_id)
    if not f:
        return {"error": f"No failure with id {failure_id}"}
    return {"test": f["test"], "recent_changes": f["recent_changes"] or "No relevant changes since last pass."}


# ---------- Agent SDK wrappers ----------

def _as_text(result: dict) -> dict:
    return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}


@tool("read_failure", "Read the raw error output of a failed test by failure id.", {"failure_id": str})
async def read_failure_tool(args):
    return _as_text(read_failure(args["failure_id"]))


@tool("get_test_history", "Get the last 10 pass/fail results for the failed test and how many other tests failed in the same run.", {"failure_id": str})
async def get_test_history_tool(args):
    return _as_text(get_test_history(args["failure_id"]))


@tool("get_recent_changes", "List commits that touched the app or test config since the test last passed.", {"failure_id": str})
async def get_recent_changes_tool(args):
    return _as_text(get_recent_changes(args["failure_id"]))


SERVER_NAME = "triage"
TOOL_NAMES = ["read_failure", "get_test_history", "get_recent_changes"]

triage_server = create_sdk_mcp_server(
    name=SERVER_NAME,
    version="1.0.0",
    tools=[read_failure_tool, get_test_history_tool, get_recent_changes_tool],
)

# Claude Code exposes MCP tools as mcp__<server>__<tool>
ALLOWED_TOOLS = [f"mcp__{SERVER_NAME}__{name}" for name in TOOL_NAMES]
