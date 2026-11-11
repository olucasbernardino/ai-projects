# Dev log: my-game

Append-only. Never delete or rewrite an entry; add a new one to correct it.

---

## 2026-11-11: Organize notes, extend the design, first prototype

**Goal for this session:** turn the owner's notes into a design doc and a playable prototype.

**What I did:**
- Organized the four scenarios from `original-notes.docx` into one table (`docs/game-design.md`).
- Owner chose: society sim, all 4 scenarios shallow, browser HTML/JS, Portuguese game + English docs.
- Extended the Scenario 4 math pattern to scenarios 1-3 (three strategies each, one free-rider).
- Built `prototype/` (HTML + JS, no libraries) and two check scripts in `tools/`.

**Which AI helped and how:**
- Claude: organized the notes, wrote the design additions, the prototype and the checks.

**What went wrong / what surprised me:**
- The notes' own Scenario 4 parameters do **not** give the mixed equilibrium the notes claim: everyone becomes a Frontier explorer (conformists go to 0). Fixing only Frontier was not enough either. Added a crowding cost to every strategy.
- First balance attempts gave 0 winning plans; took several tuning rounds (budget 10 → 14, win line 40% → 30%, weaker rebels, stronger prestige).
- In the winning test run, 63% of Scenario 4 people are still Rebels and the game counts that as a win (Stability 37%). Thematically odd; needs an owner decision.

**Verified:**
- `python3 tools/check_scenario4.py` → notes model (C, R, F) = (0, 0.001, 0.999).
- `node tools/balance_check.js` → 218,070 plans tried, 56 win.
- Played the prototype in headless Chromium with a winning plan: reached turn 30, "Vitória", no page errors.

**Decisions:**
- All game numbers are invented design values, labelled in the code; no real-world data claims.

**Next step:** owner playtests and answers the open questions in `docs/game-design.md` §6.

**Time spent:** ~1 hour (AI session)
