// The life simulator. It walks a life year by year in the background and
// pauses only when a scene fires. The same templates and the same code run
// for every country; only the data looked up differs.

import { boundValue, DataIndex, effectiveClaim, GROUP_LABELS, groupFor, sceneDriverIndicators } from './data';
import { compile, evaluate, MissingIndicatorError, type Env } from './formula';
import { hashSeed, Rng } from './rng';
import { fillText } from './text';
import type { Bound, Card, Choice, Effects, LifeStage, SceneTemplate } from './types';

/** The simulation stops at this age or this calendar year, whichever comes first. */
export const MAX_AGE = 45;
export const LAST_YEAR = 2024;
/** Savings buffer is a game counter (0-3), not data. Everyone starts at 1. */
export const START_BUFFER = 1;

export interface SourceLine {
  indicatorId: string;
  description: string;
  dataType: string;
  unit: string;
  group?: string;
  status: 'ok' | 'missing';
  value?: number;
  low?: number;
  high?: number;
  dataYear?: number;
  releaseName?: string;
  releaseVersion?: string;
  releaseDate?: string;
  licence?: string;
  role: 'drives the odds' | 'context';
}

export interface FiredScene {
  template: SceneTemplate;
  age: number;
  year: number;
  odds: number;
  variantId?: string;
  text: string;
  consequenceText?: string;
  choicesIntro: string;
  choices: Choice[];
  sources: SourceLine[];
  claim: 'measured' | 'simulation';
  heavy: boolean;
}

export type TimelineEntry =
  | { kind: 'quiet'; ageFrom: number; ageTo: number; yearFrom: number; yearTo: number; text: string }
  | { kind: 'scene'; scene: FiredScene; choiceId: string | null; steppedOut: boolean };

export interface Life {
  card: Card;
  bound: Bound;
  render: boolean;
  rng: Rng;
  endAge: number;
  age: number;
  cursor: number;
  yearHadScene: boolean;
  flags: Set<string>;
  buffer: number;
  decile: number;
  urban: 0 | 1;
  times: Record<string, number>;
  timeline: TimelineEntry[];
  pending: FiredScene | null;
  quiet: { from: number; to: number; stage: LifeStage } | null;
  /** sceneId -> indicators that were missing and the years it happened */
  unmeasured: Record<string, { indicators: string[]; years: number[] }>;
  firedHeavy: boolean;
  done: boolean;
}

export interface LifeOptions {
  seed?: number;
  bound?: Bound;
  /** Build display text and source lines (off for the 1,000-life runs, for speed). */
  render?: boolean;
}

export function lifeSeed(card: Card): number {
  return hashSeed('life', card.seedCode, card.country, card.birthYear, card.decile, card.urban, card.female);
}

export function createLife(card: Card, opts: LifeOptions = {}): Life {
  return {
    card,
    bound: opts.bound ?? 'value',
    render: opts.render ?? true,
    rng: new Rng(opts.seed ?? lifeSeed(card)),
    endAge: Math.min(MAX_AGE, LAST_YEAR - card.birthYear),
    age: 0,
    cursor: 0,
    yearHadScene: false,
    flags: new Set(),
    buffer: START_BUFFER,
    decile: card.decile,
    urban: card.urban,
    times: {},
    timeline: [],
    pending: null,
    quiet: null,
    unmeasured: {},
    firedHeavy: false,
    done: false,
  };
}

const person = (life: Life) => ({ decile: life.decile, urban: life.urban, female: life.card.female });
const yearOf = (life: Life) => life.card.birthYear + life.age;

function makeEnv(life: Life, idx: DataIndex, used?: Set<string>): Env {
  return {
    state: (name) => {
      switch (name) {
        case 'age': return life.age;
        case 'year': return yearOf(life);
        case 'decile': return life.decile;
        case 'urban': return life.urban;
        case 'female': return life.card.female;
        case 'buffer': return life.buffer;
      }
      throw new Error(`Unknown state variable ${name}`);
    },
    flag: (name) => life.flags.has(name),
    indicator: (id) => {
      const l = idx.lookup(life.card.country, id, yearOf(life), person(life));
      if (l.status !== 'ok') throw new MissingIndicatorError(id);
      used?.add(id);
      return boundValue(l.obs, life.bound);
    },
  };
}

function recordUnmeasured(life: Life, sceneId: string, indicator: string) {
  const u = (life.unmeasured[sceneId] ??= { indicators: [], years: [] });
  if (!u.indicators.includes(indicator)) u.indicators.push(indicator);
  const y = yearOf(life);
  if (!u.years.includes(y)) u.years.push(y);
}

