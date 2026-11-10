# Rules for AI assistants

This file is the single source of truth for every AI that works on this repository
(Claude, Cursor, ChatGPT, Gemini, Lovable and any future tool). Tool-specific files
only point here. If a tool-specific file and this file disagree, this file wins.

## The project in one paragraph

A public portfolio of AI projects built by a beginner who learns by building.
Audience: employers and potential clients, plus a blog. Every project must be
honest and verifiable: claims are checked, data sources are documented, and the
dev log records what really happened, failures included.

## Hard limits (never break these)

1. **Never commit directly to `main`.** Work on a new branch named
   `ai/<tool>/<short-task>` (example: `ai/cursor/clean-eurostat-data`) and open a
   pull request. The owner reviews and merges. No exceptions, even for typos.
2. **Never invent data, numbers, quotes or sources.** If a number is not in a
   documented source in `sources.md`, it does not go into the project.
3. **Never edit files in `data/raw/`.** Raw downloads stay exactly as downloaded.
   All cleaning happens in code or in `data/processed/`, with the steps recorded.
4. **Never delete or rewrite dev log entries.** Add a new dated entry to correct
   something; the history of mistakes is part of the portfolio.
5. **Never add secrets** (API keys, passwords, tokens, personal data) to any file.
6. **Never publish anything** (blog post, page, release) — only the owner publishes.
7. **Stay inside the task.** Change only the files the task needs. If you notice
   another problem, mention it in the pull request instead of fixing it.

## What every AI must do

- **Cite every number.** Each figure in a report links to a row in the project's
  `sources.md` (dataset code, URL, date accessed, exact filter used).
- **Show your work.** Any calculation is done in a script or a documented formula,
  never "computed in your head" and pasted in.
- **Disclose AI use.** Every pull request says which AI did what (the PR template
  has a section for it). Commits made by an AI use that AI's name as author or
  include `Co-authored-by` for it.
- **Mark uncertainty.** Write `TODO-VERIFY:` next to anything not yet checked.
  A pull request with any `TODO-VERIFY:` left cannot be merged.
- **Explain for a beginner.** The owner is learning. In pull requests and chat,
  explain *why* in plain words, not only *what*.
- **Follow the verification checklist** in `docs/verification-checklist.md`
  before saying any work is done.

## Repository map

| Path | What lives there |
| --- | --- |
| `projects/NN-name/` | One folder per portfolio project |
| `projects/NN-name/devlog.md` | Honest, dated log of the work (append only) |
| `projects/NN-name/sources.md` | Every data source and how it was used |
| `projects/NN-name/data/raw/` | Untouched downloads (read only) |
| `projects/NN-name/data/processed/` | Cleaned data produced by documented steps |
| `docs/` | Rules, checklists and guides that apply to all projects |
| `templates/` | Starting files for dev logs, case studies and source records |

## Roles by tool

See `docs/ai-roles.md` for what each AI is allowed to do and how it connects.
