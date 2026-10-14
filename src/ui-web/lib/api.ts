import { toast } from "sonner";

export const TOKEN = new URLSearchParams(location.search).get("t") ?? "";

export const withT = (p: string) => p + (p.includes("?") ? "&" : "?") + "t=" + encodeURIComponent(TOKEN);

export async function call<T = unknown>(path: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(withT(path), body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json", "x-token": TOKEN }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Cuvette does not answer. Make sure that the app still runs, then reload the page.");
  }
  const type = r.headers.get("content-type") ?? "";
  const data = type.includes("json") ? await r.json() : await r.text();
  if (!r.ok) throw new Error((data && (data.error || data.text)) || `HTTP ${r.status}`);
  return data as T;
}

export async function post<T = unknown>(path: string, body: unknown): Promise<T | undefined> {
  try {
    return await call<T>(path, body);
  } catch (e) {
    toast.error((e as Error).message);
  }
}

interface Desktop {
  chooseFolder?: (start?: string) => Promise<string | null>;
  reveal?: (path: string) => Promise<unknown>;
  notify?: (title: string, body: string) => Promise<unknown>;
  saveFile?: (url: string, name: string) => Promise<unknown>;
}

const desktop = (window as unknown as { cuvetteDesktop?: Desktop }).cuvetteDesktop;

export const bridge: { chooseFolder?: (start?: string) => Promise<string | null>; reveal: (path: string) => Promise<unknown>; notify: (title: string, body: string) => void; saveFile?: (url: string, name: string) => Promise<unknown> } = {
  chooseFolder: desktop?.chooseFolder ? (start?: string) => desktop.chooseFolder!(start) : undefined,
  reveal: (path: string) => (desktop?.reveal ? desktop.reveal(path) : call("api/reveal", { path })),
  notify: (title: string, body: string) => {
    if (desktop?.notify) return void desktop.notify(title, body);
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body });
      } catch {}
    }
  },
  saveFile: desktop?.saveFile ? (url: string, name: string) => desktop.saveFile!(new URL(url, location.href).href, name) : undefined,
};

export function enableFinder() {
  if (bridge.chooseFolder) return;
  bridge.chooseFolder = async (start?: string) => (await call<{ path: string }>("api/choose-folder", { start })).path || null;
}

export function askNotify() {
  if (!desktop && "Notification" in window && Notification.permission === "default") {
    try {
      void Notification.requestPermission();
    } catch {}
  }
}

export function copyText(text: string) {
  const done = () => toast.success("Copied.");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text));
    return;
  }
  fallbackCopy(text);
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.append(ta);
  ta.select();
  try {
    document.execCommand("copy");
    toast.success("Copied.");
  } catch {
    toast("Select the text and copy it.");
  }
  ta.remove();
}

export function midText(t: string, n: number) {
  if (t.length <= n) return t;
  const k = Math.floor((n - 1) / 2);
  return t.slice(0, k) + "…" + t.slice(t.length - k);
}

export interface AppState {
  session: { id: string; folder: string; folderShown: string; folderLine: string; model: string; programs: string[]; details: boolean } | null;
  opening: boolean;
  error: string;
  setup: boolean;
  model: string;
  folder: string;
  start: string;
  home: string;
  owned: boolean;
  finder?: boolean;
}

export interface Status {
  state: string;
  text?: string;
  since?: number | null;
  mode?: string;
  bypass?: boolean;
  openQuestions?: number;
  queue?: string[];
  placeholder?: string;
  queueMode?: boolean;
  where?: string;
  model?: string;
  details?: boolean;
  usage?: string;
  usageLong?: string;
}