function applyEffects(life: Life, e: Effects | undefined) {
  if (!e) return;
  if (e.buffer) life.buffer = Math.max(0, Math.min(3, life.buffer + e.buffer));
  if (e.decile) life.decile = Math.max(1, Math.min(10, life.decile + e.decile));
  if (e.urban !== undefined) life.urban = e.urban;
  for (const f of e.set ?? []) life.flags.add(f);
}

function sourceLine(life: Life, idx: DataIndex, id: string, role: SourceLine['role']): SourceLine {
  const ind = idx.indicators.get(id)!;
  const l = idx.lookup(life.card.country, id, yearOf(life), person(life));
  const g = groupFor(ind, person(life));
  const base = {
    indicatorId: id,
    description: ind.description,
    dataType: ind.data_type,
    unit: ind.unit,
    group: g ? GROUP_LABELS[g] : undefined,
    role,
  };
  if (l.status !== 'ok') return { ...base, status: 'missing' };
  return {
    ...base,
    status: 'ok',
    value: l.obs.value,
    low: l.obs.low,
    high: l.obs.high,
    dataYear: l.obs.year,
    releaseName: l.release?.name,
    releaseVersion: l.release?.version,
    releaseDate: l.release?.date,
    licence: l.release?.licence_note,
  };
}

function renderScene(life: Life, idx: DataIndex, s: SceneTemplate, odds: number, variantText: string | undefined): FiredScene {
  const country = idx.country(life.card.country);
  const textRefs = new Set<string>();
  const resolve = (id: string) => {
    textRefs.add(id);
    const l = idx.lookup(life.card.country, id, yearOf(life), person(life));
    return l.status === 'ok' ? l.obs.value : null;
  };
  const vars = { country: country.name, year: String(yearOf(life)), age: String(life.age), variant: variantText ?? '' };
  const choices = availableChoices(life, idx, s)
    .map((c) => ({ ...c, cost: fillText(c.cost, vars, resolve) }));
  const text = fillText(s.text, vars, resolve);
  const drivers = sceneDriverIndicators(s);
  const context = [...new Set([...textRefs, ...(s.context_indicators ?? [])])].filter((id) => !drivers.includes(id));
  return {
    template: s,
    age: life.age,
    year: yearOf(life),
    odds,
    text,
    consequenceText: s.consequence_text ? fillText(s.consequence_text, vars, resolve) : undefined,
    choicesIntro: s.choices_intro ?? (life.age < 16 ? "Your household's options" : 'Your options'),
    choices,
    sources: [
      ...drivers.map((id) => sourceLine(life, idx, id, 'drives the odds')),
      ...context.map((id) => sourceLine(life, idx, id, 'context')),
    ],
    claim: effectiveClaim(s, idx),
    heavy: s.content_warning,
  };
}

function availableChoices(life: Life, idx: DataIndex, s: SceneTemplate): Choice[] {
  const env = makeEnv(life, idx);
  return s.choices.filter((c) => {
    if (!c.when) return true;
    try {
      return !!evaluate(compile(c.when), env);
    } catch (e) {
      if (e instanceof MissingIndicatorError) return false; // never assume a value
      throw e;
    }
  });
}

/** The odds a scene has right now for this life, or 'missing'. Exposed for tests. */
export function sceneOdds(life: Life, idx: DataIndex, s: SceneTemplate): number | { missing: string } {
  const env = makeEnv(life, idx);
  try {
    for (const r of s.requires ?? []) env.indicator(r);
    return Math.max(0, Math.min(1, evaluate(compile(s.odds), env)));
  } catch (e) {
    if (e instanceof MissingIndicatorError) return { missing: e.indicator };
    throw e;
  }
}

