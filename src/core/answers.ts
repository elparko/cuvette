import type { Question } from "./types.ts";

export function fitAnswer(q: Question, wanted: unknown, opts: { first?: boolean } = {}): unknown {
  const fits = (x: unknown) => !q.options.length || q.options.some((op) => String(op.value) === String(x) || op.label === String(x));
  const loose = (x: unknown) => q.options.find((op) => String(op.label).toLowerCase().includes(String(x).toLowerCase()) || String(x).toLowerCase().includes(String(op.label).toLowerCase()))?.value;
  if (wanted !== undefined && fits(wanted)) return wanted;
  if (wanted !== undefined && q.options.length && typeof wanted === "string" && wanted.length > 2) {
    const v = loose(wanted);
    if (v !== undefined) return v;
  }
  return [q.recommendation?.value, q.default, opts.first === false ? undefined : q.options[0]?.value].find((x) => x !== undefined && fits(x));
}
