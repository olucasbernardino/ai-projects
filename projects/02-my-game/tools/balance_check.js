// Brute-force balance check: tries every fixed lever plan (0-5 per lever, total <= BUDGET)
// and counts how many win. Run: node tools/balance_check.js
const m = require('../prototype/model.js');
const R = [0, 1, 2, 3, 4, 5]; let n = 0, wins = 0, example = null, best = null, bestScore = -1e9;
for (const a of R) for (const b of R) for (const c of R) for (const d of R)
for (const e of R) for (const f of R) for (const g of R) for (const h of R) {
  if ([a, b, c, d, e, f, g, h].reduce((s, v) => s + m.COST.at(v), 0) > m.BUDGET) continue; n++;
  const game = m.newGame();
  Object.assign(game.lev, { s1: { decay: a, quality: b }, s2: { weight: c, audit: d }, s3: { quota: e, peer: f }, s4: { punish: g, prestige: h } });
  let r; while (!(r = m.step(game)));
  if (r.kind === "win") { wins++; example = example || [a, b, c, d, e, f, g, h]; }
  const sc = m.SCEN.reduce((s, sc2) => s + Math.min(0, m.index(sc2, game.pop[sc2.id]) - m.winLine(sc2)), 0) - (r.kind === 'win' ? 0 : 1);
  if (sc > bestScore) { bestScore = sc; best = [a, b, c, d, e, f, g, h]; }
}
const kinds = {}; require('fs').writeFileSync(__dirname + '/best_plan.json', JSON.stringify(best));
console.log(`best plan: ${best}`);
console.log(`plans tried: ${n}, winning plans: ${wins}, example: ${example}`);
