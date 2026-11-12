// Loads the real /data files for tests (Node side).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeBundle, type RawFiles } from '../src/engine/bundle';
import type { DataBundle } from '../src/engine/types';

const dataDir = join(__dirname, '..', 'data');
const read = (f: string) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));

export function loadRaw(): RawFiles {
  return {
    countries: read('countries.json'),
    indicators: read('indicators.json'),
    observations: read('observations.json'),
    source_releases: read('source_releases.json'),
    survey_questions: read('survey_questions.json'),
    survey_results: read('survey_results.json'),
    scene_templates: read('scene_templates.json'),
    life_stages: read('life_stages.json'),
    reveal_metrics: read('reveal_metrics.json'),
  };
}

/** A fresh deep copy each call, so a test can edit its fixture safely. */
export function loadBundle(): DataBundle {
  return makeBundle(JSON.parse(JSON.stringify(loadRaw())));
}
