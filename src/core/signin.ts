import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { hostname } from "node:os";
import { AccountError, BAD_CODE, getAccount, hostedError, linkUrl, type AccountCtx, type AccountInfo } from "./account.ts";
import { cuvetteToken, cuvetteUrl, saveCuvetteToken } from "./credentials.ts";

export const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "microsoft", label: "Microsoft" },
  { id: "orcid", label: "ORCID" },
  { id: "github", label: "GitHub" },
] as const;

export type ProviderId = (typeof PROVIDERS)[number]["id"];

export const SIGN_IN_ERRORS = { access_denied: "You stopped the sign-in.", sign_in_failed: "The sign-in did not finish. Try again." } as const;

export const signInErrorText = (value: string | null | undefined): string | undefined =>
  value ? (SIGN_IN_ERRORS as Record<string, string>)[value] ?? SIGN_IN_ERRORS.sign_in_failed : undefined;

export const SIGN_IN_WAIT_MS = 5 * 60_000;

export interface Pkce {
  verifier: string;
  challenge: string;
  state: string;
}

export function makePkce(): Pkce {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url"), state: randomBytes(24).toString("base64url") };
}

export function providerId(raw: unknown): ProviderId {
  const found = PROVIDERS.find((p) => p.id === raw);
  if (!found) throw new AccountError(`Choose a provider: ${PROVIDERS.map((p) => p.id).join(", ")}.`);
  return found.id;
}

export function startUrl(env: Record<string, string | undefined>, o: { provider: ProviderId; port: number | "paste"; pkce: Pkce }): string {
  const q = new URLSearchParams({ provider: o.provider, port: String(o.port), challenge: o.pkce.challenge, state: o.pkce.state });
  return `${cuvetteUrl(env)}/v1/auth/start?${q}`;
}

export const deviceName = (kind: "app" | "command line"): string => `${hostname()} (${kind})`;

export async function redeemCode(ctx: AccountCtx, o: { code: string; verifier: string; device: string }): Promise<{ accountId: string; deviceId: string }> {
  const env = ctx.env ?? process.env;
  let res: Response;
  try {
    res = await (ctx.fetch ?? fetch)(`${cuvetteUrl(env)}/v1/auth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: o.code, verifier: o.verifier, device_name: o.device }),
    });
  } catch {
    throw new AccountError("Cannot reach the Cuvette server. Check the network.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new AccountError(hostedError(res.status, body, res.headers.get("retry-after"))?.text ?? (res.status === 400 ? BAD_CODE : `The Cuvette server returned HTTP ${res.status}.`));
  }
  const j = (await res.json()) as { token: string; device_id: string; account_id: string };
  saveCuvetteToken(j.token);
  return { accountId: j.account_id, deviceId: j.device_id };
}

const page = (ok: boolean, text: string) =>
  `<!doctype html><meta charset="utf-8"><title>Cuvette</title><body style="font:16px system-ui;max-width:32em;margin:4em auto;padding:0 1em"><h1>${ok ? "Signed in" : "Sign-in failed"}</h1><p>${text}</p></body>`;

export const signInPage = (ok: boolean, problem?: string) =>
  page(ok, ok ? "You are signed in to Cuvette. Close this tab and go back to Cuvette." : `${problem ?? "Cuvette could not finish the sign-in."} Close this tab and sign in again.`);

export interface CodeListener {
  port: number;
  wait(): Promise<string>;
  close(): void;
}

export async function listenForCode(state: string, ms = SIGN_IN_WAIT_MS): Promise<CodeListener> {
  let settle!: (r: { code?: string; error?: string }) => void;
  const done = new Promise<{ code?: string; error?: string }>((r) => (settle = r));
  let port = 0;
  const server = createServer((req, res) => {
    const host = req.headers.host ?? "";
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (req.method !== "GET" || url.pathname !== "/auth/cuvette" || (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`)) {
      res.writeHead(404).end();
      return;
    }
    const code = url.searchParams.get("code");
    const stateOk = url.searchParams.get("state") === state;
    const error = stateOk ? signInErrorText(url.searchParams.get("error")) : undefined;
    const ok = !!code && stateOk && !error;
    res.writeHead(ok ? 200 : 400, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(signInPage(ok, error));
    settle(ok ? { code: code! } : { error });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  port = (server.address() as AddressInfo).port;
  const timer = setTimeout(() => settle({}), ms);
  const close = () => {
    clearTimeout(timer);
    server.close();
    server.closeAllConnections();
  };
  return {
    port,
    close,
    async wait() {
      const r = await done;
      close();
      if (r.error) throw new AccountError(r.error);
      if (!r.code) throw new AccountError(SIGN_IN_ERRORS.sign_in_failed);
      return r.code;
    },
  };
}

export interface TerminalSignIn {
  provider: ProviderId;
  browser: boolean;
  link?: boolean;
  ctx?: AccountCtx;
  open(url: string): void;
  say(text: string): void;
  ask(question: string): Promise<string>;
}

export async function signInFromTerminal(o: TerminalSignIn): Promise<AccountInfo> {
  const ctx = o.ctx ?? {};
  const env = ctx.env ?? process.env;
  const pkce = makePkce();
  const urlFor = async (port: number | "paste") =>
    o.link ? linkUrl({ provider: o.provider, port: String(port), challenge: pkce.challenge, state: pkce.state }, ctx) : startUrl(env, { provider: o.provider, port, pkce });
  let code: string;
  if (o.browser) {
    const listener = await listenForCode(pkce.state);
    let url: string;
    try {
      url = await urlFor(listener.port);
    } catch (e) {
      listener.close();
      throw e;
    }
    o.say(`Opening the browser. If it does not open, open this link:\n${url}\nThis command waits 5 minutes for the sign-in.`);
    o.open(url);
    code = await listener.wait();
  } else {
    o.say(`Open this link in a browser on any computer:\n${await urlFor("paste")}`);
    code = (await o.ask("Paste the code that the page shows: ")).trim();
    if (!code) throw new AccountError("No code given.");
  }
  await redeemCode(ctx, { code, verifier: pkce.verifier, device: deviceName("command line") });
  return getAccount(ctx);
}

export const signedIn = (env: Record<string, string | undefined> = process.env): boolean => cuvetteToken(env).from !== "none";
