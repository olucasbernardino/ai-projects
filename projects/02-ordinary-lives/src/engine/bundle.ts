// Builds a DataBundle from the parsed JSON files. Shared by the app and the tests.

import type { DataBundle } from './types';

export interface RawFiles {
  countries: unknown;
  indicators: unknown;
  observations: unknown;
  source_releases: unknown;
  survey_questions: unknown;
  survey_results: unknown;
  scene_templates: unknown;
  life_stages: unknown;
  reveal_metrics: unknown;
}

export function makeBundle(f: RawFiles): DataBundle {
  return {
    countries: f.countries as DataBundle['countries'],
    indicators: f.indicators as DataBundle['indicators'],
    observations: f.observations as DataBundle['observations'],
    sourceReleases: f.source_releases as DataBundle['sourceReleases'],
    surveyQuestions: f.survey_questions as DataBundle['surveyQuestions'],
    surveyResults: f.survey_results as DataBundle['surveyResults'],
    scenes: f.scene_templates as DataBundle['scenes'],
    stages: f.life_stages as DataBundle['stages'],
    revealMetrics: f.reveal_metrics as DataBundle['revealMetrics'],
  };
}
