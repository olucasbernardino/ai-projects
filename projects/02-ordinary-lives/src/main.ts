// UI for the sandbox. Plain DOM, text first. Every country-related word on
// screen comes from the data files; this file never names a country.

import './style.css';
import { bundle } from './data';
import { addAnswer, loadCounts, saveCounts, summarize, type Counts } from './engine/aggregates';
import { DataIndex, GROUP_LABELS, incomeGroup, validateBundle } from './engine/data';
import { applyLens, cardFromSeedCode, dealCard } from './engine/deck';
import { advance, createLife, resolve, type FiredScene, type Life, type SourceLine, type TimelineEntry } from './engine/life';
import { dataThinness, heavyShare, reveal, type MetricResult, type RevealResult } from './engine/reveal';
import { hashSeed, Rng } from './engine/rng';
import { formatNumber } from './engine/text';
import type { Card, DealMode, SurveyQuestion } from './engine/types';

const idx = new DataIndex(bundle);
const problems = validateBundle(bundle);
const app = document.getElementById('app')!;

// ---------- small helpers ----------
const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const countryName = (id: string) => idx.country(id).name;
const pct = (x: number) => `${formatNumber(x * 100)}%`;
const ageSpan = (a: number, b: number) => (a === b ? `Age ${a}` : `Ages ${a}–${b}`);

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function loadPrefs(): { deckSeed: number; next: Record<DealMode, number>; mode: DealMode } | null {
  try {
    const raw = storage()?.getItem('ordinary-lives:deck:v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function savePrefs() {
  try {
    storage()?.setItem('ordinary-lives:deck:v1', JSON.stringify({ deckSeed: S.deckSeed, next: S.next, mode: S.mode }));
  } catch {
    /* per-viewer convenience only */
  }
}

// ---------- state ----------
type Screen = 'start' | 'card' | 'life' | 'reveal' | 'voice' | 'lenses';
interface State {
  screen: Screen;
  mode: DealMode;
  deckSeed: number;
  next: Record<DealMode, number>;
  card: Card | null;
  baseCard: Card | null;
  life: Life | null;
  heavy: number | null;
  reveal: RevealResult | null;
  voiceQuestions: SurveyQuestion[];
  myAnswers: Record<string, string> | null;
  counts: Counts;
  lens: { kind: 'country' | 'earlier' | 'players'; country?: string; result?: RevealResult; card?: Card } | null;
  error: string | null;
}
const prefs = loadPrefs();
const S: State = {
  screen: 'start',
  mode: prefs?.mode ?? 'equal',
  deckSeed: prefs?.deckSeed ?? Math.floor(Math.random() * 1_000_000),
  next: prefs?.next ?? { equal: 0, world: 0 },
  card: null,
  baseCard: null,
  life: null,
  heavy: null,
  reveal: null,
  voiceQuestions: [],
  myAnswers: null,
  counts: loadCounts(storage()),
  lens: null,
  error: null,
};

const modeLabel = (m: DealMode) =>
  m === 'equal'
    ? 'Equal deck: every country is dealt once before any repeats'
    : 'The world as it is: countries dealt by (fake) population';

// ---------- rendering ----------
function render() {
  let html = '';
  if (problems.length) {
    html += `<div class="notice ui"><p><strong>Data check found ${problems.length} problem(s):</strong></p><ul>${problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
  }
  switch (S.screen) {
    case 'start': html += startScreen(); break;
    case 'card': html += cardScreen(); break;
    case 'life': html += lifeScreen(); break;
    case 'reveal': html += revealScreen(); break;
    case 'voice': html += voiceScreen(); break;
    case 'lenses': html += lensesScreen(); break;
  }
  app.innerHTML = html;
  window.scrollTo({ top: 0 });
  (app.querySelector('[data-autofocus]') as HTMLElement | null)?.focus({ preventScroll: true });
}

function header(): string {
  const seed = S.card ? ` · Seed <code>${esc(S.card.seedCode)}</code>` : '';
  return `<p class="meta">Dealing mode: ${esc(modeLabel(S.card?.mode ?? S.mode))}${seed}</p>`;
}

function startScreen(): string {
  return `
  <h1>Ordinary Lives</h1>
  <p>You will be dealt an ordinary person: a country, a birth year, a household income group, a home in a town or the countryside, and a sex. Then you live their life in short scenes.</p>
  <p>How likely each scene is comes only from data about that country and year. Here the data is invented and the countries are fictional, so this sandbox can be judged before real data goes in.</p>
  <p>There is no score and no winning. At the end you see how typical the life was.</p>
  <div class="card ui">
    <h3>How should lives be dealt?</h3>
    <div class="toggle" role="group" aria-label="Dealing mode">
      <button data-action="mode" data-mode="equal" aria-pressed="${S.mode === 'equal'}">Equal deck</button>
      <button data-action="mode" data-mode="world" aria-pressed="${S.mode === 'world'}">The world as it is</button>
    </div>
    <p class="meta">${esc(modeLabel(S.mode))}.</p>
    <div class="row" style="margin-top:12px"><button data-action="deal" data-autofocus>Deal a life</button></div>
  </div>
  <div class="card ui">
    <h3>Replay a life</h3>
    <p class="meta">Every life has a seed. The same seed and the same choices give the same life.</p>
    <form class="row" data-form="replay">
      <label for="seed" class="meta">Seed</label>
      <input type="text" id="seed" name="seed" placeholder="E-123456-1" autocomplete="off" />
      <button class="secondary" type="submit">Replay</button>
    </form>
    ${S.error ? `<p class="notice">${esc(S.error)}</p>` : ''}
  </div>`;
}

function traitsList(card: Card): string {
  const g = incomeGroup(card.decile);
  return `<ul class="traits ui">
    <li><strong>Household income:</strong> group ${card.decile} of 10 (${card.decile - 1}0% of households had less), part of the ${esc(GROUP_LABELS[g])}</li>
    <li><strong>Home:</strong> ${card.urban ? 'a town or city' : 'the countryside'}</li>
    <li><strong>Sex:</strong> ${card.female ? 'female' : 'male'}</li>
  </ul>`;
}

function cardScreen(): string {
  const card = S.card!;
  const c = idx.country(card.country);
  const heavy = S.heavy ?? 0;
  const thin = dataThinness(card, idx);
  const notice =
    heavy >= 1
      ? `<div class="notice ui" role="note">
          <p><strong>Content notice.</strong> In about ${formatNumber(heavy)} of 100 simulated lives dealt this card, the life includes a heavy scene: a death in the family, violence, detention or being forced from home.</p>
          <p>These scenes describe what happens to family, income and options, never graphic detail. Each one has a "Step out of this scene" button.</p>
        </div>`
      : '';
  return `
  ${header()}
  <h1>You are born in ${card.birthYear} in ${esc(c.name)}.</h1>
  <p class="meta">${esc(c.name)} is a fictional ${esc(c.archetype)}. ${esc(c.notes)}</p>
  ${traitsList(card)}
  ${thin.thin ? `<p class="notice ui">Data is thin for this life: ${Math.round(thin.share * 100)}% of the indicator-years it needs are not measured. Scenes that depend on them cannot happen here, and the Reality Reveal will say "not measured here" rather than guess.</p>` : ''}
  ${notice}
  <div class="row ui">
    <button data-action="begin" data-autofocus>Begin this life</button>
    <button class="secondary" data-action="home">Back</button>
  </div>`;
}

function claimBadge(claim: FiredScene['claim']): string {
  return claim === 'measured'
    ? `<span class="badge measured" title="The rate quoted in this scene is a measured figure.">Measured fact</span>`
    : `<span class="badge" title="The timing and odds come from a simulation built from averages.">Simulation built from averages</span>`;
}

function sourceItem(s: SourceLine): string {
  const ind = idx.indicators.get(s.indicatorId)!;
  if (s.status === 'missing') {
    return `<li><strong>${esc(s.indicatorId)}</strong> <span class="nm">(not measured here for this year${s.group ? `, ${esc(s.group)}` : ''})</span><br>${esc(s.description)}</li>`;
  }
  return `<li>
    <strong>${esc(s.indicatorId)}</strong>: ${esc(formatNumber(s.value!))} <span class="meta">(range ${esc(formatNumber(s.low!))}–${esc(formatNumber(s.high!))}, unit: ${esc(s.unit)})</span><br>
    ${esc(s.description)}${s.group ? ` <em>Group used: ${esc(s.group)}.</em>` : ''}<br>
    <span class="meta">Role: ${esc(s.role)} · Data type: ${esc(s.dataType)} · Highest claim allowed: level ${ind.max_claim_level} · Data year: ${s.dataYear} · Source: ${esc(s.releaseName)} v${esc(s.releaseVersion)} (${esc(s.releaseDate)}) · ${esc(s.licence)}</span>
  </li>`;
}

function sourcesBlock(scene: FiredScene): string {
  return `<details class="ui">
    <summary>Where does this come from?</summary>
    <div class="sources">
      <p>Chance of this scene in the simulation this year: <strong>${esc(pct(scene.odds))}</strong>, from the formula <code>${esc(scene.template.odds)}</code>.</p>
      <ul>${scene.sources.map(sourceItem).join('')}</ul>
      <p class="meta">Badge: ${scene.claim === 'measured' ? '"Measured fact" means the rate quoted is a measured or surveyed figure. Whether it happens to you is still a simulated draw.' : '"Simulation built from averages" means the odds combine averages and assumptions. It describes people like you, not you.'}</p>
    </div>
  </details>`;
}

function timelineItem(e: TimelineEntry): string {
  if (e.kind === 'quiet') {
    return `<li class="quiet">${ageSpan(e.ageFrom, e.ageTo)} (${e.yearFrom}${e.yearTo !== e.yearFrom ? `–${e.yearTo}` : ''}): ${esc(e.text)}.</li>`;
  }
  const s = e.scene;
  const choice = s.choices.find((c) => c.id === e.choiceId);
  const what = e.steppedOut
    ? `You stepped out of this scene.${s.consequenceText ? ` What it meant: ${esc(s.consequenceText)}` : ''}`
    : choice
      ? `${esc(s.choicesIntro.replace(/options$/, 'choice'))}: ${esc(choice.label)}.`
      : '';
  return `<li><strong>Age ${s.age} (${s.year}): ${esc(s.template.title)}</strong>${what ? `<div class="what">${what}</div>` : ''}</li>`;
}

function lifeScreen(): string {
  const life = S.life!;
  const card = life.card;
  const scene = life.pending;
  const past = `<h2>So far</h2><ol class="timeline">${life.timeline.map(timelineItem).join('') || '<li class="quiet">Born.</li>'}</ol>`;
  if (!scene) {
    return `
    ${header()}
    <h1>This life, to age ${life.endAge}</h1>
    <p class="meta">The simulation stops at age ${life.endAge} (${card.birthYear + life.endAge}).</p>
    ${past}
    <div class="row ui" style="margin-top:16px"><button data-action="reveal" data-autofocus>See the Reality Reveal</button></div>`;
  }
  const heavy = scene.heavy
    ? `<div class="notice ui"><p>This scene involves a heavy event. It shows only what follows for your family, income and options.</p>
       <button class="secondary" data-action="stepout">Step out of this scene</button></div>`
    : '';
  const choices = scene.choices.length
    ? `<h3 class="ui">${esc(scene.choicesIntro)}</h3>${scene.choices
        .map((c) => `<button class="choice ui" data-action="choose" data-choice="${esc(c.id)}">${esc(c.label)}<span class="cost">${esc(c.cost)}</span></button>`)
        .join('')}`
    : `<div class="row ui"><button data-action="choose" data-choice="" data-autofocus>Continue</button></div>`;
  return `
  ${header()}
  <p class="meta">Age ${scene.age} · ${scene.year} · ${esc(countryName(card.country))}</p>
  <div class="card">
    <div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(scene.template.title)}</h2>${claimBadge(scene.claim)}</div>
    ${heavy}
    <p>${esc(scene.text)}</p>
    ${scene.consequenceText ? `<p><em>${esc(scene.consequenceText)}</em></p>` : ''}
    ${choices}
    ${sourcesBlock(scene)}
  </div>
  ${past}`;
}

function metricLine(m: MetricResult, showYou: boolean): string {
  if (m.per100 === null) {
    const inds = m.missingIndicators.map((i) => esc(i)).join(', ');
    const yrs = m.missingYears ? ` (years ${m.missingYears[0]}–${m.missingYears[1]})` : '';
    return `<div class="metric"><span class="nm">Not measured here:</span> how many ${esc(m.metric.label)}. Missing: ${inds}${yrs}. No number is shown, because missing years would count silently as "did not happen".</div>`;
  }
  const you = showYou && m.you !== null ? `<div class="you">${m.you ? 'You were one of them.' : 'You were not one of them.'}</div>` : '';
  const range = m.range && m.range[1] - m.range[0] >= 0.5 ? ` <span class="meta">(range ${formatNumber(m.range[0])}–${formatNumber(m.range[1])} across the data's uncertainty)</span>` : '';
  return `<div class="metric"><span class="num">${formatNumber(m.per100)}</span> out of 100 ${esc(m.metric.label)}.${range}${you}</div>`;
}

function revealScreen(): string {
  const r = S.reveal;
  const card = S.card!;
  if (!r) return `${header()}<h1>Reality Reveal</h1><p class="ui">Running 1,000 lives with your card…</p>`;
  const c = idx.country(card.country);
  const thin = r.dataThinness;
  return `
  ${header()}
  <h1>Reality Reveal</h1>
  <p>Out of 100 people born in ${card.birthYear} in ${esc(c.name)} with your card (income group ${card.decile} of 10, ${card.urban ? 'town or city' : 'countryside'}, ${card.female ? 'female' : 'male'}), followed to age ${S.life!.endAge}:</p>
  <div class="card">${r.metrics.map((m) => metricLine(m, true)).join('')}</div>
  ${thin.thin ? `<div class="notice ui"><p><strong>Data is thin here.</strong> ${Math.round(thin.share * 100)}% of the indicator-years this life needs are not measured.</p><p>Missing: ${thin.missing.map((m) => `${esc(m.indicator)} (${m.years[0]}–${m.years[1]})`).join('; ')}.</p></div>` : ''}
  <div class="card ui">
    <p>${esc(c.name)} holds ${formatNumber(r.worldShare * 100)}% of the (fake) world population.</p>
    <p>${formatNumber(r.heavyPer100)} in 100 of these lives met at least one heavy scene.</p>
  </div>
  <details class="ui"><summary>How these numbers are made</summary>
    <div class="sources">
      <p>${r.lives.toLocaleString('en-GB')} lives are simulated with exactly your card and the central values of the data. Smaller runs with every indicator at its low bound and at its high bound give the ranges.</p>
      <p>Simulated people choose at random among the options in each scene. This is an assumption, not data. Each year is treated as independent of the last, which is also an assumption.</p>
      <p>These are counts from a simulation. They describe people in your situation; they do not explain why anything happened, and they say nothing about what you would have done.</p>
      <p><strong>All numbers are invented for this sandbox.</strong></p>
    </div>
  </details>
  <div class="row ui" style="margin-top:16px">
    <button data-action="voice" data-autofocus>Continue to Voice</button>
    <button class="secondary" data-action="lenses">Lenses</button>
  </div>`;
}

function shareBars(q: SurveyQuestion, shares: Record<string, number> | null, mine: string | undefined, players: boolean): string {
  if (!shares) return '';
  return `<div class="bars">${q.answers
    .map((a) => {
      const v = shares[a.id] ?? 0;
      return `<div class="bar-row"><span class="${mine === a.id ? 'mine' : ''}">${esc(a.label)}${mine === a.id ? ' (you)' : ''}</span>
        <span class="bar-track"><span class="bar-fill${players ? ' players' : ''}" style="width:${(v * 100).toFixed(1)}%;display:block"></span></span>
        <span>${Math.round(v * 100)}%</span></div>`;
    })
    .join('')}</div>`;
}

function questionResults(q: SurveyQuestion, country: string, mine?: string): string {
  const name = countryName(country);
  const survey = bundle.surveyResults.find((r) => r.country === country && r.question === q.id);
  const rel = survey ? idx.releases.get(survey.source_release_id) : undefined;
  const players = summarize(S.counts, country, q.id, q.answers.map((a) => a.id));
  return `<div class="card">
    <h3>${esc(q.text)}</h3>
    <p class="meta">People in ${esc(name)} (fake survey)</p>
    ${survey
      ? `${shareBars(q, survey.shares, mine, false)}<p class="meta">${esc(rel?.name)} ${esc(rel?.version)}, ${survey.year}, sample of ${survey.sample_size.toLocaleString('en-GB')}, margin of error ±${formatNumber(survey.margin_of_error * 100)} points.</p>`
      : `<p class="nm">Not measured here: no survey asked this question in ${esc(name)}.</p>`}
    <p class="meta">Players dealt ${esc(name)}: <strong>Players, not a representative poll</strong></p>
    ${players.suppressed
      ? `<p class="nm">Fewer than 5 players dealt ${esc(name)} have answered. Hidden to protect privacy.</p>`
      : `${shareBars(q, players.shares, mine, true)}<p class="meta">${players.n} players. Stored only as counts in this browser.</p>`}
  </div>`;
}

function voiceScreen(): string {
  const card = S.card!;
  if (!S.myAnswers) {
    return `
    ${header()}
    <h1>Voice</h1>
    <p>Three questions people in ${esc(countryName(card.country))} were asked. Answer as yourself, not as the person you played. There are no right answers.</p>
    <form data-form="voice">
      ${S.voiceQuestions
        .map(
          (q) => `<fieldset><legend>${esc(q.text)}</legend>${q.answers
            .map((a) => `<label class="opt"><input type="radio" name="${esc(q.id)}" value="${esc(a.id)}" required> ${esc(a.label)}</label>`)
            .join('')}</fieldset>`,
        )
        .join('')}
      <p class="meta ui">Your answers are saved only as counts in this browser. Nothing identifies you.</p>
      <div class="row ui"><button type="submit">Show how others answered</button>
      <button type="button" class="secondary" data-action="lenses">Skip to Lenses</button></div>
    </form>`;
  }
  return `
  ${header()}
  <h1>Voice: how others answered</h1>
  ${S.voiceQuestions.map((q) => questionResults(q, card.country, S.myAnswers![q.id])).join('')}
  <div class="row ui">
    <button data-action="lenses" data-autofocus>Lenses</button>
    <button class="secondary" data-action="deal">Deal the next life</button>
  </div>`;
}

function compareTable(a: RevealResult, b: RevealResult, aLabel: string, bLabel: string): string {
  const cell = (m: MetricResult) => (m.per100 === null ? '<span class="nm">not measured here</span>' : formatNumber(m.per100));
  return `<table class="ui"><thead><tr><th>Out of 100 people who…</th><th>${esc(aLabel)}</th><th>${esc(bLabel)}</th></tr></thead><tbody>
    ${a.metrics.map((m, i) => `<tr><td>${esc(m.metric.label)}</td><td>${cell(m)}</td><td>${cell(b.metrics[i])}</td></tr>`).join('')}
  </tbody></table>`;
}

function lensesScreen(): string {
  const card = S.card!;
  const base = S.baseCard ?? card;
  const others = bundle.countries.countries.filter((c) => c.id !== card.country);
  let body = '';
  const L = S.lens;
  if (L?.kind === 'players') {
    body = `<h2>What players dealt ${esc(countryName(card.country))} answered</h2>${bundle.surveyQuestions.map((q) => questionResults(q, card.country)).join('')}`;
  } else if (L?.result && L.card && S.reveal) {
    const lc = L.card;
    const title = L.kind === 'country' ? `Same card in ${countryName(lc.country)}` : `Same country, born ${lc.birthYear}`;
    body = `<h2>${esc(title)}</h2>
      <p class="meta">Same income group, home and sex; only the ${L.kind === 'country' ? 'country' : 'birth year'} changes. Seed <code>${esc(lc.seedCode)}</code>.</p>
      ${L.result.dataThinness.thin ? `<p class="notice ui">Data is thin for this lens: ${Math.round(L.result.dataThinness.share * 100)}% of indicator-years not measured.</p>` : ''}
      <div class="card">${compareTable(S.reveal, L.result, `Your card (${card.birthYear}, ${countryName(card.country)})`, `${lc.birthYear}, ${countryName(lc.country)}`)}</div>
      <div class="row ui"><button class="secondary" data-action="live-lens">Live this life</button></div>`;
  }
  return `
  ${header()}
  <h1>Lenses</h1>
  <p>Look at the same situation another way. These are optional.</p>
  <div class="card ui">
    <form class="row" data-form="lens-country">
      <label for="lc">Same card in another country:</label>
      <select id="lc" name="country">${others.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>
      <button class="secondary" type="submit">Compare</button>
    </form>
    <div class="row" style="margin-top:10px">
      <button class="secondary" data-action="lens-earlier">Same country, ten years earlier (born ${base.birthYear - 10})</button>
      <button class="secondary" data-action="lens-players">What players dealt ${esc(countryName(card.country))} answered</button>
    </div>
  </div>
  ${body}
  <div class="row ui" style="margin-top:16px">
    <button data-action="deal">Deal the next life</button>
    <button class="secondary" data-action="home">Start screen</button>
  </div>`;
}

// ---------- actions ----------
function startCard(card: Card, base: Card | null = null) {
  S.card = card;
  S.baseCard = base ?? card;
  S.life = null;
  S.reveal = null;
  S.myAnswers = null;
  S.lens = null;
  S.error = null;
  S.heavy = heavyShare(card, idx, 300);
  const qs = new Rng(hashSeed('voice', card.seedCode)).shuffle(bundle.surveyQuestions);
  S.voiceQuestions = qs.slice(0, 3);
  S.screen = 'card';
  render();
}

function deal() {
  const n = S.next[S.mode];
  S.next[S.mode] = n + 1;
  savePrefs();
  try {
    startCard(dealCard(idx, S.mode, S.deckSeed, n));
  } catch (e) {
    S.error = (e as Error).message;
    S.screen = 'start';
    render();
  }
}

function runReveal() {
  S.screen = 'reveal';
  S.reveal = null;
  render();
  setTimeout(() => {
    S.reveal = reveal(S.card!, idx, S.life, 1000);
    render();
  }, 30);
}

function runLens(lensCard: Card, kind: 'country' | 'earlier') {
  S.lens = { kind, card: lensCard };
  if (!S.reveal) S.reveal = reveal(S.card!, idx, S.life, 1000);
  S.lens.result = reveal(lensCard, idx, null, 500);
  render();
}

app.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!el) return;
  const action = el.dataset.action;
  switch (action) {
    case 'mode':
      S.mode = el.dataset.mode as DealMode;
      savePrefs();
      render();
      break;
    case 'deal':
      deal();
      break;
    case 'home':
      S.screen = 'start';
      render();
      break;
    case 'begin':
      S.life = createLife(S.card!);
      advance(S.life, idx);
      S.screen = 'life';
      render();
      break;
    case 'choose':
      resolve(S.life!, el.dataset.choice || null);
      advance(S.life!, idx);
      render();
      break;
    case 'stepout':
      resolve(S.life!, null, true);
      advance(S.life!, idx);
      render();
      break;
    case 'reveal':
      runReveal();
      break;
    case 'voice':
      S.screen = 'voice';
      render();
      break;
    case 'lenses':
      S.screen = 'lenses';
      render();
      break;
    case 'lens-earlier':
      runLens(applyLens(S.baseCard ?? S.card!, { yearShift: -10, country: S.card!.country !== S.baseCard?.country ? S.card!.country : undefined }), 'earlier');
      break;
    case 'lens-players':
      S.lens = { kind: 'players' };
      render();
      break;
    case 'live-lens':
      if (S.lens?.card) startCard(S.lens.card, S.baseCard);
      break;
  }
});

app.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.target as HTMLFormElement;
  const data = new FormData(form);
  switch (form.dataset.form) {
    case 'replay': {
      const card = cardFromSeedCode(idx, String(data.get('seed') ?? ''));
      if (!card) {
        S.error = 'That seed is not in the right form. It looks like E-123456-1 or W-123456-4.';
        render();
      } else startCard(card);
      break;
    }
    case 'voice': {
      const answers: Record<string, string> = {};
      for (const q of S.voiceQuestions) {
        const a = data.get(q.id);
        if (typeof a === 'string') answers[q.id] = a;
      }
      let counts = S.counts;
      for (const [q, a] of Object.entries(answers)) counts = addAnswer(counts, S.card!.country, q, a);
      S.counts = counts;
      saveCounts(storage(), counts);
      S.myAnswers = answers;
      render();
      break;
    }
    case 'lens-country': {
      const country = String(data.get('country'));
      runLens(applyLens(S.baseCard ?? S.card!, { country }), 'country');
      break;
    }
  }
});

render();
