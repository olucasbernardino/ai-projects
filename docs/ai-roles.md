# AI roles and permissions

Every AI follows `AGENTS.md`. This page says what each one is for, what it may
touch, and how it connects. The owner is the only person who merges and publishes.

## At a glance

| AI | Role | Reads the repo? | Can change the repo? | How it gets the rules |
| --- | --- | --- | --- | --- |
| Claude | Planner, builder, reviewer | Yes | Yes, through pull requests only | `CLAUDE.md` (points to `AGENTS.md`) |
| Cursor | Code and data editor | Yes | Yes, on a branch, then pull request | `AGENTS.md` + `.cursor/rules/project-rules.mdc` (automatic) |
| ChatGPT | Second opinion, explainer, fact-check helper | Only what you paste or attach | No | Paste `docs/ai-rules/chat-assistants.md` into its custom instructions |
| Gemini | Second opinion, explainer, fact-check helper | Only what you paste or attach | No | Paste `docs/ai-rules/chat-assistants.md` into its custom instructions |
| Lovable | Builds visual web apps, only when a project needs one | No (its own repository) | Only its own repository | `docs/ai-rules/lovable.md` |

## Why the limits look like this

- **One writer at a time.** Claude and Cursor both edit files. Each works on its own
  branch, so they never overwrite each other, and you review one change at a time.
- **Chat assistants stay read-only.** ChatGPT and Gemini are great for a second
  opinion, but they can't see the repo's history. Keeping them out of the files
  keeps the timestamped history trustworthy.
- **Lovable gets its own repository.** Lovable always creates a new GitHub repository
  and cannot connect to an existing one. It also syncs straight to its main branch.
  So a Lovable app lives in its own repo, and this portfolio links to it.
- **Cross-checking is a feature.** When one AI produces a number or claim, ask a
  different AI to check it against the source. Record the check in the dev log.

## Enforcement status

| Rule | Enforced by GitHub? | Notes |
| --- | --- | --- |
| No direct commits to `main` | Not yet | Branch protection on private repos needs a paid plan. Free if the repo is public. Until then, the rule is enforced by `AGENTS.md` and by you. |
| Pull request checklist | Yes | `.github/pull_request_template.md` appears on every pull request. |
| AI disclosure | By review | Checked by you before merging. |

## Adding a new AI later

1. Add a row to the table above.
2. Point the tool at `AGENTS.md` (or paste the chat rules if it can't read files).
3. Log the decision in the current project's `devlog.md`.
