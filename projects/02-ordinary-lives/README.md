# Ordinary Lives: sandbox prototype

> **SANDBOX: FAKE DATA.** Every country here is fictional and every number is
> invented. Nothing in this folder describes a real place or may be cited.

An educational life-simulation. You are dealt an ordinary person (country, birth
year, household income group, town or countryside, sex) and live their life in
short scenes. How likely each scene is comes only from data about that country
and year. At the end, a **Reality Reveal** shows how typical the life was.
Then you answer three opinion questions and see how people in that country
answered, next to how other players answered. There is no score, no winning and
no verdict.

This sandbox exists so the design can be judged **before** real data is wired in.

## Run it

```bash
npm install && npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the game locally |
| `npm test` | Runs the tests |
| `npm run typecheck` | Checks the TypeScript |
| `npm run build` | Builds a static site into `dist/` |
| `npm run generate-data` | Re-creates `observations.json` and `survey_results.json` from `scripts/generate-fake-data.mjs` |

## How to play

1. **Choose a dealing mode.** *Equal deck* deals every country once before any
   repeats. *The world as it is* deals by (fake) population. The active mode is
   always shown at the top.
2. **Deal a life.** The card shows who you are. If heavy scenes are likely, a
   content notice tells you how often they appear in simulated lives with this card.
3. **Live it.** Quiet years are compressed ("Ages 6–11: primary school, and
   chores…"). A scene appears only when the simulation draws one. Each scene shows:
   - your age and the year;
   - a badge: **Measured fact** (the quoted rate is a measured figure) or
     **Simulation built from averages** (odds combine averages and assumptions);
   - 2–3 choices, each with its cost written out;
   - **Where does this come from?**: this year's chance, the formula, and every
     indicator used (value, low–high range, data year, data type, fake source,
     version, date, licence note);
   - for heavy scenes, a **Step out of this scene** button. Stepping out skips
     the choice and shows only the consequence.
4. **Reality Reveal.** 1,000 lives are simulated with your exact card: "Out of
   100 people born in your situation, X finished secondary school… You were one
   of them / not." Ranges come from extra runs at the data's low and high bounds.
   If any year a metric needs is missing, it says **not measured here** instead
   of a number. The country's share of the (fake) world population is shown, and
   a warning appears when the data is thin.
5. **Voice.** Three questions. After you answer you see the fake national survey
   and the player answers side by side. Player answers are labelled "Players,
   not a representative poll", and a group of fewer than 5 players is hidden.
6. **Lenses (optional).** Same card in another country; same country ten years
   earlier; what players dealt this country answered. Any lens life can be played.

**Seeds.** Every life shows a seed such as `E-942384-1`: mode (E = equal, W = world),
deck seed, and deal number. Lens lives add `~C:<country id>` or `~Y:-10`. Type a
seed on the start screen to replay the same person; with the same choices you get
the same life.

## File formats (`data/`)

All files are plain JSON. The engine reads them; it contains no country-specific code.

| File | Shape |
| --- | --- |
| `countries.json` | `{ world_population, countries: [{ id, name, archetype, population, notes }] }` |
| `indicators.json` | `[{ id, layer: outcomes\|constraints\|opinions, data_type: measured\|modelled\|expert\|perceived\|event\|survey, max_claim_level: 1-3, unit, description, groups_by?: income\|area\|sex }]` |
| `observations.json` | `[{ country, year, indicator, value, low, high, source_release_id, group? }]`. `group` is a breakdown: `bottom40`/`middle40`/`top20`, `urban`/`rural`, or `female`/`male` |
| `source_releases.json` | `[{ id, name, version, date, licence_note }]` |
| `survey_questions.json` | `[{ id, text, answers: [{ id, label }] }]` |
| `survey_results.json` | `[{ country, question, year, sample_size, margin_of_error, shares: { answerId: share }, source_release_id }]` |
| `scene_templates.json` | `[{ id, title, age_min, age_max, max_times, odds, requires?, variants?, claim_level, content_warning, text, consequence_text?, consequence_effects?, choices_intro?, choices: [{ id, label, cost, effects, when? }], context_indicators? }]` |
| `life_stages.json` | Text for compressed quiet years, by age band: `[{ id, age_min, age_max, variants: [{ when?, weight?, text }], fallback }]` |
| `reveal_metrics.json` | What the Reality Reveal counts: `[{ id, flag, label, scenes }]` |

**Claim levels.** `max_claim_level` 3 means the indicator may support a "Measured fact"
badge, 2 means it may only feed simulations, and 1 means context only (it can never
drive odds; the data check rejects it). A scene shows "Measured fact" only if it
asks for it **and** every indicator driving it is level 3.

**Odds formulas.** A small, safe expression language (no `eval`): numbers,
`+ - * /`, comparisons, `&& || !`, `cond ? a : b`, functions `min max clamp annual per100k per1000`,
state (`age year decile urban female buffer`), flags (`flag.left_school`) and indicator
ids. `annual(p, years)` turns "share who experience it over N years" into an equal
yearly chance. Evaluation is lazy, so `flag.joined_protest ? protest_repression_share : 0`
only needs the indicator when the flag is set.

**Text placeholders.** `{country} {year} {age} {variant}` and `{in100:id} {in1000:id} {raw:id} {score:id}`.
A missing indicator renders as "[not measured here]".

**Lookups.** The engine uses the latest observation at or before the year, otherwise
the earliest one after it, as long as it is within 5 years. If no observation is that
close, the indicator is **missing**. It never falls back to another year, another
group or a default value. A scene whose odds need a missing indicator cannot fire,
and the gap is recorded and shown in the Reveal.

## Code map

| Path | Role |
| --- | --- |
| `src/engine/rng.ts` | Seeded random numbers (mulberry32 + FNV hash) |
| `src/engine/deck.ts` | Dealing, seeds, lenses |
| `src/engine/data.ts` | Lookups, missing handling, claim badges, data check |
| `src/engine/formula.ts` | The odds formula language |
| `src/engine/life.ts` | Year-by-year simulator (pauses at scenes) |
| `src/engine/reveal.ts` | 1,000-life Reveal, ranges, data thinness |
| `src/engine/aggregates.ts` | Player answer counts and suppression under 5 |
| `src/main.ts` | Screens (plain DOM) |
| `scripts/generate-fake-data.mjs` | Where every fake number comes from |
| `tests/engine.test.ts` | The tests listed below |

## Tests

`npm test` proves that:

1. the equal deck deals every country once before repeating (several seeds);
2. changing a country's data in a test fixture changes its scene odds, with no code
   change (5 scenes), and simulated lifetime shares match the indicator;
3. no country id or name appears anywhere in `src/` or `index.html`;
4. missing indicators give "not measured here" (lookup, odds, Reveal shows `null`
   not 0, scene text), never a default;
5. player groups under 5 are suppressed, and not even their size is shown;
6. the same seed gives the same life (also for lens seeds, and stepping through
   like the UI does gives the same life as a headless run).

Plus a data check (`validateBundle`) that every formula and file reference fits together.

## What this sandbox is testing

- **Concept and tone.** Does living a dealt life in short, plain scenes teach
  something, without feeling like a game about "winning" or a verdict on a country?
- **Equal dealing, data-shaped outcomes.** Every country is dealt as often as every
  other. Only the data differs. Police mistreatment, discrimination and surveillance
  scenes run in the rich democracy too, at its own rates.
- **The data trail.** Can a player follow any scene back to an indicator, its
  uncertainty, its year and its source, and understand the two claim badges?
- **Honest gaps.** Countries with thin data (the conflict zone, the post-conflict
  country before 2000, the closed autocracy's banned surveys) show "not measured
  here" rather than looking calm or safe.
- **Harm scenes.** Detention, violence, displacement and a child's death are
  described only through their consequences, with a content notice and a way to step out.
- **The pipeline shape.** The JSON files mirror the planned real pipeline, so real
  data can later replace the fake files without engine changes.

## Known limits (design decisions to review)

- **Lifetime vs yearly rates.** Recurring experiences (bribery, police mistreatment,
  discrimination) are defined as "ever happened, among adults aged 40–49" and spread
  evenly over the age window. An early version used yearly rates as independent
  yearly chances; over 40 years almost everyone got everything. Real data will need
  a decision per indicator.
- **Simulated people choose at random**, and each year is independent of the last.
  Both are assumptions, stated on the Reveal screen.
- **Several multipliers are assumptions**, written in the formulas: about 15 close
  relatives (homicide scene), 0.3 younger siblings born per year (child mortality
  scene), and the scale factors on surveillance, protest and youth-unemployment odds.
- The savings "buffer" (0–3) is a game counter, not data.
- Survey questions can be answered again by replaying a seed, so player counts
  can double-count one person. That is acceptable for a sandbox, not for real use.
- The Reveal needs about one second on a phone.
