// Generates the FAKE sandbox data for "Ordinary Lives".
//
// Every number in data/observations.json and data/survey_results.json comes
// from this script, so the "work" behind each fake figure is visible here.
// NONE of these numbers describe a real place. The countries are fictional.
//
// Run:  npm run generate-data
// The script is deterministic: running it twice gives identical files.

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'data');
const readJson = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));

const indicators = readJson('indicators.json');
const countryIds = readJson('countries.json').countries.map((c) => c.id);
const YEARS = [1980, 1990, 2000, 2010, 2020];

// Half-width of the uncertainty range, as a share of the value, by data type.
// Older data years get wider ranges (see widen()).
const UNCERTAINTY = {
  measured: 0.05,
  survey: 0.12,
  modelled: 0.3,
  expert: 0.15,
  perceived: 0.15,
  event: 0.25,
};
const widen = (u, year) => u * (1 + (2020 - year) / 40);

// Which fake source release each data type comes from.
const RELEASE_BY_TYPE = {
  measured: 'SR-VITAL-2022',
  survey: 'SR-HHS-2021',
  modelled: 'SR-MODEL-2022',
  expert: 'SR-EXPERT-2023',
  perceived: 'SR-OPINION-2022',
  event: 'SR-EVENTS-2023',
};

// [value in 1980, value in 2020] per country; years in between are a straight
// line. Order of countries: NHV, MRV, TSN, QRV, UBD, SLM, PLR, DRV.
// `null` = never measured in that country.
const P = {
  urban_share: [[0.72, 0.83], [0.45, 0.62], [0.4, 0.66], [0.3, 0.41], [0.15, 0.29], [0.6, 0.8], [0.35, 0.52], [0.38, 0.5]],
  female_share: [[0.505, 0.505], [0.51, 0.51], [0.49, 0.49], [0.515, 0.515], [0.505, 0.505], [0.512, 0.512], [0.498, 0.498], [0.52, 0.52]],
  gini: [[0.25, 0.28], [0.38, 0.41], [0.33, 0.36], null, [0.4, 0.38], [0.58, 0.53], [0.36, 0.37], [0.4, 0.39]],
  poverty_rate: [[0.06, 0.05], [0.3, 0.16], [0.25, 0.08], [0.35, 0.55], [0.62, 0.41], [0.35, 0.22], [0.28, 0.18], [0.5, 0.33]],
  school_completion: [[0.8, 0.95], [0.4, 0.72], [0.55, 0.93], [0.4, 0.28], [0.15, 0.45], [0.35, 0.7], [0.45, 0.8], [0.35, 0.6]],
  health_coverage: [[0.95, 0.99], [0.45, 0.7], [0.8, 0.97], [0.4, 0.25], [0.2, 0.45], [0.5, 0.75], [0.6, 0.82], [0.3, 0.55]],
  catastrophic_health_spending: [[0.05, 0.04], [0.22, 0.2], [0.1, 0.08], null, [0.28, 0.25], [0.24, 0.18], [0.15, 0.12], [0.26, 0.22]],
  informality: [[0.1, 0.08], [0.55, 0.45], [0.3, 0.2], [0.7, 0.85], [0.88, 0.8], [0.55, 0.47], [0.5, 0.4], [0.75, 0.6]],
  youth_unemployment: [[0.08, 0.12], [0.2, 0.18], [0.1, 0.07], [0.3, 0.45], [0.12, 0.15], [0.25, 0.3], [0.25, 0.22], [0.35, 0.28]],
  social_protection_coverage: [[0.9, 0.98], [0.3, 0.45], [0.7, 0.85], [0.15, 0.05], [0.05, 0.15], [0.35, 0.55], [0.25, 0.4], [0.1, 0.3]],
  homicide_rate: [[1.2, 0.9], [8, 6], [2, 1.5], [15, 40], [7, 6], [22, 28], [3, 4], [30, 9]],
  bribery_experience: [[0.06, 0.04], [0.5, 0.45], [0.35, 0.25], null, [0.6, 0.5], [0.35, 0.3], [0.2, 0.15], [0.65, 0.45]],
  police_mistreatment: [[0.05, 0.04], [0.15, 0.18], null, null, [0.14, 0.12], [0.22, 0.2], [0.06, 0.05], [0.25, 0.15]],
  discrimination_experience: [[0.2, 0.18], [0.25, 0.28], null, null, [0.22, 0.2], [0.35, 0.32], [0.15, 0.15], [0.35, 0.3]],
  digital_surveillance: [[0.15, 0.35], [0.3, 0.6], [0.7, 0.95], [0.4, 0.6], [0.1, 0.25], [0.2, 0.4], [0.05, 0.15], [0.5, 0.4]],
  protest_events: [[20, 25], [8, 15], [0.5, 0.3], [5, 10], [6, 8], [15, 20], [10, 8], [2, 12]],
  protest_repression_share: [[0.05, 0.03], [0.25, 0.35], null, [0.6, 0.7], [0.15, 0.12], [0.2, 0.18], [0.05, 0.04], [0.6, 0.2]],
  freedom_expression: [[0.92, 0.94], [0.55, 0.4], [0.1, 0.08], [0.25, 0.15], [0.6, 0.7], [0.7, 0.68], [0.85, 0.86], [0.15, 0.55]],
  arbitrary_detention: [[3, 2], [40, 70], [150, 120], [200, 350], [25, 20], [30, 25], null, [300, 40]],
  rule_of_law: [[0.9, 0.93], [0.45, 0.35], [0.4, 0.45], [0.2, 0.1], [0.45, 0.5], [0.45, 0.42], [0.7, 0.72], [0.1, 0.4]],
  displacement_risk: [[0.0002, 0.0002], [0.001, 0.0015], [0.0005, 0.0005], [0.02, 0.05], [0.001, 0.0015], [0.0015, 0.002], [0.003, 0.004], [0.06, 0.005]],
  conflict_deaths: [[0, 0], [0.5, 1], [0.2, 0.1], [20, 60], [0.3, 0.2], [0.5, 0.4], [0, 0], [80, 1]],
  emigration_rate: [[0.003, 0.004], [0.02, 0.03], [0.005, 0.003], [0.03, 0.05], [0.02, 0.03], [0.015, 0.02], [0.04, 0.05], [0.05, 0.03]],
  disaster_exposure: [[0.001, 0.002], [0.005, 0.008], [0.005, 0.005], [0.005, 0.008], [0.01, 0.015], [0.005, 0.008], [0.03, 0.045], [0.005, 0.006]],
  electricity_access: [[1, 1], [0.75, 0.97], [0.85, 1], [0.6, 0.55], [0.1, 0.45], [0.85, 0.99], [0.6, 0.93], [0.5, 0.85]],
  child_mortality: [[8, 3], [70, 22], [40, 8], [120, 85], [180, 70], [55, 20], [45, 15], [160, 45]],
  trust_police: [[0.8, 0.82], [0.4, 0.3], null, [0.2, 0.15], [0.45, 0.5], [0.3, 0.25], [0.7, 0.72], [0.15, 0.4]],
  democracy_satisfaction: [[0.7, 0.65], [0.45, 0.3], null, [0.15, 0.1], [0.55, 0.58], [0.4, 0.35], [0.66, 0.6], [0.2, 0.45]],
};

