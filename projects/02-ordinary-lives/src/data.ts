// Loads the JSON files in /data into the app. The engine receives only this
// bundle; it has no knowledge of any particular country.

import countries from '../data/countries.json';
import indicators from '../data/indicators.json';
import observations from '../data/observations.json';
import source_releases from '../data/source_releases.json';
import survey_questions from '../data/survey_questions.json';
import survey_results from '../data/survey_results.json';
import scene_templates from '../data/scene_templates.json';
import life_stages from '../data/life_stages.json';
import reveal_metrics from '../data/reveal_metrics.json';
import { makeBundle } from './engine/bundle';

export const bundle = makeBundle({
  countries,
  indicators,
  observations,
  source_releases,
  survey_questions,
  survey_results,
  scene_templates,
  life_stages,
  reveal_metrics,
});
