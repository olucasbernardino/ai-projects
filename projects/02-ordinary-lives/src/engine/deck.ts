// Dealing. Equal mode: a shuffled deck holding every country once, reshuffled
// only when it runs out. World mode: countries weighted by (fake) population.
// Inside a country, traits are drawn from that country's own data.

import { DataIndex } from './data';
import { hashSeed, Rng } from './rng';
import type { Card, DealMode } from './types';

export const BIRTH_YEAR_MIN = 1975;
export const BIRTH_YEAR_MAX = 1995;

/** The first `count` countries the equal deck deals for this seed. */
export function deckOrder(countryIds: string[], deckSeed: number, count: number): string[] {
  const rng = new Rng(hashSeed('deck', deckSeed));
  const out: string[] = [];
  while (out.length < count) out.push(...rng.shuffle(countryIds));
  return out.slice(0, count);
}

export function seedCode(mode: DealMode, deckSeed: number, n: number): string {
  return `${mode === 'equal' ? 'E' : 'W'}-${deckSeed}-${n + 1}`;
}

/** A lens keeps the dealt traits but changes the country or the birth year. */
export interface Lens {
  country?: string;
  yearShift?: number;
}

export function parseSeedCode(code: string): { mode: DealMode; deckSeed: number; n: number; lens: Lens } | null {
  const m = /^\s*([EW])-(\d{1,10})-(\d{1,6})(?:~C:([A-Za-z0-9_]+))?(?:~Y:(-?\d{1,3}))?\s*$/i.exec(code);
  if (!m) return null;
  const n = Number(m[3]) - 1;
  if (n < 0) return null;
  const lens: Lens = {};
  if (m[4]) lens.country = m[4].toUpperCase();
  if (m[5]) lens.yearShift = Number(m[5]);
  return { mode: m[1].toUpperCase() === 'E' ? 'equal' : 'world', deckSeed: Number(m[2]), n, lens };
}

export function applyLens(card: Card, lens: Lens): Card {
  const base = card.seedCode.split('~')[0];
  const country = lens.country ?? card.country;
  const birthYear = card.birthYear + (lens.yearShift ?? 0);
  let code = base;
  if (lens.country) code += `~C:${lens.country}`;
  if (lens.yearShift) code += `~Y:${lens.yearShift}`;
  return { ...card, country, birthYear, seedCode: code };
}

/** Re-creates a card from a seed code shown on screen. */
export function cardFromSeedCode(idx: DataIndex, code: string): Card | null {
  const p = parseSeedCode(code);
  if (!p) return null;
  if (p.lens.country && !idx.bundle.countries.countries.some((c) => c.id === p.lens.country)) return null;
  const card = dealCard(idx, p.mode, p.deckSeed, p.n);
  return p.lens.country || p.lens.yearShift ? applyLens(card, p.lens) : card;
}

function pickCountry(idx: DataIndex, mode: DealMode, deckSeed: number, n: number): string {
  const countries = idx.bundle.countries.countries;
  if (mode === 'equal') return deckOrder(countries.map((c) => c.id), deckSeed, n + 1)[n];
  const rng = new Rng(hashSeed('world', deckSeed, n));
  return countries[rng.weightedIndex(countries.map((c) => c.population))].id;
}

/** Draws the person's traits from the country's distribution for the birth year. */
export function drawTraits(idx: DataIndex, country: string, rng: Rng) {
  const birthYear = rng.int(BIRTH_YEAR_MIN, BIRTH_YEAR_MAX);
  // Income deciles are equal tenths of households by definition.
  const decile = rng.int(1, 10);
  const nobody = { decile, urban: 0 as const, female: 0 as const };
  const urbanL = idx.lookup(country, 'urban_share', birthYear, nobody);
  const femaleL = idx.lookup(country, 'female_share', birthYear, nobody);
  if (urbanL.status !== 'ok' || femaleL.status !== 'ok') {
    // No default: a person cannot be dealt without the data that describes them.
    throw new Error(`Cannot deal: birth traits not measured for ${country} in ${birthYear}`);
  }
  const urban: 0 | 1 = rng.chance(urbanL.obs.value) ? 1 : 0;
  const female: 0 | 1 = rng.chance(femaleL.obs.value) ? 1 : 0;
  return { birthYear, decile, urban, female };
}

export function dealCard(idx: DataIndex, mode: DealMode, deckSeed: number, n: number): Card {
  const country = pickCountry(idx, mode, deckSeed, n);
  const traits = drawTraits(idx, country, new Rng(hashSeed('traits', mode, deckSeed, n)));
  return { country, ...traits, mode, seedCode: seedCode(mode, deckSeed, n) };
}
