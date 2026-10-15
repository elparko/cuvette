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

export function assumedInsteadOfWaiting(answer: string, assumed: string[]): string {
  const m = /^[ \t]*(?:\*\*)?Waits for you:?(?:\*\*)?:?[ \t]*(.*)\n?((?:[ \t]*[-*].*\n?|[ \t]*\n(?=[ \t]*[-*]))*)/im.exec(answer);
  const open = m ? [m[1] ?? "", ...(m[2] ?? "").split("\n").map((x) => x.replace(/^[ \t]*[-*][ \t]*/, ""))].map((x) => x.trim()).filter((x) => x && !/^nothing\.?$/i.test(x)) : [];
  const lines = [...assumed.map((x) => `- ${x}`), ...open.map((x) => `- Not confirmed by the scientist: ${x}`)];
  const block = lines.length ? `Assumed because no answer was given:\n${lines.join("\n")}\n` : "";
  if (!m) return block ? `${answer.trimEnd()}\n\n${block}`.trimEnd() : answer;
  return (answer.slice(0, m.index) + block + answer.slice(m.index + m[0].length)).replace(/\n{3,}/g, "\n\n").trimEnd();
}
