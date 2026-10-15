export const OLLAMA_PORT = "11434";

function withScheme(raw: string): string {
  const at = raw.indexOf("/");
  const hostPart = at < 0 ? raw : raw.slice(0, at);
  const path = at < 0 ? "" : raw.slice(at);
  let host = hostPart;
  let port = "";
  const bracket = /^(\[[^\]]*\])(?::(\d*))?$/.exec(hostPart);
  if (bracket) [, host, port = ""] = bracket as unknown as [string, string, string | undefined];
  else if (hostPart.split(":").length > 2) host = `[${hostPart}]`;
  else if (hostPart.includes(":")) [host = "", port = ""] = hostPart.split(":");
  return `http://${host || "localhost"}:${port || OLLAMA_PORT}${path}`.replace(/\/+$/, "");
}

export function ollamaHost(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.OLLAMA_HOST ?? "").trim().replace(/\/+$/, "");
  if (!raw) return `http://localhost:${OLLAMA_PORT}`;
  const hasScheme = /^https?:\/\//i.test(raw);
  try {
    if (hasScheme) {
      const u = new URL(raw);
      return `${u.origin}${u.pathname}`.replace(/\/+$/, "");
    }
    const built = withScheme(raw);
    new URL(built);
    return built;
  } catch {
    return hasScheme ? raw : `http://${raw}`;
  }
}
