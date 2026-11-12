import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { addAnswer, MIN_GROUP, summarize, type Counts } from '../src/engine/aggregates';
import { DataIndex, validateBundle } from '../src/engine/data';
import { cardFromSeedCode, dealCard, deckOrder } from '../src/engine/deck';
import { compile, evaluate } from '../src/engine/formula';
import { advance, createLife, resolve, runLife, sceneOdds, type Policy } from '../src/engine/life';
import { reveal } from '../src/engine/reveal';
import { fillText } from '../src/engine/text';
import type { Card, DataBundle } from '../src/engine/types';
import { loadBundle } from './load';

const firstChoice: Policy = (s) => s.choices[0]?.id ?? null;

function cardFor(country: string, overrides: Partial<Card> = {}): Card {
  return { country, birthYear: 1985, decile: 3, urban: 1, female: 1, mode: 'equal', seedCode: 'E-1-1', ...overrides };
}

/** A life positioned at a given age, ready to ask for scene odds. */
function lifeAt(card: Card, age: number) {
  const life = createLife(card);
  life.age = age;
  return life;
}

describe('data files', () => {
  test('fit together (no unknown ids, values inside their bounds, valid formulas)', () => {
    expect(validateBundle(loadBundle())).toEqual([]);
  });

  test('every number has a low and a high bound', () => {
    for (const o of loadBundle().observations) {
      expect(typeof o.low).toBe('number');
      expect(typeof o.high).toBe('number');
      expect(o.low).toBeLessThanOrEqual(o.value);
      expect(o.high).toBeGreaterThanOrEqual(o.value);
    }
  });

  test('there are 8 fictional countries and about 25 indicators', () => {
    const b = loadBundle();
    expect(b.countries.countries).toHaveLength(8);
    expect(b.indicators.length).toBeGreaterThanOrEqual(25);
  });
});

describe('1. dealing: the deck deals every country once before repeating', () => {
  test.each([1, 42, 999_999, 123_456])('seed %i', (seed) => {
    const b = loadBundle();
    const ids = b.countries.countries.map((c) => c.id);
    const order = deckOrder(ids, seed, ids.length * 4);
    for (let round = 0; round < 4; round++) {
      const slice = order.slice(round * ids.length, (round + 1) * ids.length);
      expect(new Set(slice).size).toBe(ids.length);
    }
  });

  test('dealCard follows the deck, and traits are drawn inside the country', () => {
    const b = loadBundle();
    const idx = new DataIndex(b);
    const dealt = Array.from({ length: 8 }, (_, n) => dealCard(idx, 'equal', 7, n).country);
    expect(new Set(dealt).size).toBe(8);
  });

  test('world mode deals by population weight', () => {
    const b = loadBundle();
    const idx = new DataIndex(b);
    const counts: Record<string, number> = {};
    for (let n = 0; n < 4000; n++) {
      const c = dealCard(idx, 'world', 3, n).country;
      counts[c] = (counts[c] ?? 0) + 1;
    }
    const pops = b.countries.countries;
    const biggest = pops.reduce((a, c) => (c.population > a.population ? c : a));
    const smallest = pops.reduce((a, c) => (c.population < a.population ? c : a));
    expect(counts[biggest.id] ?? 0).toBeGreaterThan(counts[smallest.id] ?? 0);
  });
});

