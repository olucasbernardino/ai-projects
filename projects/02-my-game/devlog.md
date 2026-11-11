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

---

## 2026-11-11: Owner decisions after first prototype

**Goal for this session:** record the owner's answers to the open design questions.

**What I did:**
- Logged four decisions in `docs/game-design.md` §7 (shared prestige, dark path allowed, citizen events next, Rebels < 20% for stability).

**Which AI helped and how:**
- Claude: asked the questions and recorded answers. The owner left the stability rule to Claude, which chose Rebels < 20% to match the original notes.

**What went wrong / what surprised me:**
- Nothing yet; these change the model, so the current prototype is now behind the design.

**Verified:**
- Nothing new to verify; no code changed.

**Decisions:**
- See `docs/game-design.md` §7.

**Next step:** implement shared prestige, the Rebels < 20% rule (with rebalance) and citizen events.

**Time spent:** ~10 minutes

---

## 2026-11-11: Prototype v0.2 — shared prestige, dark endings, citizen events

**Goal for this session:** implement the owner's decisions from §7 and give the owner a test link.

**What I did:**
- Published v0.1 as a private claude.ai artifact so the owner could test it, then updated the same link to v0.2.
- Added the shared prestige pool, the Rebels < 20% goal, two dark endings and 10 citizen events (`prototype/events.js`).

**Which AI helped and how:**
- Claude: design, code, balance tuning and testing.

**What went wrong / what surprised me:**
- The stricter Rebels rule gave 0 winning plans. Tuning took several rounds: Divergent reward up, Frontier prestige 0.6 → 0.7, prestige income tried at 16/14/12/10/8. Low income made the pool too tight to win; 16 made it never run out. Chose 12.
- Even at 12, the best fixed plans never run out of prestige. The pool only bites when players overspend. Needs playtesting.

**Verified:**
- `node tools/balance_check.js` → 218,070 plans, 15 win.
- Headless Chromium: played a winning plan with events (always picking the non-dark choice) to generation 30, "Vitória", no page errors; no horizontal overflow at 400px.
- Not verified: the dark endings and every event in a real play; balance with events and with changing levers each turn.

**Decisions:**
- Prestige income 12; event every 2 generations.

**Next step:** owner playtests v0.2 and reports what feels too hard, too easy or boring.

**Time spent:** ~1 hour (AI session)

---

## 2026-11-11: Automated playtests of v0.2

**Goal for this session:** run hundreds of simulated games and draw conclusions.

**What I did:**
- Wrote `tools/playtest_sim.js`: 9 bot types × 500 games, plus a follow-up on missed goals and event choices. Report: `docs/playtest-report-v0.2.md`.

**Which AI helped and how:**
- Claude: wrote the bots, ran the games and wrote the report.

**What went wrong / what surprised me:**
- `events.js` uses a global `shift` that exists in the browser but not in Node; the simulator now provides it.
- My "smart" event bot did worse than random choices: its one-turn lookahead is short-sighted. So the adaptive-bot numbers are a low estimate of a good human.
- The repressive event choice outperforms the Frontier choice, against the game's message.

**Verified:**
- 4,500 + 2,000 simulated games; numbers in the report come straight from the script output.
- Not verified: anything about fun or clarity. That needs human players.

**Decisions:**
- None yet; proposals go to the owner.

**Next step:** owner chooses which findings to fix in v0.3.

**Time spent:** ~30 minutes (AI session)

---

## 2026-11-11: Lessons report and plan to measure reality

**Goal for this session:** write up what the tests taught us and how the game could collect real data about 2026.

**What I did:**
- Wrote the report as a shared Claude Doc ("O Arquiteto — What We Learned and How to Measure Reality"), kept outside the repo.

**Which AI helped and how:**
- Claude: wrote the report and the roadmap drawing.

**What went wrong / what surprised me:**
- The main lesson: the current game can say nothing about the real world, because all its numbers are invented. Real data needs real players, consent and published surveys.

**Verified:**
- Test numbers in the report match `docs/playtest-report-v0.2.md`.
- Not verified: the candidate survey sources are named from memory and marked TODO-VERIFY; no figure from them was used.

**Decisions:**
- None yet; four decisions are listed for the owner in the report.

**Next step:** owner answers the report's decisions; then v0.3 balance fixes.

**Time spent:** ~30 minutes (AI session)

---

## 2026-11-11: Prototype v0.3 — features done, balance not finished

**Goal for this session:** fix the six problems in the playtest report.

**What I did:**
- Added rising slider costs, three eras, scars from dark choices, Frontier capacity, rebellion linked to boredom, a better conformist life, a reachable "Ordem Perfeita" ending and 15 new events (25 total, no repeats).
- Added `tools/era_planner.js` (a bot that picks the best plan at the start of each era) and made the simulator and balance check use the new costs.

**Which AI helped and how:**
- Claude: design, code and about 15 rounds of balance tuning with the simulators.

**What went wrong / what surprised me:**
- Tuning by hand was whack-a-mole. One mid-way setting met the main goal (0 of 621,081 fixed plans won, the era planner won 100%), but a screenshot showed 83% of people in the Frontier: the simulators did not check that. Fixing the Frontier made the game unwinnable; fixing that made fixed plans win again.
- My "adaptive" bot is too naive to judge the game; it never wins in any setting.
- The final setting is a compromise. Of 621,081 fixed plans, 171 win (0.03%). The best fixed plan and the era planner both win 100% with good event choices. With random event choices, the era planner ends in "Ordem Perfeita" 80% of the time because it leans on punishment.

**Verified:**
- `node tools/balance_check.js`, `node tools/era_planner.js`, `node tools/playtest_sim.js 500` (numbers above).
- Played the game in headless Chromium with the era plans: reached generation 30 and won, with no page errors (that check was done on an earlier mid-tuning setting).

**Decisions:**
- Stop hand-tuning. Next: add the missing checks (Frontier share, Freedom margin) to the simulator and let a script search the parameters against written targets.

**Next step:** owner plays v0.3 and decides on the tuning approach.

**Time spent:** ~2 hours (AI session)
