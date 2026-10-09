#!/usr/bin/env python3
"""PostToolUse hook: after Claude edits a spec file, run just that file.

If the tests fail, exit with code 2 so the failure output goes back to
Claude, which then reads it and fixes the problem in the same session.
Non-spec edits are ignored, so this stays fast.
"""
import json
import shutil
import subprocess
import sys


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_input = event.get("tool_input", {}) or {}
    file_path = tool_input.get("file_path", "") or ""
    if not file_path.endswith(".spec.ts"):
        return 0

    npx = shutil.which("npx")  # resolves npx.cmd on Windows, npx elsewhere
    if not npx:
        print("run_edited_test hook: npx not found on PATH; skipping test run.", file=sys.stderr)
        return 0
    result = subprocess.run(
        [npx, "playwright", "test", file_path, "--reporter=line"],
        capture_output=True, text=True, timeout=300,
    )
    if result.returncode == 0:
        return 0

    # Keep the tail: that's where Playwright prints the failing assertion.
    output = (result.stdout + "\n" + result.stderr).strip()
    tail = "\n".join(output.splitlines()[-60:])
    print(f"Tests in {file_path} FAILED after your edit. Fix the root cause "
          f"(do not weaken assertions):\n{tail}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
