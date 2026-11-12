// Fills {placeholders} in scene text with values from the data.

export function formatNumber(x: number): string {
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 100) return Math.round(x).toLocaleString('en-GB');
  if (a >= 10) return String(Math.round(x));
  if (a >= 1) return String(Math.round(x * 10) / 10);
  return String(Number(x.toPrecision(1)));
}

export const NOT_MEASURED = 'not measured here';

/** `resolve` returns the indicator's value, or null when it is not measured. */
export function fillText(
  template: string,
  vars: Record<string, string>,
  resolve: (indicatorId: string) => number | null,
): string {
  return template.replace(/\{(\w+)(?::(\w+))?\}/g, (whole, a: string, b?: string) => {
    if (!b) return vars[a] ?? whole;
    const v = resolve(b);
    if (v === null) return `[${NOT_MEASURED}]`;
    switch (a) {
      case 'in100':
        return formatNumber(v * 100);
      case 'in1000':
        return formatNumber(v * 1000);
      case 'score':
        return v.toFixed(2);
      case 'raw':
      case 'per1000':
      case 'per100k':
        return formatNumber(v);
      default:
        return whole;
    }
  });
}
