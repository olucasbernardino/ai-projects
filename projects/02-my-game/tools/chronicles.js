// Records full game histories for each bot type and writes them as world chronicles.
// The text is generated from the simulation numbers, nothing is hand-written per game.
// Run: node tools/chronicles.js  -> writes docs/chronicles-v0.2.json
const fs = require('fs');
const { m, EVENTS, applyChoice, BOTS, setPlan, pickChoice } = require('./playtest_sim.js');

const PICK = {
  'Idle (no sliders)': 'The Absent Architect',
  'Random every turn': 'The Erratic Architect',
  'Adaptive, random choices': 'The Firefighter',
  'Best fixed plan, good choices': 'The Planner',
  'Best fixed plan, worst choices': 'The Planner Who Chose Badly',
  'Tyrant (max punishment)': 'The Tyrant',
};
const pct = v => Math.round(v * 100);

function record(bot) {
  const g = m.newGame(), st = {}; let deck = [], r = null; const hist = [];
  const snap = (ev) => hist.push({ turn: g.turn, pop: JSON.parse(JSON.stringify(g.pop)), freedom: Math.round(g.freedom), prestige: Math.round(g.prestige), mult: g.mult, ev });
  snap(null);
  while (!r) {
    setPlan(g, bot.plan(g, g.turn, st));
    r = m.step(g); let ev = null;
    if (!r && g.turn % 2 === 0) {
      if (!deck.length) deck = EVENTS.map((_, i) => i).sort(() => Math.random() - .5);
      const e = EVENTS[deck.pop()], c = pickChoice(g, e, bot.ev);
      applyChoice(g, c); ev = { title: e.title, text: e.text, choice: c.label, dark: !!c.dark };
      r = m.checkEnd(g);
    }
    snap(ev);
  }
  return { r, hist };
}

function narrate(h, prev) {
  const lines = [], p = h.pop, q = prev.pop;
  const d = (s, i) => pct(p[s][i]) - pct(q[s][i]);
  if (d('s1', 1) >= 4) lines.push(`Creators grow to ${pct(p.s1[1])}%: studios and labs fill up again.`);
  if (d('s1', 0) >= 4) lines.push(`Passive life spreads: ${pct(p.s1[0])}% now only consume what the AI makes.`);
  if (d('s1', 2) >= 4) lines.push(`Copiers multiply (${pct(p.s1[2])}%): remixes pass as new work.`);
  if (d('s2', 1) >= 4) lines.push(`Assemblies come alive: ${pct(p.s2[1])}% now deliberate before voting.`);
  if (d('s2', 0) >= 4) lines.push(`More people hand their choices to the AI (${pct(p.s2[0])}% delegators).`);
  if (d('s2', 2) >= 4) lines.push(`Rubber-stamp voting spreads: ${pct(p.s2[2])}% click "agree" without reading.`);
  if (d('s3', 1) >= 4) lines.push(`New ways of life appear: divergent communities reach ${pct(p.s3[1])}%.`);
  if (d('s3', 2) >= 4) lines.push(`Fake subcultures grow to ${pct(p.s3[2])}%, chasing the quotas.`);
  if (d('s3', 0) >= 4) lines.push(`Society grows more uniform: ${pct(p.s3[0])}% live the standard life.`);
  if (d('s4', 2) >= 4) lines.push(`Unrest rises: ${pct(p.s4[2])}% of people are now rebels in the streets.`);
  if (d('s4', 2) <= -4) lines.push(`The streets calm down; rebels fall to ${pct(p.s4[2])}%.`);
  if (d('s4', 1) >= 4) lines.push(`The Frontier zones attract ${pct(p.s4[1])}% of the population.`);
  if (h.mult < 1 && prev.mult >= 1) lines.push(`The prestige treasury runs dry: honours lose ${100 - Math.round(h.mult * 100)}% of their value.`);
  if (h.freedom <= 50 && prev.freedom > 50) lines.push(`Freedom falls to ${h.freedom}%: cameras on every corner.`);
  return lines;
}

const out = [];
for (const [bot, name] of Object.entries(PICK)) {
  // Pick a typical game: run 200, keep one whose outcome is the most common one for this bot.
  const runs = Array.from({ length: 200 }, () => record(BOTS[bot]));
  const kinds = {}; runs.forEach(x => kinds[x.r.kind] = (kinds[x.r.kind] || 0) + 1);
  const common = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0][0];
  const pool = runs.filter(x => x.r.kind === common).sort((a, b) => a.hist.length - b.hist.length);
  const game = pool[Math.floor(pool.length / 2)];
  const chapters = game.hist.slice(1).map((h, i) => ({
    turn: h.turn, lines: narrate(h, game.hist[i]), ev: h.ev,
    idx: m.SCEN.map(s => pct(m.index(s, h.pop[s.id]))), freedom: h.freedom, prestige: h.prestige,
  }));
  out.push({ bot, name, outcome: common, outcomeShare: Math.round(100 * kinds[common] / 200), ending: game.r.msg, chapters,
    start: m.SCEN.map(s => pct(m.index(s, game.hist[0].pop[s.id]))) });
}
fs.writeFileSync(__dirname + '/../docs/chronicles-v0.2.json', JSON.stringify(out, null, 1));
console.log(out.map(o => `${o.name}: ${o.outcome} (${o.outcomeShare}% of its games), ${o.chapters.length} generations`).join('\n'));
