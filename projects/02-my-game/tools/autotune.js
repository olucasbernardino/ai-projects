// Automated balance search for prototype v0.3+.
// It tries many settings (model P), scores each against the written TARGETS below,
// and keeps the best. Run: node tools/autotune.js [iterations]  -> writes tools/tuned_params.json
// All values are game design values, not real-world data.
const { m, EVENTS, applyChoice, setPlan, pickChoice } = require('./playtest_sim.js');

// ---- TARGETS (what "balanced" means; agreed in the dev log of 2026-11-11) ----
const TARGETS = {
  fixedWinMax: 0.002,     // almost no fixed plan may win: the player must adapt
  plannerGoodMin: 0.85,   // a player who adapts each era and chooses well should usually win
  plannerRandomMin: 0.35, // events matter...
  plannerRandomMax: 0.75, // ...but must not decide the game alone
  frontierMax: 0.45,      // the Frontier must not swallow society
  freedomMin: 50,         // a good player keeps a Freedom margin (no forced repression)
  idleLoseBy: 6,          // doing nothing must lose fast
};

// Seeded random numbers, so every candidate is judged on the same sample of plans.
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const cost = p => p.reduce((a, v) => a + m.COST.at(v), 0);
function samplePlans(n, seed) {
  const r = rng(seed), out = [];
  while (out.length < n) {
    const p = Array(8).fill(0);
    for (let k = 0; k < 30; k++) { const i = Math.floor(r() * 8); if (p[i] < 5) { p[i]++; if (cost(p) > m.BUDGET) p[i]--; } }
    out.push(p);
  }
  return out;
}
const clone = g => JSON.parse(JSON.stringify(g));
function run(start, plan, turns) { const g = clone(start); setPlan(g, plan); let r = null; for (let k = 0; k < turns && !r; k++) r = m.step(g); return { g, r }; }
function eraScore({ g, r }) {
  if (r && r.kind !== 'win') return -1e9;
  return m.SCEN.reduce((s, sc) => s + Math.min(0.05, m.index(sc, g.pop[sc.id]) - m.winLine(sc)), 0)
    + Math.min(0, g.freedom - 70) / 200 - Math.max(0, g.pop.s4[1] - 0.4);
}

function evaluate(params, gamesPerMode = 40) {
  m.setParams(params);
  const plans = samplePlans(3000, 7);
  // 1. fixed plans, no events
  let fixedWins = 0;
  for (const p of plans) { const { r } = run(m.newGame(), p, 30); if (r && r.kind === 'win') fixedWins++; }
  // 2. era planner: best sampled plan at the start of each era
  let state = m.newGame(); const eraPlans = [];
  for (let e = 0; e < 3; e++) {
    let best = plans[0], bs = -Infinity;
    for (const p of plans) { const s = eraScore(run(state, p, 10)); if (s > bs) { bs = s; best = p; } }
    eraPlans.push(best); state = run(state, best, 10).g;
  }
  // 3. play the era plans with events
  const play = mode => {
    let wins = 0, fMax = 0, free = 0;
    for (let k = 0; k < gamesPerMode; k++) {
      const g = m.newGame(); let deck = EVENTS.map((_, i) => i).sort(() => Math.random() - .5), r = null;
      while (!r) {
        setPlan(g, eraPlans.at(Math.min(2, Math.floor(g.turn / 10))));
        r = m.step(g); fMax = Math.max(fMax, g.pop.s4[1]);
        if (!r && g.turn % 2 === 0 && deck.length) { applyChoice(g, pickChoice(g, EVENTS[deck.pop()], mode)); r = m.checkEnd(g); }
      }
      if (r.kind === 'win') wins++; free += g.freedom;
    }
    return { win: wins / gamesPerMode, fMax, free: free / gamesPerMode };
  };
  const good = play('good'), rand = play('random');
  // 4. idle
  const idle = m.newGame(); let ir = null; while (!ir) ir = m.step(idle);
  const res = { fixedWin: fixedWins / plans.length, plannerGood: good.win, plannerRandom: rand.win,
    frontierMax: Math.max(good.fMax, rand.fMax), freedomGood: good.free, idleTurn: idle.turn, eraPlans };
  const T = TARGETS, miss = [
    Math.max(0, res.fixedWin - T.fixedWinMax) * 20,
    Math.max(0, T.plannerGoodMin - res.plannerGood) * 3,
    Math.max(0, T.plannerRandomMin - res.plannerRandom) * 2,
    Math.max(0, res.plannerRandom - T.plannerRandomMax) * 2,
    Math.max(0, res.frontierMax - T.frontierMax) * 3,
    Math.max(0, T.freedomMin - res.freedomGood) / 25,
    Math.max(0, res.idleTurn - T.idleLoseBy) / 5,
  ];
  res.score = miss.reduce((a, b) => a + b, 0);
  return res;
}

// ---- search: hill climbing with random steps around the best settings so far ----
const RANGES = { budget: [16, 30, 1], income: [10, 30, 1], eventScale: [0.2, 0.8, 0.05], push1: [0, 0.5, 0.05], push2: [0, 0.5, 0.05],
  push3div: [0, 0.5, 0.05], push3reb: [0, 0.5, 0.05], rebelBore: [1, 4, 0.1], rebelOff: [0, 1.5, 0.05], confBase: [0, 1.2, 0.05],
  frontierGain: [0.3, 1, 0.05], capCoef: [5, 30, 1], punishFree: [2, 5, 0.5] };
const round = (v, s) => Math.round(v / s) * s;
function mutate(base) {
  const p = { ...base }, keys = Object.keys(RANGES), n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const k = keys[Math.floor(Math.random() * keys.length)], [lo, hi, st] = RANGES[k];
    p[k] = +Math.min(hi, Math.max(lo, round(p[k] + (Math.random() - 0.5) * (hi - lo) * 0.3, st))).toFixed(3);
  }
  return p;
}

if (require.main === module) {
  const iters = +process.argv[2] || 120;
  let best = { ...m.P }, bestRes = evaluate(best);
  console.log('start', JSON.stringify({ ...bestRes, eraPlans: undefined }));
  for (let i = 1; i <= iters && bestRes.score > 0; i++) {
    const cand = mutate(best), res = evaluate(cand);
    if (res.score < bestRes.score) { best = cand; bestRes = res; console.log(`#${i} better`, res.score.toFixed(3), JSON.stringify({ ...res, eraPlans: undefined })); }
  }
  const check = evaluate(best, 150); // re-check the winner with more games
  console.log('BEST', JSON.stringify(best));
  console.log('re-check (150 games each):', JSON.stringify({ ...check, eraPlans: undefined }));
  require('fs').writeFileSync(__dirname + '/tuned_params.json', JSON.stringify({ params: best, check }, null, 1));
}
module.exports = { evaluate, TARGETS };
