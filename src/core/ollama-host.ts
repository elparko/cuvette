export const OLLAMA_PORT = "11434";

export function ollamaHost(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.OLLAMA_HOST ?? "").trim().replace(/\/+$/, "");
  if (!raw) return `http://localhost:${OLLAMA_PORT}`;
  const hasScheme = /^https?:\/\//i.test(raw);
  try {
    const u = new URL(hasScheme ? raw : `http://${raw}`);
    if (!hasScheme && !u.port) u.port = OLLAMA_PORT;
    return `${u.origin}${u.pathname}`.replace(/\/+$/, "");
  } catch {
    return hasScheme ? raw : `http://${raw}`;
  }
}