describe('2. changing a country\'s data changes its scene odds, with no code change', () => {
  test.each(['police_mistreatment', 'discrimination', 'health_cost', 'arbitrary_detention', 'surveillance'])('scene %s', (sceneId) => {
    const b = loadBundle();
    const scene = b.scenes.find((s) => s.id === sceneId)!;
    const indicatorId = { police_mistreatment: 'police_mistreatment', discrimination: 'discrimination_experience', health_cost: 'catastrophic_health_spending', arbitrary_detention: 'arbitrary_detention', surveillance: 'digital_surveillance' }[sceneId]!;
    // Pick the first country that measures this indicator; no country is named here.
    const country = b.observations.find((o) => o.indicator === indicatorId)!.country;
    const card = cardFor(country);
    const before = sceneOdds(lifeAt(card, 30), new DataIndex(b), scene);

    const fixture: DataBundle = loadBundle();
    for (const o of fixture.observations) {
      if (o.country === country && o.indicator === indicatorId) {
        o.value = o.value / 2;
        o.low = o.low / 2;
        o.high = o.high / 2;
      }
    }
    const after = sceneOdds(lifeAt(card, 30), new DataIndex(fixture), scene);
    expect(typeof before).toBe('number');
    expect(typeof after).toBe('number');
    expect(after).toBeLessThan(before as number);
  });

  test('police, discrimination and surveillance scenes also fire in the rich democracy, at its own rates', () => {
    const b = loadBundle();
    const idx = new DataIndex(b);
    const rich = b.countries.countries.find((c) => c.archetype === 'rich consolidated democracy')!;
    for (const id of ['police_mistreatment', 'discrimination', 'surveillance']) {
      const odds = sceneOdds(lifeAt(cardFor(rich.id), 30), idx, b.scenes.find((s) => s.id === id)!);
      expect(typeof odds).toBe('number');
      expect(odds as number).toBeGreaterThan(0);
    }
  });

  test('reveal outcomes follow the data: lifetime share in simulation ≈ the indicator', () => {
    const b = loadBundle();
    const idx = new DataIndex(b);
    const rich = b.countries.countries.find((c) => c.archetype === 'rich consolidated democracy')!;
    // Born 1975 -> simulated to age 45, so the full window of the scene is used.
    const card = cardFor(rich.id, { birthYear: 1975, seedCode: 'E-5-5' });
    const r = reveal(card, idx, null, 2000);
    const m = r.metrics.find((x) => x.metric.id === 'police_mistreatment')!;
    // Expected share: average of the indicator over the years of the scene's
    // window (ages 15-45 = 1990-2020), read from the data, not typed in.
    let sum = 0;
    for (let y = 1990; y <= 2020; y++) {
      const l = idx.lookup(rich.id, 'police_mistreatment', y, card);
      if (l.status !== 'ok') throw new Error('expected data');
      sum += l.obs.value;
    }
    const target = (sum / 31) * 100;
    expect(m.per100).not.toBeNull();
    expect(Math.abs(m.per100! - target)).toBeLessThan(1.5);
  });
});

describe('3. no country id in engine code', () => {
  const srcDir = join(__dirname, '..', 'src');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|js|css|html)$/.test(f)) files.push(p);
    }
  };
  walk(srcDir);
  files.push(join(__dirname, '..', 'index.html'));

  test('source files never contain a country id or name', () => {
    const b = loadBundle();
    expect(files.length).toBeGreaterThan(5);
    for (const c of b.countries.countries) {
      const pattern = new RegExp(`\\b(${c.id}|${c.name})\\b`, 'i');
      for (const f of files) {
        expect(pattern.test(readFileSync(f, 'utf8')), `${c.id}/${c.name} found in ${f}`).toBe(false);
      }
    }
  });
});

describe('4. missing indicators give "not measured here", never a default', () => {
  test('lookup returns missing, and scene odds report the missing indicator', () => {
    const b = loadBundle();
    const country = b.countries.countries[0].id;
    b.observations = b.observations.filter((o) => !(o.country === country && o.indicator === 'police_mistreatment'));
    const idx = new DataIndex(b);
    const card = cardFor(country);
    expect(idx.lookup(country, 'police_mistreatment', 2000, card).status).toBe('missing');
    const odds = sceneOdds(lifeAt(card, 30), idx, b.scenes.find((s) => s.id === 'police_mistreatment')!);
    expect(odds).toEqual({ missing: 'police_mistreatment' });
  });

  test('a year far from any observation is missing, not the nearest value', () => {
    const idx = new DataIndex(loadBundle());
    const country = loadBundle().countries.countries[0].id;
    expect(idx.lookup(country, 'homicide_rate', 1950, cardFor(country)).status).toBe('missing');
  });

  test('the reveal shows null ("not measured here"), not zero, and the scene never fires', () => {
    const b = loadBundle();
    const country = b.countries.countries[0].id;
    b.observations = b.observations.filter((o) => !(o.country === country && o.indicator === 'police_mistreatment'));
    const idx = new DataIndex(b);
    const card = cardFor(country);
    const r = reveal(card, idx, null, 200);
    const m = r.metrics.find((x) => x.metric.id === 'police_mistreatment')!;
    expect(m.per100).toBeNull();
    expect(m.missingIndicators).toContain('police_mistreatment');
    for (let i = 0; i < 50; i++) {
      const life = runLife(card, idx, { seed: i, policy: firstChoice });
      expect(life.flags.has('police_mistreatment')).toBe(false);
      expect(life.unmeasured.police_mistreatment).toBeDefined();
    }
  });

  test('scene text with a missing number says so', () => {
    expect(fillText('About {in100:x} in 100.', {}, () => null)).toBe('About [not measured here] in 100.');
  });

  test('the real data has thin countries that trigger "not measured here"', () => {
    const b = loadBundle();
    const idx = new DataIndex(b);
    const thinCountry = b.countries.countries.find((c) => c.archetype === 'active conflict zone')!;
    const r = reveal(cardFor(thinCountry.id, { birthYear: 1990 }), idx, null, 100);
    expect(r.metrics.some((m) => m.per100 === null)).toBe(true);
  });
});

