"""Print one piece of the agent build. No API key and no network.

    python demo/show_build.py skill
    python demo/show_build.py tools
    python demo/show_build.py wire
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / ".claude" / "skills" / "flaky-test-triage" / "SKILL.md"
TOOLS = ROOT / "triage-agent" / "tools.py"
AGENT = ROOT / "triage-agent" / "agent.py"


def skill() -> None:
    text = SKILL.read_text(encoding="utf-8")
    name = re.search(r"^name:\s*(.+)$", text, re.M)
    description = re.search(r"^description:\s*(.+)$", text, re.M)
    steps = re.findall(r"^## (.+)$", text, re.M)
    print("1. SKILL.md is the procedure.")
    print(f"   File: {SKILL.relative_to(ROOT)}")
    print(f"   Name: {name.group(1).strip() if name else '?'}")
    print(f"   Claude uses it when: {description.group(1).strip() if description else '?'}")
    print("   Steps inside the file:")
    for step in steps:
        print(f"   - {step.replace(chr(0x2014), '-').replace(chr(0x2013), '-')}")
    print("A skill does not call APIs. It tells Claude the order of work.")


def tools() -> None:
    text = TOOLS.read_text(encoding="utf-8")
    found = re.findall(r'@tool\("([^"]+)", "([^"]+)"', text)
    print("2. MCP tools are the only evidence the agent may read.")
    print(f"   File: {TOOLS.relative_to(ROOT)}")
    print("   Server name: triage")
    for tool_name, blurb in found:
        print(f"   - {tool_name}: {blurb}")
    print("Each tool is a plain function, then a thin @tool wrapper.")
    print("Claude Code sees them as mcp__triage__<tool>.")


def wire() -> None:
    text = AGENT.read_text(encoding="utf-8")
    print("3. agent.py connects the judgment to those tools and turns the rest off.")
    print(f"   File: {AGENT.relative_to(ROOT)}")
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("mcp_servers=") or stripped.startswith("allowed_tools=") or stripped.startswith("tools=") or stripped.startswith("max_turns="):
            print(f"   {stripped}")
    print("allowed_tools lists the three MCP tools. tools=[] removes the shell and file edits.")
    print("Next screen runs this agent on failure F09.")


COMMANDS = {"skill": skill, "tools": tools, "wire": wire}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        sys.exit(__doc__)
    COMMANDS[sys.argv[1]]()
