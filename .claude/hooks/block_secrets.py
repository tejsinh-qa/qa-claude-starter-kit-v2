#!/usr/bin/env python3
"""PreToolUse hook: block Claude from writing secrets into any file.

Claude Code sends the pending tool call as JSON on stdin. We inspect the
content about to be written (Write -> content, Edit -> new_string) and
exit with code 2 to BLOCK the call if it looks like a credential.
Exit code 2 sends our stderr message back to Claude so it can self-correct.
"""
import json
import re
import sys

SECRET_PATTERNS = [
    (r"sk-ant-[A-Za-z0-9_\-]{20,}", "Anthropic API key"),
    (r"AKIA[0-9A-Z]{16}", "AWS access key"),
    (r"ghp_[A-Za-z0-9]{36}", "GitHub personal access token"),
    (r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----", "private key"),
    (r"(?i)(password|passwd|pwd|secret|api_key|apikey|token)\s*[:=]\s*['\"][^'\"\s]{8,}['\"]",
     "hardcoded credential"),
]

# Obvious placeholders / demo values are allowed so test data still works.
ALLOWED_VALUES = re.compile(r"(?i)(changeme|placeholder|example|dummy|test[_-]?pass|xxxxx|<[^>]+>|\$\{)")

PROTECTED_FILES = re.compile(r"(^|/)(\.env(\..*)?|id_rsa|.*\.pem|credentials(\.json)?)$")


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0  # not our business; never break the session on bad input

    tool_input = event.get("tool_input", {}) or {}
    file_path = tool_input.get("file_path", "") or ""
    text = tool_input.get("content") or tool_input.get("new_string") or ""

    if PROTECTED_FILES.search(file_path):
        print(f"BLOCKED by QA hook: '{file_path}' is a protected secrets file. "
              "Do not create or edit it — reference an environment variable instead.",
              file=sys.stderr)
        return 2

    for pattern, label in SECRET_PATTERNS:
        for match in re.finditer(pattern, text):
            if ALLOWED_VALUES.search(match.group(0)):
                continue
            print(f"BLOCKED by QA hook: this change contains what looks like a {label} "
                  f"in '{file_path or 'the target file'}'. Move it to an environment variable "
                  "(e.g. process.env.TEST_PASSWORD) and retry.",
                  file=sys.stderr)
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
