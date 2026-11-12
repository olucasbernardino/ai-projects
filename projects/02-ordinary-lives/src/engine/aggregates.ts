// Player answers, stored only as counts. No accounts, no ids, no timestamps.

export const MIN_GROUP = 5;
export const STORAGE_KEY = 'ordinary-lives:player-answer-counts:v1';

/** counts[dealtCountry][questionId][answerId] = number of players */
export type Counts = Record<string, Record<string, Record<string, number>>>;

export function addAnswer(counts: Counts, country: string, question: string, answer: string): Counts {
  const next: Counts = JSON.parse(JSON.stringify(counts));
  const q = ((next[country] ??= {})[question] ??= {});
  q[answer] = (q[answer] ?? 0) + 1;
  return next;
}

export type GroupSummary =
  | { suppressed: true }
  | { suppressed: false; n: number; shares: Record<string, number> };

/** Groups smaller than MIN_GROUP are suppressed: no shares, not even the count. */
export function summarize(counts: Counts, country: string, question: string, answerIds: string[]): GroupSummary {
  const q = counts[country]?.[question] ?? {};
  const n = answerIds.reduce((s, a) => s + (q[a] ?? 0), 0);
  if (n < MIN_GROUP) return { suppressed: true };
  const shares: Record<string, number> = {};
  for (const a of answerIds) shares[a] = (q[a] ?? 0) / n;
  return { suppressed: false, n, shares };
}

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function loadCounts(store: KV | null): Counts {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCounts(store: KV | null, counts: Counts): boolean {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(counts));
    return !!store;
  } catch {
    return false;
  }
}
