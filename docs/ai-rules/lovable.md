# Rules for Lovable

Use Lovable only when a project needs a visual web app (for example, an
interactive tool for a client case). Most projects in this portfolio do not.

## How it connects

- Lovable always creates a **new** GitHub repository; it cannot use this one.
- Its sync is two-way and works on one branch, usually `main`.
- So each Lovable app lives in its **own** repository, named
  `ai-projects-<project-name>-app`, and this portfolio links to it from the
  project's `README.md`.

## Limits

1. Paste the rules from `docs/ai-rules/chat-assistants.md` into the Lovable
   project's knowledge or instructions, and add: "Never put real personal data
   or secrets in the app."
2. Data shown in the app comes from this repository's `data/processed/` files,
   never typed in by hand.
3. Before linking the app from the portfolio, run the verification checklist
   (`docs/verification-checklist.md`) on what the app displays.
4. Record in the project's `devlog.md` what Lovable built and what you changed.