// Data years that are missing on purpose, to test "not measured here".
const MISSING_YEARS = {
  QRV: { school_completion: [1980, 1990, 2000] },
  UBD: { catastrophic_health_spending: [1980, 1990] },
  PLR: { homicide_rate: [1980, 1990], youth_unemployment: [1980, 1990, 2000] },
  DRV: Object.fromEntries(
    [
      'gini', 'poverty_rate', 'school_completion', 'health_coverage', 'informality',
      'youth_unemployment', 'social_protection_coverage', 'bribery_experience',
      'police_mistreatment', 'discrimination_experience', 'trust_police',
      'democracy_satisfaction',
    ].map((id) => [id, [1980, 1990]]).concat([['catastrophic_health_spending', [1980, 1990, 2000]]]),
  ),
};

// Breakdowns. Each formula keeps the population-weighted average equal to the
// overall value, so groups never invent extra people.
// Income gap for school completion (percentage points, top vs bottom).
const SCHOOL_GAP = [0.06, 0.2, 0.05, 0.2, 0.25, 0.3, 0.12, 0.2];
// Urban/rural gap for health coverage and electricity.
const HEALTH_AREA_GAP = [0.01, 0.2, 0.05, 0.25, 0.3, 0.25, 0.15, 0.25];
const ELECTRICITY_AREA_GAP = [0, 0.08, 0.03, 0.3, 0.4, 0.06, 0.1, 0.2];

const SHARE_UNITS = new Set(['share', 'index_0_1']);
const round = (x) => Math.round(x * 1e5) / 1e5;
const clampShare = (x) => Math.min(1, Math.max(0, x));
const lerp = ([a, b], year) => a + ((b - a) * (year - 1980)) / 40;

function row(country, year, ind, value, group) {
  const u = widen(UNCERTAINTY[ind.data_type], year);
  const isShare = SHARE_UNITS.has(ind.unit);
  const cap = isShare ? clampShare : (x) => Math.max(0, x);
  const v = cap(value);
  const out = {
    country,
    year,
    indicator: ind.id,
    value: round(v),
    low: round(cap(v * (1 - u))),
    high: round(cap(v * (1 + u))),
    source_release_id: RELEASE_BY_TYPE[ind.data_type],
  };
  if (group) out.group = group;
  return out;
}

