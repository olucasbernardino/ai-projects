// Automated playtests: different bot "players" play full games of prototype v0.2,
// including citizen events. Run: node tools/playtest_sim.js [gamesPerBot]
const m = require('../prototype/model.js');
global.shift = m.shift;
const { EVENTS, applyChoice } = require('../prototype/events.js');
const N = +process.argv[2] || 500;
const L = [['s1','decay'],['s1','quality'],['s2','weight'],['s2','audit'],['s3','quota'],['s3','peer'],['s4','punish'],['s4','prestige']];
let BEST = [2,2,3,1,1,1,0,4]; // replaced by the best fixed plan from balance_check when available
try { BEST = require('./best_plan.json'); } catch (e) {}
let ERA_PLANS = null; try { ERA_PLANS = require('./era_plans.json'); } catch (e) {}
const rnd = n => Math.floor(Math.random() * n);

function setPlan(g, plan) { L.forEach(([s, l], i) => g.lev[s][l] = plan[i]); }
const planCost = p => p.reduce((a, v) => a + m.COST.at(v), 0);
function randomPlan(budget) {
  const p = Array(8).fill(0);
  for (let k = 0; k < 40; k++) { const i = rnd(8); if (p[i] < 5) { p[i]++; if (planCost(p) > budget) p[i]--; } }
  return p;
}
// Adaptive bot: each turn, spend points on the crisis furthest below its goal.
function adaptive(g, avoidPunish) {
  const gap = m.SCEN.map(s => m.winLine(s) - m.index(s, g.pop[s.id]) + 0.05);
  const p = Array(8).fill(0); let pts = m.BUDGET;
  // baseline 1 point on every non-punish lever
  for (let i = 0; i < 8; i++) if (!(i === 6)) { p[i] = 1; pts--; }
  for (let guard = 0; guard < 20 && pts > 0; guard++) {
    const order = gap.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    let placed = false;
    for (const [, si] of order) {
      const cands = [si * 2, si * 2 + 1].filter(i => !(avoidPunish && i === 6) && p[i] < 5 && m.COST.at(p[i] + 1) - m.COST.at(p[i]) <= pts).sort((a, b) => p[a] - p[b]);
      if (cands.length) { const i = cands[0]; pts -= m.COST.at(p[i] + 1) - m.COST.at(p[i]); p[i]++; gap[si] -= 0.04; placed = true; break; }
    }
    if (!placed) break;
  }
  if (g.prestige < 8) { // save prestige when the pool is low
    for (const i of [0, 2, 4, 7]) p[i] = Math.max(0, p[i] - 1);
  }
  return p;
}

const BOTS = {
  'Idle (no sliders)':            { plan: () => Array(8).fill(0), ev: 'random' },
  'Random fixed plan':            { plan: (g, t, st) => st.p ||= randomPlan(m.BUDGET), ev: 'random' },
  'Random every turn':            { plan: () => randomPlan(m.BUDGET), ev: 'random' },
  'Adaptive, good choices':       { plan: g => adaptive(g, true), ev: 'good' },
  'Adaptive, random choices':     { plan: g => adaptive(g, true), ev: 'random' },
  'Best fixed plan, good choices':   { plan: () => BEST, ev: 'good' },
  'Best fixed plan, random choices': { plan: () => BEST, ev: 'random' },
  'Best fixed plan, worst choices':  { plan: () => BEST, ev: 'worst' },
  'Era planner, good choices':   { plan: g => ERA_PLANS ? ERA_PLANS.at(Math.min(2, Math.floor(g.turn / 10))) : BEST, ev: 'good' },
  'Era planner, random choices': { plan: g => ERA_PLANS ? ERA_PLANS.at(Math.min(2, Math.floor(g.turn / 10))) : BEST, ev: 'random' },
  'Tyrant (max punishment)':      { plan: () => [1,1,1,0,1,0,5,0], ev: 'dark' },
};

// "good" = the first non-dark choice that a quick lookahead rates best; "worst" = the opposite.
function score(g) { return m.SCEN.reduce((a, s) => a + Math.min(0, m.index(s, g.pop[s.id]) - m.winLine(s)), 0) + g.freedom / 1000; }
function pickChoice(g, ev, mode) {
  if (mode === 'random') return ev.choices[rnd(2)];
  if (mode === 'dark') return ev.choices.find(c => c.dark) || ev.choices[rnd(2)];
  const scored = ev.choices.map(c => { const h = JSON.parse(JSON.stringify(g)); applyChoice(h, c); return [score(h), c]; });
  scored.sort((a, b) => b[0] - a[0]);
  if (mode === 'good') return (scored.find(([, c]) => !c.dark) || scored[0])[1];
  return scored[scored.length - 1][1];
}

function play(bot) {
  const g = m.newGame(), st = {}; let deck = null, r = null, short = 0, picks = {};
  while (!r) {
    setPlan(g, bot.plan(g, g.turn, st));
    r = m.step(g);
    if (g.mult < 1) short++;
    if (!r && g.turn % 2 === 0) {
      if (!deck) deck = EVENTS.map((_, i) => i).sort(() => Math.random() - .5);
      if (!deck.length) continue;
      const ev = EVENTS[deck.pop()], c = pickChoice(g, ev, bot.ev);
      applyChoice(g, c); picks[ev.title + ' → ' + c.label] = 1;
      r = m.checkEnd(g);
    }
  }
  const idx = m.SCEN.map(s => m.index(s, g.pop[s.id]));
  return { kind: r.kind, msg: r.msg, turn: g.turn, short, idx, freedom: g.freedom, picks };
}

module.exports = { m, EVENTS, applyChoice, BOTS, setPlan, pickChoice };
if (require.main === module) {
const out = {};
for (const [name, bot] of Object.entries(BOTS)) {
  const res = Array.from({ length: N }, () => play(bot));
  const count = k => res.filter(x => x.kind === k).length;
  const causes = {};
  res.filter(x => x.kind !== 'win').forEach(x => { const c = x.msg.split(':')[0].split(' colapsou')[0]; causes[c] = (causes[c] || 0) + 1; });
  const avg = f => (res.reduce((a, x) => a + f(x), 0) / N);
  out[name] = {
    win: (100 * count('win') / N).toFixed(1) + '%', lose: (100 * count('lose') / N).toFixed(1) + '%', dark: (100 * count('dark') / N).toFixed(1) + '%',
    avgEndTurn: avg(x => x.turn).toFixed(1), prestigeShortTurns: avg(x => x.short).toFixed(1),
    topCauses: Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} (${n})`).join('; '),
  };
}
console.log(`games per bot: ${N}`);
console.table(out);
}
