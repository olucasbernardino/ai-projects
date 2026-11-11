# 02 · my-game ("O Arquiteto", working title)

A society-simulation game: you are the AI of a post-scarcity world. You cannot
give orders, only shape incentives, across four crises (meaning, agency,
diversity, freedom). Based on the owner's design notes.

| Path | What it is |
| --- | --- |
| `docs/original-notes.docx` | Owner's original notes (Portuguese), unchanged |
| `docs/game-design.md` | Organized design doc + Claude's proposals and findings |
| `prototype/index.html` | Playable prototype v0.1 — open it in any browser |
| `prototype/model.js` | Game math (replicator dynamics); all numbers are design values |
| `tools/check_scenario4.py` | Re-runs the notes' Scenario 4 math |
| `prototype/events.js` | Citizen events (Portuguese) |
| `tools/balance_check.js` | Counts how many fixed strategies can win |
| `devlog.md` | Honest log of the work |

**How to play:** open `prototype/index.html`, move sliders (14 Influence points),
press "Avançar geração". Reach generation 30 with Vitality, Agency and Diversity
≥ 30% and Rebels < 20%, without letting Freedom reach 0. Answer a citizen
event every 2 generations.

No external data is used, so there is no `sources.md`: every number is a game
design value, labelled as such in the code.
