// A tiny, safe formula language for scene odds. No eval().
//
// Allowed: numbers, + - * /, comparisons, && || !, cond ? a : b, parentheses,
// functions (min, max, clamp, annual, per100k, per1000),
// person/state variables (see STATE_VARS), flags (flag.name),
// and indicator ids, which are looked up in the data.
// Evaluation is lazy, so `flag.x ? indicator : 0` only needs the indicator
// when the flag is set.

export const STATE_VARS = ['age', 'year', 'decile', 'urban', 'female', 'buffer'] as const;
const FUNCTIONS: Record<string, (...a: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  clamp: (x, lo, hi) => Math.min(hi, Math.max(lo, x)),
  /** Turns a share that happens over `years` into an equal yearly chance. */
  annual: (p, years) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 1 / years),
  per100k: (x) => x / 100000,
  per1000: (x) => x / 1000,
};

type Node =
  | { k: 'num'; v: number }
  | { k: 'id'; name: string }
  | { k: 'call'; fn: string; args: Node[] }
  | { k: 'un'; op: string; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'tern'; c: Node; a: Node; b: Node };

export class MissingIndicatorError extends Error {
  constructor(public indicator: string) {
    super(`Indicator not measured here: ${indicator}`);
  }
}

const TOKEN = /\s*(\d+\.?\d*|\.\d+|[A-Za-z_][A-Za-z0-9_.]*|&&|\|\||<=|>=|==|!=|[-+*/()<>!?:,])/y;

function tokenize(src: string): string[] {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) throw new Error(`Formula syntax error near "${src.slice(pos)}" in: ${src}`);
    out.push(m[1]);
    pos = TOKEN.lastIndex;
  }
  return out;
}

export function parseFormula(src: string): Node {
  const t = tokenize(src);
  let i = 0;
  const peek = () => t[i];
  const eat = (x?: string) => {
    const tok = t[i];
    if (x !== undefined && tok !== x) throw new Error(`Expected "${x}" but found "${tok}" in: ${src}`);
    i++;
    return tok;
  };
  const expr = (): Node => {
    const c = or();
    if (peek() === '?') {
      eat('?');
      const a = expr();
      eat(':');
      const b = expr();
      return { k: 'tern', c, a, b };
    }
    return c;
  };
  const binLevel = (ops: string[], next: () => Node) => (): Node => {
    let a = next();
    while (ops.includes(peek())) {
      const op = eat();
      a = { k: 'bin', op, a, b: next() };
    }
    return a;
  };
  const unary = (): Node => {
    if (peek() === '-' || peek() === '!') {
      const op = eat();
      return { k: 'un', op, a: unary() };
    }
    return primary();
  };
  const primary = (): Node => {
    const tok = eat();
    if (tok === undefined) throw new Error(`Unexpected end of formula: ${src}`);
    if (tok === '(') {
      const e = expr();
      eat(')');
      return e;
    }
    if (/^[\d.]/.test(tok)) return { k: 'num', v: Number(tok) };
    if (/^[A-Za-z_]/.test(tok)) {
      if (peek() === '(') {
        if (!FUNCTIONS[tok]) throw new Error(`Unknown function "${tok}" in: ${src}`);
        eat('(');
        const args: Node[] = [];
        if (peek() !== ')') {
          args.push(expr());
          while (peek() === ',') {
            eat(',');
            args.push(expr());
          }
        }
        eat(')');
        return { k: 'call', fn: tok, args };
      }
      return { k: 'id', name: tok };
    }
    throw new Error(`Unexpected "${tok}" in: ${src}`);
  };
  const mul = binLevel(['*', '/'], unary);
  const add = binLevel(['+', '-'], mul);
  const cmp = binLevel(['<', '<=', '>', '>=', '==', '!='], add);
  const and = binLevel(['&&'], cmp);
  const or = binLevel(['||'], and);
  const root = expr();
  if (i < t.length) throw new Error(`Unexpected "${t[i]}" in: ${src}`);
  return root;
}

export interface Env {
  state: (name: string) => number;
  flag: (name: string) => boolean;
  /** Returns the indicator value or throws MissingIndicatorError. */
  indicator: (id: string) => number;
}

export function evaluate(node: Node, env: Env): number {
  switch (node.k) {
    case 'num':
      return node.v;
    case 'id': {
      if (node.name.startsWith('flag.')) return env.flag(node.name.slice(5)) ? 1 : 0;
      if ((STATE_VARS as readonly string[]).includes(node.name)) return env.state(node.name);
      return env.indicator(node.name);
    }
    case 'call':
      return FUNCTIONS[node.fn](...node.args.map((a) => evaluate(a, env)));
    case 'un':
      return node.op === '-' ? -evaluate(node.a, env) : evaluate(node.a, env) ? 0 : 1;
    case 'tern':
      return evaluate(node.c, env) ? evaluate(node.a, env) : evaluate(node.b, env);
    case 'bin': {
      if (node.op === '&&') return evaluate(node.a, env) ? evaluate(node.b, env) : 0;
      if (node.op === '||') return evaluate(node.a, env) || evaluate(node.b, env);
      const a = evaluate(node.a, env);
      const b = evaluate(node.b, env);
      switch (node.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? 0 : a / b;
        case '<': return a < b ? 1 : 0;
        case '<=': return a <= b ? 1 : 0;
        case '>': return a > b ? 1 : 0;
        case '>=': return a >= b ? 1 : 0;
        case '==': return a === b ? 1 : 0;
        case '!=': return a !== b ? 1 : 0;
      }
    }
  }
  throw new Error('Bad formula node');
}

/** All indicator ids a formula can reference (whether or not they get evaluated). */
export function indicatorRefs(src: string): string[] {
  const out = new Set<string>();
  const walk = (n: Node) => {
    if (n.k === 'id' && !n.name.startsWith('flag.') && !(STATE_VARS as readonly string[]).includes(n.name)) out.add(n.name);
    if (n.k === 'call') n.args.forEach(walk);
    if (n.k === 'un') walk(n.a);
    if (n.k === 'bin') { walk(n.a); walk(n.b); }
    if (n.k === 'tern') { walk(n.c); walk(n.a); walk(n.b); }
  };
  walk(parseFormula(src));
  return [...out];
}

const cache = new Map<string, Node>();
export function compile(src: string): Node {
  let n = cache.get(src);
  if (!n) {
    n = parseFormula(src);
    cache.set(src, n);
  }
  return n;
}
