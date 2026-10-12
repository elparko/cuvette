import type { Tool, ToolOutput } from "../core/types.ts";

type Val = number | number[];

const FUNCS: Record<string, (...a: Val[]) => Val> = {
  abs: (x) => Math.abs(num(x)),
  sqrt: (x) => Math.sqrt(num(x)),
  log: (x) => Math.log(num(x)),
  log10: (x) => Math.log10(num(x)),
  log2: (x) => Math.log2(num(x)),
  exp: (x) => Math.exp(num(x)),
  round: (x, n = 0) => {
    const f = 10 ** num(n);
    return Math.round(num(x) * f) / f;
  },
  sum: (...a) => flat(a).reduce((s, x) => s + x, 0),
  mean: (...a) => {
    const v = flat(a);
    return v.reduce((s, x) => s + x, 0) / v.length;
  },
  median: (...a) => {
    const v = flat(a).sort((x, y) => x - y);
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
  },
  sd: (...a) => {
    const v = flat(a);
    const m = v.reduce((s, x) => s + x, 0) / v.length;
    return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  },
  min: (...a) => Math.min(...flat(a)),
  max: (...a) => Math.max(...flat(a)),
  count: (...a) => flat(a).length,
  ratio: (a, b) => num(a) / num(b),
  pct_change: (from, to) => ((num(to) - num(from)) / num(from)) * 100,
  mae: (p, t) => pairs(p, t).reduce((s, [x, y]) => s + Math.abs(x - y), 0) / pairs(p, t).length,
  rmse: (p, t) => Math.sqrt(pairs(p, t).reduce((s, [x, y]) => s + (x - y) ** 2, 0) / pairs(p, t).length),
  r2: (x, y) => {
    const pr = pairs(x, y);
    if (pr.length < 2) throw new Error("r2 needs at least two pairs of numbers, one pair for each sample or image");
    const mx = pr.reduce((s, [a]) => s + a, 0) / pr.length;
    const my = pr.reduce((s, [, b]) => s + b, 0) / pr.length;
    let sxy = 0, sxx = 0, syy = 0;
    for (const [a, b] of pr) {
      sxy += (a - mx) * (b - my);
      sxx += (a - mx) ** 2;
      syy += (b - my) ** 2;
    }
    if (!sxx || !syy) throw new Error("r2 is not defined when all numbers in one list are equal");
    return (sxy * sxy) / (sxx * syy);
  },
};

function num(v: Val): number {
  if (Array.isArray(v)) throw new Error("a list was given where one number is needed");
  return v;
}

function flat(a: Val[]): number[] {
  return a.flatMap((x) => (Array.isArray(x) ? x : [x]));
}

function pairs(a: Val, b: Val): [number, number][] {
  if (!Array.isArray(a) || !Array.isArray(b)) throw new Error("give two lists, for example mae([1,2],[1,3])");
  if (a.length !== b.length || !a.length) throw new Error("the two lists must have the same length");
  return a.map((x, i) => [x, b[i]!]);
}

export function evaluate(src: string): Val {
  const toks = src.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|\*\*|[-+*/^(),[\]]|\S/gi) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const take = (t?: string) => {
    const x = toks[i++];
    if (t !== undefined && x !== t) throw new Error(`expected "${t}" near token ${i}`);
    return x;
  };
  const expr = (): Val => {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const r = term();
      v = op === "+" ? num(v) + num(r) : num(v) - num(r);
    }
    return v;
  };
  const term = (): Val => {
    let v = unary();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const r = unary();
      v = op === "*" ? num(v) * num(r) : num(v) / num(r);
    }
    return v;
  };
  const unary = (): Val => {
    if (peek() === "-") {
      take();
      return -num(unary());
    }
    if (peek() === "+") {
      take();
      return unary();
    }
    return power();
  };
  const power = (): Val => {
    const b = atom();
    if (peek() === "^" || peek() === "**") {
      take();
      return num(b) ** num(unary());
    }
    return b;
  };
  const list = (close: string): Val[] => {
    const out: Val[] = [];
    if (peek() === close) return out;
    out.push(expr());
    while (peek() === ",") {
      take();
      out.push(expr());
    }
    return out;
  };
  const atom = (): Val => {
    const t = take();
    if (t === undefined) throw new Error("the expression ends too early");
    if (t === "(") {
      const v = expr();
      take(")");
      return v;
    }
    if (t === "[") {
      const items = list("]");
      take("]");
      return items.map(num);
    }
    if (/^\.?\d/.test(t)) return Number(t);
    if (/^[A-Za-z_]/.test(t)) {
      if (t === "pi") return Math.PI;
      const f = FUNCS[t.toLowerCase()];
      if (!f) throw new Error(`unknown function ${t}. Functions: ${Object.keys(FUNCS).join(", ")}`);
      take("(");
      const args = list(")");
      take(")");
      return f(...args);
    }
    throw new Error(`unexpected "${t}"`);
  };
  const v = expr();
  if (i < toks.length) throw new Error(`unexpected "${toks[i]}"`);
  return v;
}

export function calculateTool(): Tool {
  return {
    name: "calculate",
    description:
      "Do arithmetic on numbers from tool results. Use it for each ratio, difference, percent change, mean or error that you report and that no tool reported; do not do arithmetic in your answer. If a tool result already has the value, report that value and do not compute it again. mae, rmse and r2 take one pair of numbers for each sample or image, not the totals. " +
      "Write one expression per item, for example \"ratio(412, 450)\", \"pct_change(46, 50)\", \"mae([48,10],[50,10])\", \"r2([1,2,3],[1,2,4])\". " +
      "Operators: + - * / ^ and brackets. Lists: [1, 2, 3]. Functions: " + Object.keys(FUNCS).join(", ") + ".",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "object", properties: { name: { type: "string" }, expression: { type: "string" } }, required: ["name", "expression"] },
          description: "Each item has a short name and one expression.",
        },
      },
      required: ["items"],
    },
    source: "harness",
    readOnly: true,
    permission: "allow",
    execute: async (a): Promise<ToolOutput> => {
      const items = Array.isArray(a.items) ? (a.items as { name?: unknown; expression?: unknown }[]) : [];
      if (!items.length) return { ok: false, error: "give at least one item with a name and an expression" };
      const metrics: Record<string, number> = {};
      const lines: string[] = [];
      const errors: string[] = [];
      for (const it of items) {
        const name = String(it.name ?? "").trim() || `value_${lines.length + errors.length + 1}`;
        try {
          const v = evaluate(String(it.expression ?? ""));
          if (Array.isArray(v) || !Number.isFinite(v)) throw new Error("the result is not one finite number");
          metrics[name] = v;
          lines.push(`${name} = ${String(it.expression)} = ${+v.toPrecision(10)}`);
        } catch (e) {
          errors.push(`${name}: ${(e as Error).message}`);
        }
      }
      if (!lines.length) return { ok: false, error: errors.join("; ") };
      return { ok: true, summary: `Calculated ${lines.length} value(s).`, text: [...lines, ...errors.map((x) => `error: ${x}`)].join("\n"), metrics };
    },
  };
}
