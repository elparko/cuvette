import type { Question } from "./types.ts";

function pick(q: Question, wanted: unknown): { value: unknown; strict: boolean } | undefined {
  const w = String(wanted).trim().toLowerCase();
  const strict = q.options.find((op) => String(op.value) === String(wanted) || op.label === String(wanted));
  if (strict) return { value: strict.value, strict: true };
  const same = q.options.find((op) => String(op.value).trim().toLowerCase() === w || String(op.label).trim().toLowerCase() === w);
  if (same) return { value: same.value, strict: false };
  if (typeof wanted !== "string" || w.length < 3) return undefined;
  const starts = q.options.filter((op) => String(op.label).trim().toLowerCase().startsWith(w) || String(op.value).trim().toLowerCase().startsWith(w));
  return starts.length === 1 ? { value: starts[0]!.value, strict: false } : undefined;
}

export function fileFits(q: Question, wanted: unknown): boolean {
  if (!q.options.length) return true;
  return pick(q, wanted) !== undefined;
}

export function fitAnswer(q: Question, wanted: unknown, opts: { first?: boolean } = {}): unknown {
  const fits = (x: unknown) => !q.options.length || q.options.some((op) => String(op.value) === String(x) || op.label === String(x));
  if (wanted !== undefined && !q.options.length) return wanted;
  const hit = wanted !== undefined ? pick(q, wanted) : undefined;
  if (hit) return hit.strict ? wanted : hit.value;
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
