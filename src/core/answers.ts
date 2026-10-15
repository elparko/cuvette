import type { Question } from "./types.ts";

export function fileFits(q: Question, wanted: unknown): boolean {
  if (!q.options.length) return true;
  const text = String(wanted).toLowerCase();
  if (q.options.some((op) => String(op.value) === String(wanted) || op.label === String(wanted))) return true;
  return typeof wanted === "string" && wanted.length > 2 && q.options.some((op) => String(op.label).toLowerCase().includes(text) || text.includes(String(op.label).toLowerCase()));
}

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
const NOTHING = /^[ \t]*(?:nothing|none)\.?[ \t]*$/i;
const ITEM = /^[ \t]*[-*][ \t]+(\S.*)$/;

export function withoutWaits(answer: string): { answer: string; open: string[] } {
  const lines = answer.split("\n");
  const at = lines.findIndex((l) => WAITS.test(l));
  if (at < 0) return { answer, open: [] };
  const open = [WAITS.exec(lines[at]!)![1]!];
  let end = at + 1;
  for (let k = at + 1; k < lines.length; k++) {
    const line = lines[k]!;
    const item = ITEM.exec(line);
    if (item) {
      open.push(item[1]!);
      end = k + 1;
    } else if (NOTHING.test(line)) {
      open.push(line);
      end = k + 1;
    } else if (!line.trim()) {
      const next = lines.slice(k + 1).find((l) => l.trim());
      if (next === undefined || !ITEM.test(next)) {
        if (next === undefined) end = lines.length;
        break;
      }
    } else break;
  }
  const kept = [...lines.slice(0, at), ...lines.slice(end)].join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").trimEnd();
  return { answer: kept, open: open.map((x) => x.trim()).filter((x) => x && !NOTHING.test(x)) };
}

export function assumptionBlock(assumed: string[], open: string[]): string {
  const lines = [...assumed.map((x) => `- ${x}`), ...open.map((x) => `- Not confirmed by the scientist: ${x}`)];
  return lines.length ? `Assumed because no answer was given:\n${lines.join("\n")}` : "";
}
