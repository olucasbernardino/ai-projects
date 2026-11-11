// Finds the best plan for each era in turn (the world changes every 10 generations),
// starting each search from where the previous era left the world. No events.
// Run: node tools/era_planner.js  -> writes tools/era_plans.json
const m = require('../prototype/model.js');
const L = [['s1','decay'],['s1','quality'],['s2','weight'],['s2','audit'],['s3','quota'],['s3','peer'],['s4','punish'],['s4','prestige']];
const R = [0, 1, 2, 3, 4, 5], plans = [];
for (const a of R) for (const b of R) for (const c of R) for (const d of R) for (const e of R) for (const f of R) for (const g of R) for (const h of R) {
  const p = [a, b, c, d, e, f, g, h];
  if (p.reduce((s, v) => s + m.COST.at(v), 0) <= m.BUDGET) plans.push(p);
}
const clone = g => JSON.parse(JSON.stringify(g));
function runEra(start, plan, turns) {
  const g = clone(start); L.forEach(([s, l], i) => g.lev[s][l] = plan[i]);
  let r = null; for (let k = 0; k < turns && !r; k++) r = m.step(g);
  return { g, r };
}
function score({ g, r }) {
  if (r && r.kind !== 'win') return -1e9;
  // keep a Freedom margin so event choices that cost Freedom don't tip the world into a dark ending
  return m.SCEN.reduce((s, sc) => s + Math.min(0.05, m.index(sc, g.pop[sc.id]) - m.winLine(sc)), 0) + Math.min(0, g.freedom - 70) / 200;
}
let state = m.newGame(); const out = [];
for (let era = 0; era < 3; era++) {
  let best = null, bs = -Infinity;
  for (const p of plans) { const sc = score(runEra(state, p, 10)); if (sc > bs) { bs = sc; best = p; } }
  out.push(best); state = runEra(state, best, 10).g;
  console.log(`era ${era + 1}: plan ${best} score ${bs.toFixed(3)}`);
}
const fin = m.checkEnd(state) || { kind: 'running' };
console.log('final:', m.SCEN.map(s => Math.round(m.index(s, state.pop[s.id]) * 100)).join('/'), 'freedom', Math.round(state.freedom), fin.kind);
require('fs').writeFileSync(__dirname + '/era_plans.json', JSON.stringify(out));
