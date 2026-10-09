# Which Claude Model for Which QA Task

> Model lineups and prices change often. Before relying on anything here, check the official
> models page: https://docs.claude.com/en/docs/about-claude/models/overview

## The current public lineup

| Tier | Model | API ID | Think of it as |
|---|---|---|---|
| Fast | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | The high-volume workhorse — fast and cheap |
| Balanced | Claude Sonnet 5 | `claude-sonnet-5` | The everyday default for most QA work |
| Deep | Claude Opus 5.5 | `claude-opus-5-5` | Hard, multi-step reasoning and complex agents |
| Frontier | Claude Fable 5.1 | `claude-fable-5-1` | The ceiling — hardest, longest-running work |

(Above Fable sits the limited-access Mythos tier, available to a small set of organizations — not something most QA teams will use.)

## Rule of thumb
**Start with the cheapest model that plausibly does the job. Escalate only when you can show a quality gap on real examples.**
For high-stakes work, you can run it the other way: set a quality baseline on a top model, then test whether a cheaper one matches it.

## QA task → starting model

| QA task | Start with | Escalate when |
|---|---|---|
| Classifying test failures (infra / test / product) at scale | Haiku | Classifications are wrong on your real logs |
| Extracting fields from logs, bug reports, tickets | Haiku | Source is messy or ambiguous |
| Writing test cases from requirements | Sonnet | Domain is complex or requirements are long and interlinked |
| Writing / refactoring automation code | Sonnet | Large codebase changes across many files |
| Reviewing test code for flakiness and gaps | Sonnet | — usually sufficient |
| Root-cause analysis across services, logs, and code | Opus | Long investigations that keep hitting dead ends |
| Long-running agentic work (migrating a whole suite) | Opus | Capability matters more than cost → Fable |
| LLM-as-judge evaluation | Match the task's difficulty | Judge disagrees with human reviewers |

## Other levers besides the model
- **Effort / thinking** — newer models let you trade depth of reasoning against speed and cost within the same model. Try lower effort before switching to a smaller model.
- **Prompt caching** — reuse a large stable prefix (conventions, product docs) across calls at a big discount.
- **Message Batches** — non-urgent bulk work (nightly triage, dataset evaluation) at a discount.
- **Context size** — don't paste the whole repo. Give the relevant files; let tools fetch the rest.