const observations = [];
for (const ind of indicators) {
  const table = P[ind.id];
  if (!table) throw new Error(`No fake values for indicator ${ind.id}`);
  countryIds.forEach((country, ci) => {
    const pair = table[ci];
    if (pair === null) return; // never measured here
    for (const year of YEARS) {
      if (MISSING_YEARS[country]?.[ind.id]?.includes(year)) continue;
      const v = lerp(pair, year);
      if (ind.id === 'school_completion') {
        const g = SCHOOL_GAP[ci];
        // weights 0.4 / 0.4 / 0.2 and offsets -1 / +0.5 / +1 average to zero
        observations.push(row(country, year, ind, v - g, 'bottom40'));
        observations.push(row(country, year, ind, v + 0.5 * g, 'middle40'));
        observations.push(row(country, year, ind, v + g, 'top20'));
      } else if (ind.id === 'catastrophic_health_spending') {
        const s = 0.5; // same income gradient strength everywhere (fake)
        observations.push(row(country, year, ind, v * (1 + s), 'bottom40'));
        observations.push(row(country, year, ind, v * (1 - 0.25 * s), 'middle40'));
        observations.push(row(country, year, ind, v * (1 - 1.5 * s), 'top20'));
      } else if (ind.id === 'health_coverage' || ind.id === 'electricity_access') {
        const d = (ind.id === 'health_coverage' ? HEALTH_AREA_GAP : ELECTRICITY_AREA_GAP)[ci];
        const urbanShare = lerp(P.urban_share[ci], year);
        // u*(v + d(1-u)) + (1-u)*(v - d u) = v
        observations.push(row(country, year, ind, v + d * (1 - urbanShare), 'urban'));
        observations.push(row(country, year, ind, v - d * urbanShare, 'rural'));
      } else if (ind.id === 'discrimination_experience') {
        observations.push(row(country, year, ind, v * 1.3, 'female'));
        observations.push(row(country, year, ind, v * 0.7, 'male'));
      } else {
        observations.push(row(country, year, ind, v));
      }
    }
  });
}

// ---- Fake survey results (year 2022) ----------------------------------
// Shares are derived from the fake 2020 indicator values with simple,
// written-down formulas, then normalised to sum to 1.
const v2020 = (id, ci) => (P[id][ci] === null ? null : P[id][ci][1]);
const SAMPLE = [1200, 1500, 1000, 800, 1400, 1600, 400, 900];
const questions = readJson('survey_questions.json');
const MISSING_SURVEY = { TSN: ['q_police_trust', 'q_speak_freely'], QRV: ['q_redistribution'] };

function sharesFor(qid, ci) {
  switch (qid) {
    case 'q_police_trust': {
      const t = v2020('trust_police', ci);
      if (t === null) return null;
      return { a_lot: t * 0.45, somewhat: t * 0.55, not_much: (1 - t) * 0.6, not_at_all: (1 - t) * 0.4 };
    }
    case 'q_speak_freely': {
      const f = v2020('freedom_expression', ci);
      return { yes: f * 0.7, sometimes: f * 0.3 + 0.1, rarely: (1 - f) * 0.5, no: (1 - f) * 0.5 };
    }
    case 'q_effort_luck': {
      const g = v2020('gini', ci) ?? 0.4;
      return { hard_work: 1 - g, luck: g, both: 0.3 };
    }
    case 'q_redistribution': {
      const g = v2020('gini', ci) ?? 0.4;
      return { strongly_agree: g, agree: 0.35, disagree: 0.6 - g, strongly_disagree: 0.15 };
    }
    case 'q_freedom_order': {
      const danger = Math.min(1, v2020('homicide_rate', ci) / 30 + v2020('conflict_deaths', ci) / 30);
      return { freedom: 0.6 - 0.3 * danger, order: 0.3 + 0.4 * danger, cant_choose: 0.1 };
    }
    case 'q_children_future': {
      const [p0, p1] = P.poverty_rate[ci];
      const improving = Math.max(-0.3, Math.min(0.3, p0 - p1));
      return { better: 0.35 + improving, same: 0.3, worse: 0.35 - improving };
    }
    default:
      throw new Error(`No fake survey formula for ${qid}`);
  }
}

const surveyResults = [];
countryIds.forEach((country, ci) => {
  for (const q of questions) {
    if (MISSING_SURVEY[country]?.includes(q.id)) continue;
    const raw = sharesFor(q.id, ci);
    if (raw === null) continue;
    const total = Object.values(raw).reduce((a, b) => a + Math.max(0, b), 0);
    const shares = {};
    for (const a of q.answers) shares[a.id] = round(Math.max(0, raw[a.id]) / total);
    const n = SAMPLE[ci];
    surveyResults.push({
      country,
      question: q.id,
      year: 2022,
      sample_size: n,
      // 95% margin of error for a 50% share, in share units
      margin_of_error: round(1.96 * Math.sqrt(0.25 / n)),
      shares,
      source_release_id: 'SR-OPINION-2022',
    });
  }
});

writeFileSync(join(dataDir, 'observations.json'), JSON.stringify(observations, null, 1) + '\n');
writeFileSync(join(dataDir, 'survey_results.json'), JSON.stringify(surveyResults, null, 2) + '\n');
console.log(`observations: ${observations.length} rows; survey results: ${surveyResults.length} rows`);
