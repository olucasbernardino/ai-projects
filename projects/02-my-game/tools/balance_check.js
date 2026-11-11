// Brute-force balance check: tries every fixed lever plan (0-5 per lever, total <= BUDGET)
// and counts how many win. Run: node tools/balance_check.js
const m = require('../prototype/model.js');
const R = [0, 1, 2, 3, 4, 5]; let n = 0, wins = 0, example = null;
for (const a of R) for (const b of R) for (const c of R) for (const d of R)
for (const e of R) for (const f of R) for (const g of R) for (const h of R) {
  if (a + b + c + d + e + f + g + h > m.BUDGET) continue; n++;
  const game = m.newGame();
  Object.assign(game.lev, { s1: { decay: a, quality: b }, s2: { weight: c, audit: d }, s3: { quota: e, peer: f }, s4: { punish: g, prestige: h } });
  let r; while (!(r = m.step(game)));
  if (r.win) { wins++; example = example || [a, b, c, d, e, f, g, h]; }
}
console.log(`plans tried: ${n}, winning plans: ${wins}, example: ${example}`);
