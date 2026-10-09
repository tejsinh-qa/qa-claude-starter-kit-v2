# Talk presenter

Run of show for the QA × Claude meetup. From the repo root:

```bash
npm run showcase
```

Fullscreen the browser. The page opens three PowerShell sessions (`main`, `agent`, `evals`). **Run** types the next runbook command into the session for that demo. Approve Claude’s edits in the terminal. Arrow keys move scenes. `S` shows speaker notes.

Put `ANTHROPIC_API_KEY` in the repo `.env` file. The agent and evals terminals receive it. Main does not, so Claude Code keeps using your login. `.env` is gitignored. Restart `npm run showcase` after you save the key.
