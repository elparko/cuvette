import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"];
export const CHROME = CANDIDATES.find((p) => p && existsSync(p));

export interface Page {
  eval<T = unknown>(expr: string): Promise<T>;
  size(width: number, height: number): Promise<void>;
  go(url: string): Promise<void>;
  shot(): Promise<Buffer>;
  close(): Promise<void>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function openChrome(): Promise<Page> {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-chrome-"));
  const proc: ChildProcess = spawn(CHROME!, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let port = "";
  for (let i = 0; i < 100 && !port; i++) {
    await wait(100);
    const f = join(dir, "DevToolsActivePort");
    if (existsSync(f)) port = readFileSync(f, "utf8").split("\n")[0]!;
  }
  if (!port) throw new Error("Chrome did not start");
  const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const ws = new WebSocket(targets.find((t) => t.type === "page")!.webSocketDebuggerUrl);
  await new Promise((done, fail) => ((ws.onopen = done), (ws.onerror = fail)));
  let id = 0;
  const pending = new Map<number, { done: (v: any) => void; fail: (e: Error) => void }>();
  const loads: (() => void)[] = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(String(ev.data));
    if (m.method === "Page.loadEventFired") loads.splice(0).forEach((f) => f());
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.fail(new Error(m.error.message));
    else p.done(m.result);
  };
  const send = (method: string, params: object = {}) =>
    new Promise<any>((done, fail) => {
      const n = ++id;
      pending.set(n, { done, fail });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  await send("Page.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  return {
    async eval(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async size(width, height) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
      await wait(150);
    },
    async go(url) {
      const loaded = new Promise<void>((r) => loads.push(r));
      await send("Page.navigate", { url });
      await loaded;
    },
    async shot() {
      const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      return Buffer.from(r.data, "base64");
    },
    async close() {
      ws.close();
      proc.kill();
      await wait(200);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
