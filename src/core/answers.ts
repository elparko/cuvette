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

const WAITS = /^[ \t]*(?:\*\*)?Waits for you:?(?:\*\*)?:?[ \t]*(.*)$/i;
const ITEM = /^[ \t]*[-*][ \t]+(\S.*)$/;

export function withoutWaits(answer: string): { answer: string; open: string[] } {
  const lines = answer.split("\n");
  const at = lines.findIndex((l) => WAITS.test(l));
  if (at < 0) return { answer, open: [] };
  const open = [WAITS.exec(lines[at]!)![1]!];
  let end = at + 1;
  for (let k = at + 1; k < lines.length; k++) {
    const item = ITEM.exec(lines[k]!);
    if (item) {
      open.push(item[1]!);
      end = k + 1;
    } else if (lines[k]!.trim()) break;
  }
  const kept = [...lines.slice(0, at), ...lines.slice(end)].join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  return { answer: kept, open: open.map((x) => x.trim()).filter((x) => x && !/^nothing\.?$/i.test(x)) };
}

export function assumptionBlock(assumed: string[], open: string[]): string {
  const lines = [...assumed.map((x) => `- ${x}`), ...open.map((x) => `- Not confirmed by the scientist: ${x}`)];
  return lines.length ? `Assumed because no answer was given:\n${lines.join("\n")}` : "";
}
