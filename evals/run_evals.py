"""Evaluate the failure-triage agent against a labelled golden set.

Three layers, cheapest first:
  1. Task success  — did it pick the right category?              (deterministic, free)
  2. Trajectory    — did it gather the required evidence, without   (deterministic, free)
                     wandering? (required tools, max tool calls)
  3. Reasoning     — is the reason grounded and useful?             (LLM judge, costs money)
                     Only run on cases that passed layer 1: a wrong
                     verdict has already failed, so don't pay to judge it.

Modes:
  python evals/run_evals.py --live                 run the agent on every golden case, save a recording, score it
  python evals/run_evals.py --live --judge         ...and grade reasons with an LLM judge
  python evals/run_evals.py --live --prompt naive  same eval, thin prompt: shows what prompt guidance is worth
  python evals/run_evals.py --replay evals/recordings/sample_run.json
                                                   score a saved run, no API calls (stage backup)

Exit code 1 if any gate fails, so this drops straight into CI.
"""
import argparse
import asyncio
import json
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GOLDEN = json.loads((ROOT / "evals" / "golden_set.json").read_text())
FIXTURES = {f["id"]: f for f in json.loads((ROOT / "triage-agent" / "fixtures" / "failures.json").read_text())["failures"]}

JUDGE_MODEL = "claude-haiku-4-5-20251001"  # grading a short reason against a reference: a fast tier is enough
GATES = {"accuracy": 0.80, "trajectory_failures": 0, "judge_mean": 3.5}

JUDGE_RUBRIC = """You grade the reasoning of a test-failure triage agent.

Score the agent's REASON from 1 to 5:
5 = cites the specific evidence that decides the category (history pattern, same-run failures, a named change) and the next step is concrete
4 = correct and grounded, but misses one useful piece of evidence
3 = plausible but generic; could apply to many failures
2 = partly wrong or ignores the decisive evidence
1 = unsupported or contradicts the evidence

Compare against the reviewer's reference reasoning, but accept different wording.
Reply with JSON only: {"score": <1-5>, "critique": "<one sentence>"}"""


# ---------------- running the agent ----------------

async def run_agent_on_golden(model: str, prompt: str) -> list[dict]:
    sys.path.insert(0, str(ROOT / "triage-agent"))
    from agent import triage  # imported lazily so --replay needs no SDK

    results = []
    for case in GOLDEN["cases"]:
        print(f"  running agent on {case['id']}...", flush=True)
        results.append(await triage(case["id"], model, prompt))
    return results


