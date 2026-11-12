// Looking up indicator values. The one rule that matters most here:
// if there is no observation, the answer is "missing" — never a default value.

import { indicatorRefs } from './formula';
import type { Bound, DataBundle, Indicator, Observation, SceneTemplate, SourceRelease } from './types';

/** How far (in years) an observation may be from the year asked about. */
export const YEAR_TOLERANCE = 5;

export interface PersonForLookup {
  decile: number;
  urban: 0 | 1;
  female: 0 | 1;
}

export type Lookup =
  | {
      status: 'ok';
      indicator: Indicator;
      obs: Observation;
      release: SourceRelease | undefined;
    }
  | { status: 'missing'; indicator: Indicator | undefined; reason: string };

export function incomeGroup(decile: number): 'bottom40' | 'middle40' | 'top20' {
  if (decile <= 4) return 'bottom40';
  if (decile <= 8) return 'middle40';
  return 'top20';
}

export function groupFor(ind: Indicator, p: PersonForLookup): string | undefined {
  switch (ind.groups_by) {
    case 'income':
      return incomeGroup(p.decile);
    case 'area':
      return p.urban ? 'urban' : 'rural';
    case 'sex':
      return p.female ? 'female' : 'male';
    default:
      return undefined;
  }
}

export const GROUP_LABELS: Record<string, string> = {
  bottom40: 'poorest 40% of households',
  middle40: 'middle 40% of households',
  top20: 'richest 20% of households',
  urban: 'urban areas',
  rural: 'rural areas',
  female: 'women',
  male: 'men',
};

export class DataIndex {
  private byKey = new Map<string, Observation[]>();
  readonly indicators = new Map<string, Indicator>();
  readonly releases = new Map<string, SourceRelease>();

  constructor(readonly bundle: DataBundle) {
    for (const ind of bundle.indicators) this.indicators.set(ind.id, ind);
    for (const r of bundle.sourceReleases) this.releases.set(r.id, r);
    for (const o of bundle.observations) {
      const key = `${o.country}|${o.indicator}|${o.group ?? ''}`;
      const list = this.byKey.get(key) ?? [];
      list.push(o);
      this.byKey.set(key, list);
    }
  }

  country(id: string) {
    const c = this.bundle.countries.countries.find((x) => x.id === id);
    if (!c) throw new Error(`Unknown country id ${id}`);
    return c;
  }

  lookup(country: string, indicatorId: string, year: number, person: PersonForLookup): Lookup {
    const indicator = this.indicators.get(indicatorId);
    if (!indicator) return { status: 'missing', indicator, reason: `unknown indicator ${indicatorId}` };
    const group = groupFor(indicator, person);
    const rows = this.byKey.get(`${country}|${indicatorId}|${group ?? ''}`) ?? [];
    if (rows.length === 0) return { status: 'missing', indicator, reason: 'not measured here' };
    // Prefer the latest observation at or before the year (no peeking ahead),
    // otherwise the earliest one after it, both within YEAR_TOLERANCE.
    let best: Observation | undefined;
    for (const o of rows) {
      if (o.year <= year && year - o.year <= YEAR_TOLERANCE && (!best || o.year > best.year)) best = o;
    }
    if (!best) {
      for (const o of rows) {
        if (o.year > year && o.year - year <= YEAR_TOLERANCE && (!best || o.year < best.year)) best = o;
      }
    }
    if (!best) return { status: 'missing', indicator, reason: `not measured here within ${YEAR_TOLERANCE} years of ${year}` };
    return { status: 'ok', indicator, obs: best, release: this.releases.get(best.source_release_id) };
  }
}

export function boundValue(o: Observation, bound: Bound): number {
  return bound === 'low' ? o.low : bound === 'high' ? o.high : o.value;
}

/** Indicators whose values drive whether / how a scene fires. */
export function sceneDriverIndicators(scene: SceneTemplate): string[] {
  const ids = new Set<string>(indicatorRefs(scene.odds));
  for (const v of scene.variants ?? []) indicatorRefs(v.weight).forEach((x) => ids.add(x));
  for (const r of scene.requires ?? []) ids.add(r);
  return [...ids];
}

/** The badge a scene may show. "Measured fact" only if every driver allows it. */
export function effectiveClaim(scene: SceneTemplate, idx: DataIndex): 'measured' | 'simulation' {
  if (scene.claim_level !== 'measured') return 'simulation';
  const ok = sceneDriverIndicators(scene).every((id) => (idx.indicators.get(id)?.max_claim_level ?? 0) >= 3);
  return ok ? 'measured' : 'simulation';
}

/** Checks the data files fit together. Returns a list of problems (empty = fine). */
export function validateBundle(b: DataBundle): string[] {
  const errors: string[] = [];
  const indIds = new Set(b.indicators.map((i) => i.id));
  const countryIds = new Set(b.countries.countries.map((c) => c.id));
  const releaseIds = new Set(b.sourceReleases.map((r) => r.id));
  const level = new Map(b.indicators.map((i) => [i.id, i.max_claim_level]));
  for (const o of b.observations) {
    if (!countryIds.has(o.country)) errors.push(`observation for unknown country ${o.country}`);
    if (!indIds.has(o.indicator)) errors.push(`observation for unknown indicator ${o.indicator}`);
    if (!releaseIds.has(o.source_release_id)) errors.push(`observation with unknown release ${o.source_release_id}`);
    if (!(o.low <= o.value && o.value <= o.high)) errors.push(`value outside low/high: ${o.country} ${o.indicator} ${o.year}`);
  }
  const checkFormula = (where: string, src: string, driving: boolean) => {
    try {
      for (const id of indicatorRefs(src)) {
        if (!indIds.has(id)) errors.push(`${where}: unknown indicator "${id}"`);
        else if (driving && level.get(id) === 1) errors.push(`${where}: context-only indicator "${id}" cannot drive odds`);
      }
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`);
    }
  };
  for (const s of b.scenes) {
    checkFormula(`scene ${s.id} odds`, s.odds, true);
    for (const v of s.variants ?? []) checkFormula(`scene ${s.id} variant ${v.id}`, v.weight, true);
    for (const c of s.choices) if (c.when) checkFormula(`scene ${s.id} choice ${c.id}`, c.when, true);
    for (const r of [...(s.requires ?? []), ...(s.context_indicators ?? [])]) {
      if (!indIds.has(r)) errors.push(`scene ${s.id}: unknown indicator "${r}"`);
    }
    for (const m of s.text.matchAll(/\{(\w+):(\w+)\}/g)) {
      if (!indIds.has(m[2])) errors.push(`scene ${s.id} text: unknown indicator "${m[2]}"`);
    }
  }
  for (const st of b.stages) {
    for (const v of st.variants) {
      if (v.when) checkFormula(`stage ${st.id}`, v.when, true);
      if (v.weight) checkFormula(`stage ${st.id}`, v.weight, true);
    }
  }
  const sceneIds = new Set(b.scenes.map((s) => s.id));
  for (const m of b.revealMetrics) for (const s of m.scenes) if (!sceneIds.has(s)) errors.push(`metric ${m.id}: unknown scene ${s}`);
  return errors;
}
