// Reality Reveal: run many lives with the same card and count outcomes.

import { DataIndex, sceneDriverIndicators } from './data';
import { hashSeed } from './rng';
import { LAST_YEAR, MAX_AGE, runLife, type Life } from './life';
import type { Bound, Card, RevealMetric } from './types';

export const DATA_THIN_THRESHOLD = 0.15;

export interface MetricResult {
  metric: RevealMetric;
  /** null = not measured here */
  per100: number | null;
  range: [number, number] | null;
  missingIndicators: string[];
  missingYears: [number, number] | null;
  you: boolean | null;
}

export interface RevealResult {
  lives: number;
  metrics: MetricResult[];
  heavyPer100: number;
  worldShare: number;
  dataThinness: DataThinness;
}

export interface DataThinness {
  share: number;
  thin: boolean;
  missing: { indicator: string; years: [number, number] }[];
}

interface Tally {
  counts: Record<string, number>;
  unmeasured: Record<string, { indicators: Set<string>; years: Set<number> }>;
  heavy: number;
  n: number;
}

function tally(card: Card, idx: DataIndex, n: number, bound: Bound, salt: string): Tally {
  const t: Tally = { counts: {}, unmeasured: {}, heavy: 0, n };
  for (let i = 0; i < n; i++) {
    const life = runLife(card, idx, { seed: hashSeed(salt, card.seedCode, card.country, card.birthYear, i), bound, render: false });
    for (const f of life.flags) t.counts[f] = (t.counts[f] ?? 0) + 1;
    if (life.firedHeavy) t.heavy++;
    for (const [sid, u] of Object.entries(life.unmeasured)) {
      const acc = (t.unmeasured[sid] ??= { indicators: new Set(), years: new Set() });
      u.indicators.forEach((x) => acc.indicators.add(x));
      u.years.forEach((x) => acc.years.add(x));
    }
  }
  return t;
}

/** Quick estimate used for the content notice before a life starts. */
export function heavyShare(card: Card, idx: DataIndex, n = 300): number {
  return (tally(card, idx, n, 'value', 'notice').heavy / n) * 100;
}

export function dataThinness(card: Card, idx: DataIndex): DataThinness {
  const ids = [...new Set(idx.bundle.scenes.flatMap(sceneDriverIndicators))];
  const endAge = Math.min(MAX_AGE, LAST_YEAR - card.birthYear);
  const person = { decile: card.decile, urban: card.urban, female: card.female };
  let missingCount = 0;
  let total = 0;
  const missing: DataThinness['missing'] = [];
  for (const id of ids) {
    let first: number | null = null;
    let last: number | null = null;
    for (let y = card.birthYear; y <= card.birthYear + endAge; y++) {
      total++;
      if (idx.lookup(card.country, id, y, person).status !== 'ok') {
        missingCount++;
        first ??= y;
        last = y;
      }
    }
    if (first !== null && last !== null) missing.push({ indicator: id, years: [first, last] });
  }
  const share = total ? missingCount / total : 0;
  return { share, thin: share > DATA_THIN_THRESHOLD, missing };
}

export function reveal(card: Card, idx: DataIndex, playerLife: Life | null, n = 1000): RevealResult {
  const central = tally(card, idx, n, 'value', 'sim');
  const boundN = Math.max(50, Math.round(n / 4));
  const low = tally(card, idx, boundN, 'low', 'sim-low');
  const high = tally(card, idx, boundN, 'high', 'sim-high');
  const per100 = (t: Tally, flag: string) => ((t.counts[flag] ?? 0) / t.n) * 100;

  const metrics = idx.bundle.revealMetrics.map((m): MetricResult => {
    const indicators = new Set<string>();
    const years = new Set<number>();
    for (const t of [central, low, high]) {
      for (const sid of m.scenes) {
        t.unmeasured[sid]?.indicators.forEach((x) => indicators.add(x));
        t.unmeasured[sid]?.years.forEach((x) => years.add(x));
      }
    }
    if (playerLife) {
      for (const sid of m.scenes) {
        playerLife.unmeasured[sid]?.indicators.forEach((x) => indicators.add(x));
        playerLife.unmeasured[sid]?.years.forEach((x) => years.add(x));
      }
    }
    if (indicators.size > 0) {
      // Strict rule: if any year this could happen is not measured, we do not
      // give a number at all (missing years would silently count as "no").
      const ys = [...years].sort((a, b) => a - b);
      return { metric: m, per100: null, range: null, missingIndicators: [...indicators], missingYears: [ys[0], ys[ys.length - 1]], you: null };
    }
    const values = [per100(central, m.flag), per100(low, m.flag), per100(high, m.flag)];
    return {
      metric: m,
      per100: values[0],
      range: [Math.min(...values), Math.max(...values)],
      missingIndicators: [],
      missingYears: null,
      you: playerLife ? playerLife.flags.has(m.flag) : null,
    };
  });

  const country = idx.country(card.country);
  return {
    lives: n,
    metrics,
    heavyPer100: (central.heavy / n) * 100,
    worldShare: country.population / idx.bundle.countries.world_population,
    dataThinness: dataThinness(card, idx),
  };
}

