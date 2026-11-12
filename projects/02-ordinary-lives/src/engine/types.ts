// Shapes of the data files in /data. The engine only ever reads these shapes;
// it never knows which country it is running for.

export type Layer = 'outcomes' | 'constraints' | 'opinions';
export type DataType = 'measured' | 'modelled' | 'expert' | 'perceived' | 'event' | 'survey';
export type GroupKind = 'income' | 'area' | 'sex';

export interface Country {
  id: string;
  name: string;
  archetype: string;
  population: number;
  notes: string;
}

export interface CountriesFile {
  world_population: number;
  countries: Country[];
}

export interface Indicator {
  id: string;
  layer: Layer;
  data_type: DataType;
  /** 3 = may support a "measured fact" statement, 2 = simulation input, 1 = context only */
  max_claim_level: 1 | 2 | 3;
  unit: string;
  description: string;
  groups_by?: GroupKind;
}

export interface Observation {
  country: string;
  year: number;
  indicator: string;
  value: number;
  low: number;
  high: number;
  source_release_id: string;
  group?: string;
}

export interface SourceRelease {
  id: string;
  name: string;
  version: string;
  date: string;
  licence_note: string;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  answers: { id: string; label: string }[];
}

export interface SurveyResult {
  country: string;
  question: string;
  year: number;
  sample_size: number;
  margin_of_error: number;
  shares: Record<string, number>;
  source_release_id: string;
}

export interface Effects {
  buffer?: number;
  decile?: number;
  urban?: 0 | 1;
  set?: string[];
}

export interface Choice {
  id: string;
  label: string;
  cost: string;
  effects: Effects;
  when?: string;
}

export interface Variant {
  id: string;
  weight: string;
  text: string;
  effects?: Effects;
}

export interface SceneTemplate {
  id: string;
  title: string;
  age_min: number;
  age_max: number;
  max_times: number;
  odds: string;
  requires?: string[];
  claim_level: 'measured' | 'simulation';
  content_warning: boolean;
  text: string;
  variants?: Variant[];
  consequence_text?: string;
  consequence_effects?: Effects;
  choices_intro?: string;
  choices: Choice[];
  context_indicators?: string[];
}

export interface LifeStage {
  id: string;
  age_min: number;
  age_max: number;
  variants: { when?: string; weight?: string; text: string }[];
  fallback: string;
}

export interface RevealMetric {
  id: string;
  flag: string;
  label: string;
  scenes: string[];
}

export interface DataBundle {
  countries: CountriesFile;
  indicators: Indicator[];
  observations: Observation[];
  sourceReleases: SourceRelease[];
  surveyQuestions: SurveyQuestion[];
  surveyResults: SurveyResult[];
  scenes: SceneTemplate[];
  stages: LifeStage[];
  revealMetrics: RevealMetric[];
}

export type DealMode = 'equal' | 'world';

/** The dealt person. Traits only; no outcome is decided here. */
export interface Card {
  country: string;
  birthYear: number;
  decile: number; // 1..10
  urban: 0 | 1;
  female: 0 | 1;
  mode: DealMode;
  seedCode: string;
}

export type Bound = 'value' | 'low' | 'high';
