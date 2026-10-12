import React from "react";
import { Box, Text } from "ink";

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\s][^*\n]*\*|\[no source\])/g;

export function renderInline(text: string, base: { bold?: boolean } = {}): React.ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part === "[no source]")
      return (
        <Text key={i} color="yellow" bold={base.bold}>
          {part}
        </Text>
      );
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return (
        <Text key={i} bold>
          {renderInline(part.slice(2, -2), { bold: true })}
        </Text>
      );
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return (
        <Text key={i} color="cyan">
          {part.slice(1, -1)}
        </Text>
      );
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return (
        <Text key={i} italic bold={base.bold}>
          {part.slice(1, -1)}
        </Text>
      );
    return (
      <Text key={i} bold={base.bold}>
        {part}
      </Text>
    );
  });
}

export const stripInline = (s: string) =>
  s.replace(/\*\*([^*\n]+)\*\*/g, "$1").replace(/`([^`\n]+)`/g, "$1").replace(/\*([^*\s][^*\n]*)\*/g, "$1");

const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => isRow(l) && /^[\s|:-]+$/.test(l) && l.includes("-");
const cellsOf = (l: string) =>
  l
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => stripInline(c.trim()));

function wrapCell(text: string, width: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > width) {
      if (cur) out.push(cur), (cur = "");
      out.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= width) cur += " " + word;
    else out.push(cur), (cur = word);
  }
  if (cur || !out.length) out.push(cur);
  return out;
}

export function tableLines(rows: string[][], width: number): { text: string; head: boolean; rule: boolean }[] {
  const cols = Math.max(...rows.map((r) => r.length));
  const widths = Array.from({ length: cols }, (_, c) => Math.max(3, ...rows.map((r) => (r[c] ?? "").length)));
  const gaps = 3 * (cols - 1);
  while (widths.reduce((a, b) => a + b, 0) + gaps > width && Math.max(...widths) > 3) {
    widths[widths.indexOf(Math.max(...widths))]!--;
  }
  const lines: { text: string; head: boolean; rule: boolean }[] = [];
  rows.forEach((r, ri) => {
    const wrapped = widths.map((w, c) => wrapCell(r[c] ?? "", w));
    const height = Math.max(...wrapped.map((w) => w.length));
    for (let k = 0; k < height; k++) {
      const text = wrapped.map((w, c) => (w[k] ?? "").padEnd(widths[c]!)).join(" │ ").trimEnd();
      lines.push({ text, head: ri === 0, rule: false });
    }
    if (ri === 0) lines.push({ text: widths.map((w) => "─".repeat(w)).join("─┼─"), head: false, rule: true });
  });
  return lines;
}

export function liveTail(text: string, rows: number, width: number): string {
  const src = text.split("\n");
  let need = rows + 2;
  let i = src.length;
  while (i > 0 && need > 0) need -= Math.max(1, Math.ceil(src[--i]!.length / Math.max(1, width)));
  if (i === 0) return text;
  while (i > 0 && src[i - 1]!.trim()) i--;
  if (i === 0) return text;
  const fences = src.slice(0, i).filter((l) => /^\s*```/.test(l)).length;
  const tail = src.slice(i).join("\n");
  return fences % 2 ? `\`\`\`\n${tail}` : tail;
}

export function Markdown({ text, width }: { text: string; width: number }) {
  const src = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  const key = () => blocks.length;
  while (i < src.length) {
    const l = src[i]!;
    let m: RegExpMatchArray | null;
    if (/^\s*```/.test(l)) {
      const body: string[] = [];
      i++;
      while (i < src.length && !/^\s*```/.test(src[i]!)) body.push(src[i++]!);
      i++;
      blocks.push(
        <Box key={key()} flexDirection="column" paddingLeft={2}>
          {body.map((b, j) => (
            <Text key={j} color="cyan">
              {b || " "}
            </Text>
          ))}
        </Box>,
      );
    } else if (isRow(l) && i + 1 < src.length && isSeparator(src[i + 1]!)) {
      const rows = [cellsOf(l)];
      i += 2;
      while (i < src.length && isRow(src[i]!)) rows.push(cellsOf(src[i++]!));
      blocks.push(
        <Box key={key()} flexDirection="column">
          {tableLines(rows, Math.max(20, width)).map((t, j) => (
            <Text key={j} bold={t.head} dimColor={t.rule}>
              {t.text}
            </Text>
          ))}
        </Box>,
      );
    } else if ((m = l.match(/^\s{0,3}(#{1,6})\s+(.*)$/))) {
      blocks.push(
        <Text key={key()} bold underline={m[1]!.length === 1}>
          {renderInline(m[2]!, { bold: true })}
        </Text>,
      );
      i++;
    } else if ((m = l.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/))) {
      const indent = Math.floor(m[1]!.length / 2) * 2;
      const marker = /\d/.test(m[2]!) ? m[2]! : "•";
      blocks.push(
        <Box key={key()} paddingLeft={indent + 1}>
          <Text>{marker} </Text>
          <Box flexShrink={1}>
            <Text>{renderInline(m[3]!)}</Text>
          </Box>
        </Box>,
      );
      i++;
    } else if (!l.trim()) {
      blocks.push(<Text key={key()}> </Text>);
      i++;
    } else {
      const para = [l];
      i++;
      while (i < src.length && src[i]!.trim() && !/^\s*(```|#{1,6}\s|[-*+]\s|\d+[.)]\s)/.test(src[i]!) && !isRow(src[i]!)) para.push(src[i++]!);
      blocks.push(<Text key={key()}>{renderInline(para.join("\n"))}</Text>);
    }
  }
  return <Box flexDirection="column">{blocks}</Box>;
}
