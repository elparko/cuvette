import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

const MAX_BYTES = 400_000;
const CELLS = 36;

export type ImageProtocol = "iterm" | "kitty" | undefined;

export function imageProtocol(env: Record<string, string | undefined> = process.env): ImageProtocol {
  if (env.KITTY_WINDOW_ID || env.TERM === "xterm-kitty") return "kitty";
  if (env.TERM_PROGRAM === "ghostty" || env.TERM === "xterm-ghostty") return "kitty";
  if (env.TERM_PROGRAM === "iTerm.app" || env.TERM_PROGRAM === "WezTerm") return "iterm";
  return undefined;
}

export function inlineImage(path: string, proto: ImageProtocol): string | undefined {
  if (!proto) return undefined;
  const ext = extname(path).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".gif"].includes(ext)) return undefined;
  if (proto === "kitty" && ext !== ".png") return undefined;
  let buf: Buffer;
  try {
    if (statSync(path).size > MAX_BYTES) return undefined;
    buf = readFileSync(path);
  } catch {
    return undefined;
  }
  const b64 = buf.toString("base64");
  if (proto === "iterm") {
    return `\x1b]1337;File=inline=1;size=${buf.length};width=${CELLS};preserveAspectRatio=1:${b64}\x07`;
  }
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += 4096) {
    const part = b64.slice(i, i + 4096);
    const more = i + 4096 < b64.length ? 1 : 0;
    const head = i === 0 ? `a=T,f=100,c=${CELLS},m=${more}` : `m=${more}`;
    chunks.push(`\x1b_G${head};${part}\x1b\\`);
  }
  return chunks.join("");
}
