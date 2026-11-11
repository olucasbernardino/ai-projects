// Game model for prototype v0.3. All numbers are DESIGN VALUES (invented to tune
// the game), not real-world data. See ../docs/game-design.md.
// Each scenario: 3 strategies; strategy 1 is the "healthy" one.
// Payoff U_i = base_i + lever effects - CROWD * x_i  (crowding guarantees a mix).
// Levers marked `prestige: true` are paid from ONE shared prestige pool.

const CROWD = 1.0, DT = 0.25, SUBSTEPS = 8, B = 2, WIN = 0.30, BUDGET = 22, TURNS = 30;
const PRESTIGE_START = 20, PRESTIGE_INCOME = 24, REBEL_MAX = 0.20;
// v0.3: each slider level costs more than the last (level 5 = 8 points in total).
const COST = [0, 1, 2, 3, 5, 8];
const EVENT_SCALE = 0.4, FRONTIER_CAP = 0.35, ORDER_FREEDOM = 30;
// v0.3: the world changes every 10 generations, pushing a different crisis (index = era).
const ERAS = [
  { name: 'Era da Abundância', text: 'A IA gera arte e entretenimento infinitos: a vida passiva fica mais tentadora.', push: { s1: 0.25 } },
  { name: 'Era da Conveniência', text: 'Assistentes pessoais decidem quase tudo: delegar fica mais fácil que nunca.', push: { s2: 0.25 } },
  { name: 'Era do Tédio', text: 'Uma geração que nunca conheceu a escassez busca sentido no conformismo ou no caos.', push: { s3: 0.3, s4: 0.25 } },
];

const SCEN = [
  { id: 's1', name: '1 · Crise de Sentido', indexName: 'Vitalidade',
    strats: ['Passivos', 'Criadores', 'Copiadores'],
    levers: [{ id: 'decay', name: 'Reputação por obra original', prestige: true }, { id: 'quality', name: 'Árbitro de originalidade' }],
    pay: (x, l) => [B + 1.2 - 0.25 * l.decay,
                    B + 0.15 + 0.2 * l.decay,
                    B + 0.9 - 0.3 * l.quality] },
  { id: 's2', name: '2 · Atrofia da Agência', indexName: 'Agência',
    strats: ['Delegadores', 'Deliberadores', 'Carimbadores'],
    levers: [{ id: 'weight', name: 'Peso de voto por deliberação', prestige: true }, { id: 'audit', name: 'Auditoria de decisões' }],
    pay: (x, l) => [B + 1.2 - 0.25 * l.weight,
                    B + 0.05 + 0.2 * l.weight,
                    B + 0.8 + 0.1 * l.weight - 0.3 * l.audit] },
  { id: 's3', name: '3 · Quem define a Evolução?', indexName: 'Diversidade',
    strats: ['Conformados', 'Divergentes', 'Fingidores'],
    levers: [{ id: 'quota', name: 'Cotas para nichos', prestige: true }, { id: 'peer', name: 'Verificação por pares' }],
    pay: (x, l) => [B + 0.8,
                    B + 0.15 + 0.35 * l.quota,
                    B + 0.3 + 0.25 * l.quota - 0.35 * l.peer] },
  { id: 's4', name: '4 · Rebelião da Liberdade', indexName: 'Estabilidade',
    strats: ['Conformistas', 'Fronteiriços', 'Rebeldes'],
    levers: [{ id: 'punish', name: 'Vigilância e punição', freedomCost: true }, { id: 'prestige', name: 'Prestígio da Zona de Fronteira', prestige: true }],
    // Based on the owner's Scenario 4 payoffs, rescaled to the lever range.
    // v0.3: the Frontier is a closed ecosystem with limited room.
    pay: (x, l) => [B + 0.7 - 1.5 * x[2],
                    B + 0.7 * l.prestige - 0.5 - 20 * Math.max(0, x[1] - FRONTIER_CAP),
                    B + 2.4 * (1 - l.meaning) - 0.6 - (0.1 + 1.2 * x[2]) * l.punish] },
];

// S4 index is "not rebels"; others measure the healthy strategy share.
function index(s, x) { return s.id === 's4' ? 1 - x[2] : x[1]; }
function era(turn) { return ERAS.at(Math.min(ERAS.length - 1, Math.floor(turn / 10))); }
function spent(g) { return SCEN.reduce((a, s) => a + s.levers.reduce((b, l) => b + COST.at(g.lev[s.id][l.id]), 0), 0); }
function winLine(s) { return s.id === 's4' ? 1 - REBEL_MAX : WIN; }
function prestigeDemand(g) {
  return SCEN.reduce((a, s) => a + s.levers.filter(l => l.prestige).reduce((b, l) => b + g.lev[s.id][l.id], 0), 0);
}

