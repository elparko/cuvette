import type { Question } from "../core/types.ts";

let windowUrl: string | undefined;

export function setWindowUrl(url: string | undefined): void {
  windowUrl = url;
}

export function ntfyNotifier(topicUrl: string): (q: Question) => Promise<void> {
  return async (q) => {
    const lines = [q.title, q.text];
    if (windowUrl) lines.push(windowUrl);
    const headers: Record<string, string> = { Title: "A question waits for you", Tags: "question" };
    if (windowUrl) headers.Click = windowUrl;
    try {
      await fetch(topicUrl, { method: "POST", headers, body: lines.filter(Boolean).join("\n"), signal: AbortSignal.timeout(5000) });
    } catch {}
  };
}
