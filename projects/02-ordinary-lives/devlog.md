# Dev log: Ordinary Lives

Append-only. Never delete or rewrite an entry; add a new one to correct it.

---

## 2026-11-12: Sandbox prototype with fake data

**Goal for this session:** build a playable sandbox to judge the concept before any real data.

**What I did:**
- Built a Vite + TypeScript static app: dealing deck, year-by-year life simulator,
  Reality Reveal (1,000 lives), Voice (survey vs players), Lenses.
- Created 8 fictional countries, 28 indicators and about 1,260 fake observations
  from a seeded generator script, plus 19 scene templates.
- Wrote 37 tests covering the six required checks.

**Which AI helped and how:**
- Claude (Claude Code): planned, wrote all code, data files, tests and this entry.

**What went wrong / what surprised me:**
- The first calibration used "past 12 months" rates as independent yearly chances.
  Over a 45-year life almost every simulated person was asked for a bribe (100 in
  100) or discriminated against (96 in 100). I changed the recurring experiences to
  "ever happened by mid-life" and spread them over the age window. After that,
  simulated lifetime shares match the indicator (a test checks this).
- A stray shell command waited for input and looked like the simulator hanging.

**Verified:**
- `npm test` (37 passing), `npm run typecheck`, `npm run build`.
- Played one full life in headless Chromium at phone width (390 px): no console
  errors, no sideways scrolling, every screen reached.
- Not yet checked by the owner or another AI.

**Decisions:**
- Strict missing-data rule: if any year a Reveal metric needs is unmeasured, show
  "not measured here" instead of a number (missing years would otherwise count as "no").
- Data lookups accept an observation up to 5 years away, never further.

**Next step:** the owner plays 3 lives and answers the three review questions.

**Time spent:** one session.
