# my-game: Game Design Document (v0.1)

Source of the base ideas: the owner's notes in `original-notes.docx` (Portuguese).
Sections marked **[Owner]** organize those notes. Sections marked **[Claude]**
are Claude's additions and are proposals until the owner approves them.

## 1. Pitch [Owner, organized]

The world has reached post-scarcity thanks to AI. Nobody lacks food or comfort.
The new danger is not poverty: it is apathy, dependence, sameness and boredom.
**You play the Architect**: the AI that cannot give orders, only shape incentives.
Push too hard and you become a tyrant; do nothing and civilization rots.

Genre: society simulation / incentive-design strategy. Platform: browser.
Game text: Portuguese. Design docs: English.

## 2. The four crises [Owner, organized]

Every crisis has the same shape: what the individual gains, what the system
loses, the goal, and the AI's tool. Each crisis also has a **free-rider**,
someone who games the tool.

| # | Crisis | Individual gains | System loses | Architect's tool | Free-rider |
|---|---|---|---|---|---|
| 1 | Crisis of Meaning | Comfort, zero effort (passive AI entertainment) | Vitality, discovery | Reputation market for original work; **privilege decay** for long inactivity | Repeats or copies instead of creating |
| 2 | Atrophy of Agency | No guilt, no thinking | Self-correction; single point of failure | **Fractal deliberative democracy**: humans must approve local decisions; progressive autonomy | Clicks "agree with AI", loses vote weight |
| 3 | Who defines "evolution"? | Safety by conforming | Antifragility from diversity | **Mandatory systemic diversity**: resource quotas for marginal cultures, checked by human peers | Fakes eccentricity to capture quotas |
| 4 | Rebellion of Freedom | Adrenaline, real agency by breaking rules | Stability | **Regulated anarchy zones** with prestige; strict responsibility inside the zone | Wants chaos that destroys others' worlds |

## 3. Core model [Owner: Scenario 4; Claude: extended to 1-3]

Each crisis is a small population game solved with **replicator dynamics**:
a strategy grows when its payoff is above the population average.

`dx_i/dt = x_i (U_i − Ū)`  where `Ū = Σ x_j U_j`

### Scenario 4 [Owner]
- Conformist: `U_C = B − c0 − α·x_R`
- Rebel: `U_R = B + G − p(x_R)·F`, with `p(x_R) = p0 + k·x_R`
- Frontier: `U_F = B + G_sim − c_risco`
- Architect levers: punishment / surveillance (`F`, `p0`) and frontier prestige (`G_sim`).

### Scenarios 1-3 [Claude proposal, same structure, three strategies each]
- **S1 Meaning:** Passive `U = B + L − d·x?` (leisure `L`, privilege decay `d`),
  Creator `U = B + r − e` (reputation `r`, effort `e`),
  Copier `U = B + r·(1 − q) − e/3` (captures reputation unless quality check `q`).
- **S2 Agency:** Delegator `U = B + ease − w` (vote-weight loss `w`),
  Deliberator `U = B + w + a − cog` (autonomy `a`), Rubber-stamper `U = B + w·(1 − audit)`.
- **S3 Diversity:** Conformist `U = B + safety`, Divergent `U = B + quota − stigma`,
  Faker `U = B + quota·(1 − verify) − small`.

All exact numbers live in `prototype/model.js` and are **design values, not data**
(they are invented on purpose to tune a game; they are not facts about the world).

## 4. The game loop [Claude]

1. Each turn = one "generation". You get **14 Influence points** (`BUDGET`).
2. Spend points on levers across the four crises (sliders). Levers cost points,
   so you cannot fix everything at once: that is the core tension.
3. The simulation advances; four indices update:
   **Vitality** (S1 creators), **Agency** (S2 deliberators),
   **Diversity** (S3 genuine divergents), **Stability** (S4 non-rebels).
4. **Freedom meter:** heavy surveillance and punishment lower Freedom. If Freedom
   hits 0 you have become the "algorithmic dictatorship" the notes warn about: you lose.
5. Lose if any index < 15% or Freedom = 0. Win if you reach turn 30 with all
   indices ≥ 30% (`WIN`). Every strategy pays a crowding cost (`CROWD = 1.0`).
   Balance check (`tools/balance_check.js`): of 218,070 fixed lever plans,
   56 win. Hard on purpose; changing levers each turn should be easier.
6. Events (later): citizen stories that shock parameters.

## 5. Findings from checking the notes [Claude]

- **Typo:** the Frontier payoff in the notes is labelled `UR=`; it should be `UF=`.
- **Claim vs. result:** the notes say the AI produces a mixed equilibrium
  (`x_R ≈ 0`, `x_F > 0`). Running the notes' own parameters
  (`tools/check_scenario4.py`) gives `x_R → 0` but also **`x_C → 0`**:
  everyone becomes a Frontier explorer. Reason: `U_F = 3.1` is constant and
  always beats `U_C ≤ 1.5`, so conformists can never survive. A true mix needs
  Frontier payoff to fall as it gets crowded (for example `U_F = B + G_sim·(1 − x_F) − c_risco`).
  Tested: adding crowding to Frontier alone gives C 0%, R 27%, F 73%, so it is
  **not enough** (conformists still vanish, rebels come back). The prototype
  therefore gives **every** strategy a crowding cost (`− crowd·x_i`), which
  guarantees a mix. This is a design decision for the owner.
- **Theme gap:** "prestige" as reward in S1 and S4 is the same currency.
  Should prestige be one shared resource across crises? (open question)

## 6. Open questions for the owner
- Shared prestige currency across crises, or separate?
- Is the Architect benevolent, or can the player choose a darker path?
- Final name of the game (`my-game` is a placeholder).

## 7. Decisions log
- 2026-11-11 · Owner: one **shared prestige** currency across all four crises.
- 2026-11-11 · Owner: the player **can go dark**; the control/surveillance path gets its own ending instead of being only a loss.
- 2026-11-11 · Owner: next feature is **citizen events** (short dilemmas that shock the numbers).
- 2026-11-11 · Delegated to Claude: Crisis 4 "stable" will mean **Rebels < 20%** (the notes' goal is rebels near 0). Prototype must be rebalanced to stay winnable.

## 8. Prototype v0.2 rules [Claude, implementing §7]
- **Shared prestige pool** (starts 20). The four "carrot" levers (★) cost 1 prestige per point per generation. If the pool is short, all ★ levers lose strength by the same ratio. Income each generation = `12 × 2 × average healthy share`, so a healthy society funds its own rewards.
- **Stability** now means Rebels < 20% (other goals stay ≥ 30%).
- **Dark endings:** Freedom 0 ends the game in "Ordem Perfeita" (all goals met, nobody free) or "Ditadura Algorítmica" (goals failed). Some events have dark choices (purple) that trade Freedom for fast results.
- **Citizen events:** 10 dilemmas in `prototype/events.js`, one every 2 generations, no repeats until the deck runs out.
- Balance (`tools/balance_check.js`, no events): 15 of 218,070 fixed plans win.