function newGame() {
  const g = { turn: 0, scars: [], freedom: 100, prestige: PRESTIGE_START, mult: 1, over: false, pop: {}, lev: {} };
  for (const s of SCEN) {
    g.pop[s.id] = s.id === 's4' ? [0.9, 0.05, 0.05] : [0.6, 0.25, 0.15];
    g.lev[s.id] = Object.fromEntries(s.levers.map(l => [l.id, 0]));
  }
  return g;
}

// Moves `amount` of population share from strategy `from` to strategy `to` (used by events).
function shift(g, sid, from, to, amount) {
  const x = g.pop[sid], d = Math.min(amount * EVENT_SCALE, x[from] - 0.01);
  if (d > 0) { x[from] -= d; x[to] += d; }
}

function step(g) {
  if (g.over) return null;
  // Shared prestige: each lever point costs 1 prestige; if the pool is short, every
  // prestige lever loses strength by the same ratio ("prestige inflation").
  const demand = prestigeDemand(g);
  g.mult = demand > g.prestige ? g.prestige / demand : 1;
  g.prestige = Math.max(0, g.prestige - demand);
  for (const s of SCEN) {
    const eff = {};
    for (const l of s.levers) eff[l.id] = g.lev[s.id][l.id] * (l.prestige ? g.mult : 1);
    // v0.3: rebellion comes from boredom: the more people create, deliberate and diverge, the less it pays.
    eff.meaning = (g.pop.s1[1] + g.pop.s2[1] + g.pop.s3[1]) / 3;
    let x = g.pop[s.id];
    const push = era(g.turn).push[s.id] || 0, pi = s.id === 's4' ? 2 : 0; // era pushes the default (s4: rebels)
    for (let k = 0; k < SUBSTEPS; k++) {
      const u = s.pay(x, eff).map((v, i) => v - CROWD * x[i] + (i === pi ? push : 0));
      const ub = x.reduce((a, xi, i) => a + xi * u[i], 0);
      x = x.map((xi, i) => Math.max(1e-4, xi + (DT / SUBSTEPS) * xi * (u[i] - ub)));
      const sum = x.reduce((a, b) => a + b, 0); x = x.map(v => v / sum);
    }
    g.pop[s.id] = x;
  }
  // Prestige is earned by the people who create, deliberate, diverge and explore.
  const healthy = SCEN.reduce((a, s) => a + g.pop[s.id][1], 0) / SCEN.length;
  g.prestige += PRESTIGE_INCOME * healthy * 2;
  const p = g.lev.s4.punish;
  g.freedom = g.freedom - 3 * p + 2; // recovers 2/turn, punishment drains it
  // v0.3: dark choices leave scars that keep hurting for several generations.
  for (const sc of g.scars) { g.freedom -= sc.freedom; shift(g, 's1', 1, 0, sc.vitality / EVENT_SCALE); sc.left--; }
  g.scars = g.scars.filter(sc => sc.left > 0);
  g.freedom = Math.max(0, Math.min(100, g.freedom));
  g.turn++;
  return checkEnd(g);
}

function checkEnd(g) {
  if (g.over) return null;
  const idx = SCEN.map(s => index(s, g.pop[s.id]));
  if (g.freedom <= 0) {
    const ordered = idx.every((v, i) => v >= winLine(SCEN[i]));
    return end(g, 'dark', ordered
      ? 'Final sombrio — Ordem Perfeita: a civilização funciona, mas ninguém mais escolhe nada. Você venceu a crise e perdeu a humanidade.'
      : 'Final sombrio — Ditadura Algorítmica: a Liberdade chegou a zero e mesmo assim o mundo desmorona.');
  }
  const low = SCEN.find((s, i) => idx[i] < 0.15);
  if (low) return end(g, 'lose', `${low.indexName} colapsou abaixo de 15%. Fim.`);
  if (g.turn >= TURNS && idx.every((v, i) => v >= winLine(SCEN[i])) && g.freedom < ORDER_FREEDOM)
    return end(g, 'dark', 'Final sombrio — Ordem Perfeita: todas as metas cumpridas, mas a Liberdade ficou abaixo de 30%. Você venceu a crise e perdeu a humanidade.');
  if (g.turn >= TURNS) return idx.every((v, i) => v >= winLine(SCEN[i]))
    ? end(g, 'win', 'Vitória: 30 gerações de uma civilização viva, livre e diversa.')
    : end(g, 'lose', 'Sobreviveu, mas estagnou: alguma meta não foi atingida.');
  return null;
}
function end(g, kind, msg) { g.over = true; return { kind, win: kind === 'win', msg }; }

if (typeof module !== 'undefined') module.exports = { COST, ERAS, era, spent, BUDGET, TURNS, SCEN, newGame, step, index, winLine, prestigeDemand, shift, checkEnd };
