import type { Question } from "../core/types.ts";

const reported = new Set<string>();

export function setWindowUrl(_url: string | undefined): void {}

function allowed(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost");
  } catch {
    return false;
  }
}

export function ntfyNotifier(topicUrl: string): (q: Question) => Promise<void> {
  return async (q) => {
    if (!allowed(topicUrl)) {
      if (!reported.has(topicUrl)) {
        reported.add(topicUrl);
        console.error(`Cuvette does not use the notify address ${topicUrl}. Use an https address, or http on 127.0.0.1 or localhost. Cuvette sends no notice.`);
      }
      return;
    }
    const headers = { Title: "A question waits for you", Tags: "question" };
    try {
      await fetch(topicUrl, { method: "POST", headers, body: [q.title, q.text].filter(Boolean).join("\n"), signal: AbortSignal.timeout(5000) });
    } catch {}
  };
}