describe('5. player aggregates suppress groups under 5', () => {
  test('4 answers are hidden, 5 are shown', () => {
    let counts: Counts = {};
    const answers = ['a', 'b'];
    for (let i = 0; i < MIN_GROUP - 1; i++) counts = addAnswer(counts, 'X', 'q', i % 2 ? 'a' : 'b');
    const hidden = summarize(counts, 'X', 'q', answers);
    expect(hidden).toEqual({ suppressed: true });
    expect('n' in hidden).toBe(false); // not even the count leaks
    counts = addAnswer(counts, 'X', 'q', 'a');
    const shown = summarize(counts, 'X', 'q', answers);
    expect(shown.suppressed).toBe(false);
    if (!shown.suppressed) expect(shown.n).toBe(5);
  });

  test('groups are per dealt country and question', () => {
    let counts: Counts = {};
    for (let i = 0; i < 10; i++) counts = addAnswer(counts, 'X', 'q', 'a');
    expect(summarize(counts, 'Y', 'q', ['a']).suppressed).toBe(true);
    expect(summarize(counts, 'X', 'other', ['a']).suppressed).toBe(true);
  });

  test('stored counts hold no identifiers, only numbers', () => {
    let counts: Counts = {};
    counts = addAnswer(counts, 'X', 'q', 'a');
    expect(JSON.stringify(counts)).toBe('{"X":{"q":{"a":1}}}');
  });
});

describe('6. same seed gives the same life', () => {
  test('two runs from one seed code are identical', () => {
    const b = loadBundle();
    const idx = new DataIndex(b);
    for (let n = 0; n < 8; n++) {
      const card = dealCard(idx, 'equal', 2024, n);
      const again = cardFromSeedCode(idx, card.seedCode)!;
      expect(again).toEqual(card);
      const a = runLife(card, idx, { policy: firstChoice });
      const c = runLife(again, idx, { policy: firstChoice });
      expect(JSON.stringify(c.timeline)).toBe(JSON.stringify(a.timeline));
      expect([...c.flags].sort()).toEqual([...a.flags].sort());
    }
  });

  test('lens seed codes replay too', () => {
    const idx = new DataIndex(loadBundle());
    const card = dealCard(idx, 'world', 11, 3);
    const other = loadBundle().countries.countries.find((c) => c.id !== card.country)!.id;
    const code = `${card.seedCode}~C:${other}~Y:-10`;
    const lensed = cardFromSeedCode(idx, code)!;
    expect(lensed.country).toBe(other);
    expect(lensed.birthYear).toBe(card.birthYear - 10);
    expect(lensed.seedCode).toBe(code);
  });

  test('stepping through interactively gives the same life as the headless run', () => {
    const idx = new DataIndex(loadBundle());
    const card = dealCard(idx, 'equal', 77, 2);
    const headless = runLife(card, idx, { policy: firstChoice });
    const life = createLife(card);
    for (let s = advance(life, idx); s; s = advance(life, idx)) {
      resolve(life, firstChoice(s)); // the same calls the UI makes
    }
    expect(JSON.stringify(life.timeline)).toBe(JSON.stringify(headless.timeline));
  });
});

describe('formula language', () => {
  const env = { state: () => 30, flag: (n: string) => n === 'on', indicator: (id: string) => (id === 'x' ? 0.2 : 0.5) };
  test.each([
    ['1 - x', 0.8],
    ['flag.on ? x : 0', 0.2],
    ['flag.off ? x : 0', 0],
    ['min(0.25, y / 100)', 0.005],
    ['age >= 19 ? 1 : 0', 1],
    ['!flag.on', 0],
    ['per100k(100000)', 1],
  ])('%s = %f', (src, expected) => {
    expect(evaluate(compile(src), env)).toBeCloseTo(expected, 10);
  });
  test('annual() turns a share over N years into the matching yearly chance', () => {
    const p = evaluate(compile('annual(0.5, 10)'), env);
    expect(1 - Math.pow(1 - p, 10)).toBeCloseTo(0.5, 10);
  });
  test('rejects anything that is not the formula language', () => {
    expect(() => compile('alert(1)')).toThrow();
    expect(() => compile('x; y')).toThrow();
  });
});
