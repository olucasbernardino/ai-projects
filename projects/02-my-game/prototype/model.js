// Game model for prototype v0.1. All numbers are DESIGN VALUES (invented to tune
// the game), not real-world data. See ../docs/game-design.md section 3.
// Each scenario: 3 strategies; strategy 1 is the "healthy" one the index measures.
// Payoff U_i = base_i + lever effects - CROWD * x_i  (crowding guarantees a mix).

const CROWD = 1.0, DT = 0.25, SUBSTEPS = 8, B = 2, WIN = 0.30, BUDGET = 14;

const SCEN = [
  { id: 's1', name: '1 · Crise de Sentido', indexName: 'Vitalidade',
    strats: ['Passivos', 'Criadores', 'Copiadores'],
    levers: [{ id: 'decay', name: 'Decadência de privilégios' }, { id: 'quality', name: 'Árbitro de originalidade' }],
    pay: (x, l) => [B + 1.2 - 0.25 * l.decay,
                    B + 0.15 + 0.2 * l.decay,
                    B + 0.9 - 0.3 * l.quality] },
  { id: 's2', name: '2 · Atrofia da Agência', indexName: 'Agência',
    strats: ['Delegadores', 'Deliberadores', 'Carimbadores'],
    levers: [{ id: 'weight', name: 'Peso de voto por deliberação' }, { id: 'audit', name: 'Auditoria de decisões' }],
    pay: (x, l) => [B + 1.2 - 0.25 * l.weight,
                    B + 0.05 + 0.2 * l.weight,
                    B + 0.8 + 0.1 * l.weight - 0.3 * l.audit] },
  { id: 's3', name: '3 · Quem define a Evolução?', indexName: 'Diversidade',
    strats: ['Conformados', 'Divergentes', 'Fingidores'],
    levers: [{ id: 'quota', name: 'Cotas para nichos' }, { id: 'peer', name: 'Verificação por pares' }],
    pay: (x, l) => [B + 0.8,
                    B + 0.05 + 0.25 * l.quota,
                    B + 0.3 + 0.25 * l.quota - 0.35 * l.peer] },
  { id: 's4', name: '4 · Rebelião da Liberdade', indexName: 'Estabilidade',
    strats: ['Conformistas', 'Fronteiriços', 'Rebeldes'],
    levers: [{ id: 'punish', name: 'Vigilância e punição', freedomCost: true }, { id: 'prestige', name: 'Prestígio da Zona de Fronteira' }],
    // Based on the owner's Scenario 4 payoffs, rescaled to the lever range.
    pay: (x, l) => [B - 0.5 - 1.5 * x[2],
                    B + 0.6 * l.prestige - 0.5,
                    B + 1.2 - (0.1 + 1.2 * x[2]) * 1.0 * l.punish] },
];

// S4 index is "not rebels"; others measure the healthy strategy share.
function index(s, x) { return s.id === 's4' ? 1 - x[2] : x[1]; }

function newGame() {
  const g = { turn: 0, freedom: 100, over: false, pop: {}, lev: {} };
  for (const s of SCEN) {
    g.pop[s.id] = s.id === 's4' ? [0.9, 0.05, 0.05] : [0.6, 0.25, 0.15];
    g.lev[s.id] = Object.fromEntries(s.levers.map(l => [l.id, 0]));
  }
  return g;
}

function step(g) {
  if (g.over) return null;
  for (const s of SCEN) {
    let x = g.pop[s.id];
    for (let k = 0; k < SUBSTEPS; k++) {
      const u = s.pay(x, g.lev[s.id]).map((v, i) => v - CROWD * x[i]);
      const ub = x.reduce((a, xi, i) => a + xi * u[i], 0);
      x = x.map((xi, i) => Math.max(1e-4, xi + (DT / SUBSTEPS) * xi * (u[i] - ub)));
      const sum = x.reduce((a, b) => a + b, 0); x = x.map(v => v / sum);
    }
    g.pop[s.id] = x;
  }
  const p = g.lev.s4.punish;
  g.freedom = Math.max(0, Math.min(100, g.freedom - 4 * p + 3)); // recovers 3/turn, punishment drains it
  g.turn++;
  const idx = SCEN.map(s => index(s, g.pop[s.id]));
  if (g.freedom <= 0) return end(g, false, 'Liberdade zerada: você virou a ditadura algorítmica. Fim.');
  const low = SCEN.find((s, i) => idx[i] < 0.15);
  if (low) return end(g, false, `${low.indexName} colapsou abaixo de 15%. Fim.`);
  if (g.turn >= 30) return idx.every(v => v >= WIN)
    ? end(g, true, 'Vitória: 30 gerações de uma civilização viva, livre e diversa.')
    : end(g, false, 'Sobreviveu, mas estagnou: algum índice ficou abaixo de 30%.');
  return null;
}
function end(g, win, msg) { g.over = true; return { win, msg }; }

if (typeof module !== 'undefined') module.exports = { BUDGET, SCEN, newGame, step, index };