def judge_reason(client, case: dict, result: dict) -> dict:
    f = FIXTURES[case["id"]]
    evidence = {
        "output": f["output"], "history": f["history"],
        "tests_failed_in_same_run": f["same_run_failures"], "recent_changes": f["recent_changes"],
    }
    msg = client.messages.create(
        model=JUDGE_MODEL,
        max_tokens=200,
        system=[{"type": "text", "text": JUDGE_RUBRIC, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": (
            f"EVIDENCE:\n{json.dumps(evidence, indent=1)}\n\n"
            f"REFERENCE REASONING: {case['why']}\n\n"
            f"AGENT VERDICT: {result['verdict']['category']}\n"
            f"AGENT REASON: {result['verdict']['reason']}\n"
            f"AGENT NEXT STEP: {result['verdict'].get('next_step', '')}")}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    try:
        return json.loads(text[text.index("{"): text.rindex("}") + 1])
    except ValueError:
        return {"score": None, "critique": f"Unparseable judge reply: {text[:80]}"}


# ---------------- scoring ----------------

def score(results: list[dict]) -> dict:
    by_id = {r["id"]: r for r in results}
    per_cat = defaultdict(lambda: [0, 0])
    misses, traj_fails = [], []

    for case in GOLDEN["cases"]:
        r = by_id.get(case["id"])
        got = r["verdict"]["category"] if r else "MISSING"
        per_cat[case["expected"]][1] += 1
        if got == case["expected"]:
            per_cat[case["expected"]][0] += 1
        else:
            misses.append((case, got))

        calls = r["tool_calls"] if r else []
        missing = [t for t in GOLDEN["required_tools"] if t not in calls]
        if missing or len(calls) > GOLDEN["max_tool_calls"]:
            traj_fails.append((case["id"], calls, missing))

    correct = sum(c for c, _ in per_cat.values())
    judged = [r["judge"]["score"] for r in results if r.get("judge") and r["judge"].get("score") is not None]
    return {
        "accuracy": correct / len(GOLDEN["cases"]),
        "per_category": {k: f"{c}/{t}" for k, (c, t) in sorted(per_cat.items())},
        "misses": misses,
        "trajectory_failures": traj_fails,
        "judge_mean": sum(judged) / len(judged) if judged else None,
        "judged_count": len(judged),
        "cost_usd": sum(r.get("cost_usd") or 0 for r in results),
    }


def report(s: dict, results: list[dict]) -> bool:
    ok = True
    line = "─" * 64
    print(f"\n{line}\nLAYER 1 · Task success\n{line}")
    acc_ok = s["accuracy"] >= GATES["accuracy"]
    ok &= acc_ok
    print(f"  Accuracy: {s['accuracy']:.0%}   (gate ≥ {GATES['accuracy']:.0%})   {'PASS' if acc_ok else 'FAIL'}")
    for cat, frac in s["per_category"].items():
        print(f"    {cat:<8} {frac}")
    for case, got in s["misses"]:
        flag = "  ← the tricky one" if case.get("tricky") else ""
        print(f"  ✗ {case['id']}: expected {case['expected']}, got {got}{flag}")

    print(f"\n{line}\nLAYER 2 · Trajectory (required: {', '.join(GOLDEN['required_tools'])}; "
          f"max {GOLDEN['max_tool_calls']} calls)\n{line}")
    traj_ok = len(s["trajectory_failures"]) <= GATES["trajectory_failures"]
    ok &= traj_ok
    print(f"  Cases with a bad trajectory: {len(s['trajectory_failures'])}   {'PASS' if traj_ok else 'FAIL'}")
    for fid, calls, missing in s["trajectory_failures"]:
        why = f"skipped {', '.join(missing)}" if missing else f"{len(calls)} tool calls"
        print(f"  ✗ {fid}: {' -> '.join(calls) or '(no tools)'}   [{why}]")

    print(f"\n{line}\nLAYER 3 · Reasoning quality (LLM judge, correct verdicts only)\n{line}")
    if s["judge_mean"] is None:
        print("  Not judged in this run (add --judge).")
    else:
        j_ok = s["judge_mean"] >= GATES["judge_mean"]
        ok &= j_ok
        print(f"  Mean score: {s['judge_mean']:.1f} / 5 over {s['judged_count']} cases   "
              f"(gate ≥ {GATES['judge_mean']})   {'PASS' if j_ok else 'FAIL'}")
        for r in results:
            j = r.get("judge")
            if j and j.get("score") is not None and j["score"] <= 3:
                print(f"  ~ {r['id']} scored {j['score']}: {j['critique']}")

    if s["cost_usd"]:
        print(f"\n  Agent cost for this run: ${s['cost_usd']:.4f}")
    print(f"\n{'✅ ALL GATES PASSED' if ok else '❌ EVAL GATE FAILED — this build would be blocked'}\n")
    return ok


# ---------------- main ----------------

def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--live", action="store_true", help="run the agent now (needs ANTHROPIC_API_KEY + Claude Code)")
    mode.add_argument("--replay", metavar="RECORDING", help="score a saved run without calling any API")
    p.add_argument("--judge", action="store_true", help="grade reasons with an LLM judge (costs tokens)")
    p.add_argument("--model", default="claude-sonnet-5", help="model for the agent in --live mode")
    p.add_argument("--prompt", choices=["full", "naive"], default="full", help="agent system prompt in --live mode")
    args = p.parse_args()

    if args.live:
        if not os.environ.get("ANTHROPIC_API_KEY"):
            sys.exit("Set ANTHROPIC_API_KEY first.")
        print(f"Running triage agent ({args.model}, {args.prompt} prompt) on {len(GOLDEN['cases'])} golden cases...")
        results = asyncio.run(run_agent_on_golden(args.model, args.prompt))
        meta = {"recorded_at": datetime.now().isoformat(timespec="seconds"), "model": args.model, "prompt": args.prompt, "illustrative": False}
    else:
        rec = json.loads(Path(args.replay).read_text())
        results, meta = rec["results"], rec.get("meta", {})
        print(f"Replaying {args.replay}  (recorded {meta.get('recorded_at', '?')}, model {meta.get('model', '?')})")
        if meta.get("illustrative"):
            print("  NOTE: illustrative sample data, not a real agent run. Record your own with --live.")

    if args.judge:
        import anthropic
        client = anthropic.Anthropic()
        expected = {c["id"]: c for c in GOLDEN["cases"]}
        to_judge = [r for r in results if r["verdict"]["category"] == expected[r["id"]]["expected"]]
        print(f"Judging {len(to_judge)} correct verdicts with {JUDGE_MODEL} "
              f"(skipping {len(results) - len(to_judge)} already-failed cases)...")
        for r in to_judge:
            r["judge"] = judge_reason(client, expected[r["id"]], r)

    if args.live:
        out = ROOT / "evals" / "recordings" / f"run_{args.prompt}_{datetime.now():%Y%m%d_%H%M%S}.json"
        out.write_text(json.dumps({"meta": meta, "results": results}, indent=2))
        print(f"Saved recording: {out.relative_to(ROOT)}  (replay it on stage if the network fails)")

    return 0 if report(score(results), results) else 1


if __name__ == "__main__":
    sys.exit(main())
