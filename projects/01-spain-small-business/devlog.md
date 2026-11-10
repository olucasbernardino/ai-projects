# Dev log: Small businesses in Spain vs the EU

Append-only. Never delete or rewrite an entry; add a new one to correct it.

---

## 2026-11-10: Planning and setup

**Goal for this session:** define the portfolio's goal and choose project #1.

**What I did:**
- Defined the portfolio goal with Claude through a question-by-question session.
- Chose the tools: GitHub for the board, dev log and proof of work; GitHub Pages
  for the portfolio and blog. Linear, Notion and Trello were considered and set aside.
- Chose project #1: a public data report on small businesses, Spain vs EU average.
- Created this repository and its rules for AI assistants (`AGENTS.md`).

**Which AI helped and how:**
- Claude: asked the planning questions, recommended options with reasons, checked
  current free-plan limits and Eurostat dataset availability on the web, and wrote
  the repository setup files.

**What went wrong / what surprised me:**
- On the first question I clicked the wrong answer and had to ask again.
- I planned to use Linear, then changed my mind; switched to GitHub.
- GitHub's "review before merge" protection is not available on private
  repositories with a free plan, so for now that rule depends on discipline.
- Lovable cannot connect to an existing repository, so any Lovable app will need
  its own repository.

**Verified:**
- Eurostat publishes comparable data for all five indicators (structural business
  statistics by size class; business demography with birth, death and survival
  rates). Checked on Eurostat's own pages by Claude. Dataset codes still to be
  confirmed at download time. TODO-VERIFY: exact dataset codes and latest year.

**Decisions:**
- Start narrow, build wide: Spain vs EU first, more countries later.
- Other AIs propose changes through pull requests; I approve before anything lands.

**Next step:** create the board, then download the first Eurostat dataset.

**Time spent:** about 1 hour

---

## 2026-11-10: Board created

**What I did:**
- Created the GitHub Projects board "AI Projects Portfolio" with columns Todo,
  In Progress, In review, Done. It imports every open issue of this repository.
- 11 tasks for Project 01 created as GitHub issues, grouped under the milestone
  "Project 01: Spain vs EU small businesses" (due 2026-12-01).

**Which AI helped and how:**
- Claude: created the tasks through GitHub's API and the board in my Chrome, with
  my approval; opened this change as a pull request for me to review.

**What went wrong / what surprised me:**
- GitHub does not let this AI session create boards through its API, so the board
  was created by clicking through the website instead.

**Next step:** review and merge this pull request (my first one).