function tryScene(life: Life, idx: DataIndex, s: SceneTemplate): FiredScene | null {
  if (life.age < s.age_min || life.age > s.age_max) return null;
  if ((life.times[s.id] ?? 0) >= s.max_times) return null;
  const env = makeEnv(life, idx);
  let p: number;
  let weights: number[] | undefined;
  try {
    for (const r of s.requires ?? []) env.indicator(r);
    p = Math.max(0, Math.min(1, evaluate(compile(s.odds), env)));
    weights = s.variants?.map((v) => evaluate(compile(v.weight), env));
  } catch (e) {
    if (e instanceof MissingIndicatorError) {
      // Not measured here: the scene cannot happen in the simulation, and we say so.
      recordUnmeasured(life, s.id, e.indicator);
      return null;
    }
    throw e;
  }
  if (!life.rng.chance(p)) return null;
  life.times[s.id] = (life.times[s.id] ?? 0) + 1;
  let variantText: string | undefined;
  if (s.variants && weights) {
    const v = s.variants[life.rng.weightedIndex(weights)];
    variantText = v.text;
    applyEffects(life, v.effects);
  }
  applyEffects(life, s.consequence_effects);
  if (s.content_warning) life.firedHeavy = true;
  if (!life.render) {
    return {
      template: s, age: life.age, year: yearOf(life), odds: p, text: '', choicesIntro: '',
      choices: availableChoices(life, idx, s),
      sources: [], claim: 'simulation', heavy: s.content_warning,
    };
  }
  return renderScene(life, idx, s, p, variantText);
}

function stageFor(idx: DataIndex, age: number): LifeStage {
  return idx.bundle.stages.find((s) => age >= s.age_min && age <= s.age_max) ?? idx.bundle.stages[idx.bundle.stages.length - 1];
}

function quietText(life: Life, idx: DataIndex, stage: LifeStage): string {
  const env = makeEnv(life, idx);
  try {
    const options = stage.variants.filter((v) => !v.when || !!evaluate(compile(v.when), env));
    if (options.length === 0) return stage.fallback;
    const w = options.map((v) => (v.weight ? evaluate(compile(v.weight), env) : 1));
    return options[life.rng.weightedIndex(w)].text;
  } catch (e) {
    if (e instanceof MissingIndicatorError) return stage.fallback;
    throw e;
  }
}

function flushQuiet(life: Life, idx: DataIndex) {
  const q = life.quiet;
  if (!q) return;
  life.quiet = null;
  if (!life.render) return;
  life.timeline.push({
    kind: 'quiet',
    ageFrom: q.from,
    ageTo: q.to,
    yearFrom: life.card.birthYear + q.from,
    yearTo: life.card.birthYear + q.to,
    text: quietText(life, idx, q.stage),
  });
}

function markQuiet(life: Life, idx: DataIndex) {
  const stage = stageFor(idx, life.age);
  if (life.quiet && life.quiet.stage.id === stage.id && life.quiet.to === life.age - 1) {
    life.quiet.to = life.age;
    return;
  }
  flushQuiet(life, idx);
  life.quiet = { from: life.age, to: life.age, stage };
}

/** Runs the life forward until the next scene (returned) or the end (null). */
export function advance(life: Life, idx: DataIndex): FiredScene | null {
  if (life.pending) return life.pending;
  const scenes = idx.bundle.scenes;
  while (life.age <= life.endAge) {
    while (life.cursor < scenes.length) {
      const fired = tryScene(life, idx, scenes[life.cursor++]);
      if (fired) {
        flushQuiet(life, idx);
        life.yearHadScene = true;
        life.pending = fired;
        return fired;
      }
    }
    if (!life.yearHadScene) markQuiet(life, idx);
    life.age++;
    life.cursor = 0;
    life.yearHadScene = false;
  }
  flushQuiet(life, idx);
  life.done = true;
  return null;
}

/** Answers the pending scene. `choiceId` null = no choice (or stepped out). */
export function resolve(life: Life, choiceId: string | null, steppedOut = false) {
  const p = life.pending;
  if (!p) throw new Error('No scene to resolve');
  const choice = choiceId ? p.choices.find((c) => c.id === choiceId) : undefined;
  if (choiceId && !choice) throw new Error(`Unknown choice ${choiceId}`);
  applyEffects(life, choice?.effects);
  if (life.render) life.timeline.push({ kind: 'scene', scene: p, choiceId: choice?.id ?? null, steppedOut });
  life.pending = null;
}

export type Policy = (scene: FiredScene) => string | null;

/** Simulated people choose at random among the options offered. */
export function randomPolicy(rng: Rng): Policy {
  return (scene) => (scene.choices.length ? scene.choices[rng.int(0, scene.choices.length - 1)].id : null);
}

export function runLife(card: Card, idx: DataIndex, opts: LifeOptions & { policy?: Policy } = {}): Life {
  const life = createLife(card, opts);
  const policy = opts.policy ?? randomPolicy(new Rng(hashSeed('policy', opts.seed ?? lifeSeed(card))));
  for (let scene = advance(life, idx); scene; scene = advance(life, idx)) resolve(life, policy(scene));
  return life;
}
