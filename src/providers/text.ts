const NAME = "(?:\\u200b*[^|<>\\n\\u200b]){1,48}\\u200b*";
const NAME_WIDE = "(?:\\u200b*[^｜<>\\n\\u200b]){1,48}\\u200b*";
const tokens = (open: (c: string) => string) => [`${open("<")}\\|${NAME}\\|>`, `${open("<")}｜${NAME_WIDE}｜>`, `${open("\\[")}\\/?INST\\]`, `${open("<")}<\\/?SYS>>`, `${open("<")}\\/?(?:start_of_turn|end_of_turn|bos|eos|s|think|tool_response)>`, `${open("\\[")}(?:TOOL_CALLS|TOOL_RESULTS|SYSTEM_PROMPT)\\]`].join("|");
const FANGED = (c: string) => `${c}\\u200b+`;
const MARKER_OR_FANGED = new RegExp(`${tokens((c) => c)}|${tokens(FANGED)}`, "gi");
const FANGED_ONLY = new RegExp(tokens(FANGED), "gi");

// A local model server can read a chat template marker in text as a real marker. A zero-width space after the first character makes it plain text.
// A marker that has zero-width spaces already gets one more, and a marker inside a marker gets its own, so that refang gives back the same text.
export function defang(text: string): string {
  return text.replace(MARKER_OR_FANGED, (m) => `${m[0]}\u200b${defang(m.slice(1))}`);
}

// The model copies a marker with its zero-width space into a tool call. The tool must get the marker as it is in the file.
export function refang(text: string): string {
  return text.replace(FANGED_ONLY, (m) => m[0] + refang(m.slice(2)));
}

export function refangDeep<T>(v: T): T {
  if (typeof v === "string") return refang(v) as T;
  if (Array.isArray(v)) return v.map(refangDeep) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, refangDeep(x)])) as T;
  return v;
}

export function defangDeep<T>(v: T): T {
  if (typeof v === "string") return defang(v) as T;
  if (Array.isArray(v)) return v.map(defangDeep) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, defangDeep(x)])) as T;
  return v;
}

export function wrapperText(text: string): string {
  return defang(text.replace(/<(\s*\/?\s*)(tool_result|tool_call|tool_response)/gi, "<$1_$2"));
}

export function splitThink(raw: string): { text: string; thinking: string } {
  const thoughts: string[] = [];
  let text = "";
  let at = 0;
  for (;;) {
    const from = raw.indexOf("<think>", at);
    const to = from < 0 ? -1 : raw.indexOf("</think>", from + 7);
    if (to < 0) break;
    text += raw.slice(at, from);
    thoughts.push(raw.slice(from + 7, to).trim());
    at = to + 8;
  }
  text += raw.slice(at);
  const open = text.indexOf("<think>");
  if (open >= 0) {
    thoughts.push(text.slice(open + 7).trim());
    text = text.slice(0, open);
  }
  const close = text.indexOf("</think>");
  if (close >= 0) {
    thoughts.push(text.slice(0, close).trim());
    text = text.slice(close + 8);
  }
  return { text: text.trim(), thinking: thoughts.filter(Boolean).join("\n\n") };
}

export class ThinkSplitter {
  private buf = "";
  private inThink = false;

  constructor(private emit: (kind: "text" | "thinking", s: string) => void) {}

  push(chunk: string): void {
    this.buf += chunk;
    for (;;) {
      const tag = this.inThink ? "</think>" : "<think>";
      const i = this.buf.indexOf(tag);
      if (i >= 0) {
        this.out(this.buf.slice(0, i));
        this.buf = this.buf.slice(i + tag.length);
        this.inThink = !this.inThink;
        continue;
      }
      let keep = 0;
      for (let n = Math.min(tag.length - 1, this.buf.length); n > 0; n--) {
        if (tag.startsWith(this.buf.slice(this.buf.length - n))) {
          keep = n;
          break;
        }
      }
      this.out(this.buf.slice(0, this.buf.length - keep));
      this.buf = this.buf.slice(this.buf.length - keep);
      return;
    }
  }

  end(): void {
    this.out(this.buf);
    this.buf = "";
  }

  private out(s: string): void {
    if (s) this.emit(this.inThink ? "thinking" : "text", s);
  }
}

function balancedObjects(s: string): { start: number; end: number }[] {
  const found: { start: number; end: number }[] = [];
  let budget = 8 * s.length + 10_000;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "{") continue;
    let depth = 0;
    let inStr = false;
    for (let j = i; j < s.length && budget-- > 0; j++) {
      const c = s[j];
      if (inStr) {
        if (c === "\\") j++;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        found.push({ start: i, end: j + 1 });
        i = j;
        break;
      }
    }
  }
  return found;
}

export function extractTextToolCall(
  text: string,
  toolNames: string[],
): { name: string; args: Record<string, unknown>; rest: string } | null {
  for (const { start, end } of balancedObjects(text)) {
    let obj: any;
    try {
      obj = JSON.parse(text.slice(start, end));
    } catch {
      continue;
    }
    if (!obj || typeof obj.name !== "string" || !toolNames.includes(obj.name)) continue;
    let args = obj.arguments ?? obj.parameters;
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        continue;
      }
    }
    if (!args || typeof args !== "object" || Array.isArray(args)) continue;
    const rest = (text.slice(0, start) + text.slice(end))
      .replace(/```(?:json)?\s*```/g, "")
      .replace(/<\/?tool_call>/g, "")
      .trim();
    return { name: obj.name, args, rest };
  }
  return null;
}

export function lastCallNumber(messages: { parts: { type: string; id?: string }[] }[]): number {
  let max = 0;
  for (const m of messages)
    for (const p of m.parts) {
      const hit = p.type === "tool_call" && p.id ? /^call_(\d+)$/.exec(p.id) : null;
      if (hit) max = Math.max(max, Number(hit[1]));
    }
  return max;
}

function argLine(name: string, schema: any, required: boolean): string {
  const type = Array.isArray(schema?.enum) ? `one of ${schema.enum.map((e: unknown) => JSON.stringify(e)).join(", ")}` : schema?.type === "array" ? `list of ${schema.items?.type ?? "values"}` : (schema?.type ?? "any");
  const desc = typeof schema?.description === "string" ? `: ${schema.description.replace(/\s+/g, " ").slice(0, 160)}` : "";
  return `    ${name} (${type}${required ? ", required" : ""})${desc}`;
}

export function promptedToolsText(tools: { name: string; description: string; inputSchema: Record<string, unknown> }[]): string {
  const lines = [
    "# Tools",
    "You can call one tool in each reply. To call a tool, reply with only this block and nothing after it:",
    '<tool_call>{"name": "TOOL_NAME", "arguments": {"ARG": "VALUE"}}</tool_call>',
    "The harness runs the tool and replies with <tool_result>. Read the result before the next step.",
    "When you have the answer for the scientist, reply with plain text and no tool call.",
    "",
  ];
  for (const t of tools) {
    lines.push(`- ${t.name}: ${t.description.replace(/\s+/g, " ").slice(0, 400)}`);
    const props = ((t.inputSchema as any)?.properties ?? {}) as Record<string, unknown>;
    const req = new Set<string>(((t.inputSchema as any)?.required ?? []) as string[]);
    for (const [k, v] of Object.entries(props)) lines.push(argLine(k, v, req.has(k)));
  }
  return lines.join("\n");
}
