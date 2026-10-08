import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Args, Tool, ToolContext, ToolOutput } from "../../core/types.ts";
import type { AdapterRuntime } from "../runtime.ts";
import { childEnv, decorate, inflight, makeRuntime, outputFile, runProcess, solidPng, tail, uniqueFile, validateArgs, type Dirs, type KindContext } from "./common.ts";

const dry = () => process.env.GA_SCREEN_DRY_RUN === "1";

const MAC_KEYS: Record<string, number> = { return: 36, enter: 76, tab: 48, space: 49, delete: 51, escape: 53, left: 123, right: 124, down: 125, up: 126, home: 115, end: 119, pageup: 116, pagedown: 121 };
const WIN_KEYS: Record<string, string> = { return: "{ENTER}", enter: "{ENTER}", tab: "{TAB}", space: " ", delete: "{BACKSPACE}", escape: "{ESC}", left: "{LEFT}", right: "{RIGHT}", down: "{DOWN}", up: "{UP}", home: "{HOME}", end: "{END}", pageup: "{PGUP}", pagedown: "{PGDN}" };
const LINUX_KEYS: Record<string, string> = { return: "Return", enter: "KP_Enter", tab: "Tab", space: "space", delete: "BackSpace", escape: "Escape", left: "Left", right: "Right", down: "Down", up: "Up", home: "Home", end: "End", pageup: "Prior", pagedown: "Next" };

const PS = ["powershell", "-NoProfile", "-NonInteractive", "-Command"];
const PS_HEAD = "Add-Type -AssemblyName System.Windows.Forms,System.Drawing;";

function sendKeysEscape(text: string): string {
  return text.replace(/[+^%~(){}[\]]/g, (ch) => `{${ch}}`);
}

function record(dirs: Dirs, action: Record<string, unknown>): void {
  appendFileSync(join(dirs.sessionDir, "screen-actions.jsonl"), `${JSON.stringify({ ts: new Date().toISOString(), ...action })}\n`);
}

async function sh(argv: string[], env: Record<string, string>, signal: AbortSignal): Promise<string | undefined> {
  const r = await runProcess(argv, { env, signal, timeoutMs: 30_000 });
  if (r.error) return `cannot start ${argv[0]}: ${r.error}`;
  if (r.code !== 0) return `${argv[0]} exited with code ${r.code}: ${tail(r.stderr.trim(), 500)}`;
  return undefined;
}

export async function takeScreenshot(dirs: Dirs, env: Record<string, string>, signal: AbortSignal): Promise<ToolOutput> {
  const path = uniqueFile(dirs.workDir, "screenshot", ".png");
  const route = "Take a screenshot of the screen";
  if (dry()) {
    writeFileSync(path, solidPng(64, 48, [230, 230, 230]));
    record(dirs, { action: "screenshot", path });
  } else {
    let err: string | undefined;
    if (process.platform === "darwin") err = await sh(["/usr/sbin/screencapture", "-x", path], env, signal);
    else if (process.platform === "win32") {
      err = await sh([...PS, `${PS_HEAD}$b=[System.Windows.Forms.SystemInformation]::VirtualScreen;$bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height;$g=[System.Drawing.Graphics]::FromImage($bmp);$g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size);$bmp.Save($env:GA_ARG1,[System.Drawing.Imaging.ImageFormat]::Png)`], { ...env, GA_ARG1: path }, signal);
    } else err = await sh(["import", "-window", "root", path], env, signal);
    if (err) return { ok: false, error: err, manualRoute: route };
  }
  return { ok: true, summary: `Screenshot saved as ${path}.`, images: [path], outputs: [outputFile(path)], manualRoute: route, fidelity: "close", data: { path, dry_run: dry() || undefined } };
}

type Act = (a: Args, env: Record<string, string>, signal: AbortSignal) => Promise<string | undefined>;

const focusApp: Act = async (a, env, signal) => {
  const app = String(a.app);
  if (process.platform === "darwin") return sh(["osascript", "-e", "on run argv", "-e", "tell application (item 1 of argv) to activate", "-e", "end run", app], env, signal);
  if (process.platform === "win32") return sh([...PS, "$ok=(New-Object -ComObject WScript.Shell).AppActivate($env:GA_APP); if(-not $ok){exit 3}"], { ...env, GA_APP: app }, signal);
  return sh(["xdotool", "search", "--name", app, "windowactivate"], env, signal);
};

const click: Act = async (a, env, signal) => {
  const x = String(Math.round(Number(a.x)));
  const y = String(Math.round(Number(a.y)));
  const times = a.double ? 2 : 1;
  if (process.platform === "darwin") {
    const jxa = `function run(argv){ObjC.import('ApplicationServices');const app=Application.currentApplication();app.includeStandardAdditions=true;const p={x:+argv[0],y:+argv[1]};const post=(t)=>{$.CGEventPost($.kCGHIDEventTap,$.CGEventCreateMouseEvent($(),t,p,$.kCGMouseButtonLeft))};post($.kCGEventMouseMoved);app.delay(0.05);for(let i=0;i<+argv[2];i++){post($.kCGEventLeftMouseDown);app.delay(0.03);post($.kCGEventLeftMouseUp);app.delay(0.05)}}`;
    return sh(["osascript", "-l", "JavaScript", "-e", jxa, x, y, String(times)], env, signal);
  }
  if (process.platform === "win32") {
    const script = `${PS_HEAD}Add-Type 'using System;using System.Runtime.InteropServices;public class M{[DllImport("user32.dll")]public static extern void mouse_event(uint f,uint x,uint y,uint d,UIntPtr e);}';[System.Windows.Forms.Cursor]::Position=New-Object System.Drawing.Point([int]$env:GA_X,[int]$env:GA_Y);for($i=0;$i -lt [int]$env:GA_TIMES;$i++){[M]::mouse_event(2,0,0,0,[UIntPtr]::Zero);[M]::mouse_event(4,0,0,0,[UIntPtr]::Zero)}`;
    return sh([...PS, script], { ...env, GA_X: x, GA_Y: y, GA_TIMES: String(times) }, signal);
  }
  return sh(["xdotool", "mousemove", x, y, "click", "--repeat", String(times), "1"], env, signal);
};

const typeText: Act = async (a, env, signal) => {
  const text = String(a.text);
  if (process.platform === "darwin") return sh(["osascript", "-e", "on run argv", "-e", 'tell application "System Events" to keystroke (item 1 of argv)', "-e", "end run", text], env, signal);
  if (process.platform === "win32") return sh([...PS, `${PS_HEAD}[System.Windows.Forms.SendKeys]::SendWait($env:GA_TEXT)`], { ...env, GA_TEXT: sendKeysEscape(text) }, signal);
  return sh(["xdotool", "type", "--", text], env, signal);
};

const pressKey: Act = async (a, env, signal) => {
  const key = String(a.key).toLowerCase();
  const mods = ((a.modifiers as string[] | undefined) ?? []).map((m) => (m === "alt" ? "option" : m));
  if (process.platform === "darwin") {
    const using = mods.length ? ` using {${mods.map((m) => `${m} down`).join(", ")}}` : "";
    const body = key in MAC_KEYS ? `key code ${MAC_KEYS[key]}${using}` : `keystroke (item 1 of argv)${using}`;
    return sh(["osascript", "-e", "on run argv", "-e", `tell application "System Events" to ${body}`, "-e", "end run", key], env, signal);
  }
  if (process.platform === "win32") {
    const prefix = mods.map((m) => ({ control: "^", command: "^", shift: "+", option: "%" })[m]).join("");
    const code = WIN_KEYS[key] ?? (key.length === 1 ? sendKeysEscape(key) : `{${key.toUpperCase()}}`);
    return sh([...PS, `${PS_HEAD}[System.Windows.Forms.SendKeys]::SendWait($env:GA_KEYS)`], { ...env, GA_KEYS: prefix + code }, signal);
  }
  const prefix = mods.map((m) => ({ control: "ctrl", command: "super", shift: "shift", option: "alt" })[m]).join("+");
  return sh(["xdotool", "key", (prefix ? `${prefix}+` : "") + (LINUX_KEYS[key] ?? key)], env, signal);
};

interface Spec {
  name: string;
  title: string;
  description: string;
  properties: Record<string, unknown>;
  required: string[];
  readOnly?: boolean;
  act?: Act;
  route(a: Args): string;
}

const APP = { type: "string", description: "Name of the program window to bring to the front first." };

const SPECS: Spec[] = [
  { name: "screenshot", title: "Take a screenshot", description: "Save a PNG of the whole screen. Look at the picture to read the state of the program.", properties: {}, required: [], readOnly: true, route: () => "Take a screenshot of the screen" },
  { name: "click", title: "Click", description: "Click the screen at pixel position (x, y).", properties: { x: { type: "number", minimum: 0 }, y: { type: "number", minimum: 0 }, double: { type: "boolean", default: false }, app: APP }, required: ["x", "y"], act: click, route: (a) => `${a.double ? "Double-click" : "Click"} at (${a.x}, ${a.y})${a.app ? ` in ${a.app}` : ""}` },
  { name: "type_text", title: "Type text", description: "Type text into the program that has the focus.", properties: { text: { type: "string", minLength: 1, maxLength: 10000 }, app: APP }, required: ["text"], act: typeText, route: (a) => `Type ${JSON.stringify(a.text)}${a.app ? ` in ${a.app}` : ""}` },
  { name: "key", title: "Press a key", description: "Press one key, with optional modifier keys. Names: return, tab, space, delete, escape, arrows, home, end, pageup, pagedown, or one character.", properties: { key: { type: "string", minLength: 1, maxLength: 20 }, modifiers: { type: "array", items: { type: "string", enum: ["command", "shift", "option", "alt", "control"] }, default: [] }, app: APP }, required: ["key"], act: pressKey, route: (a) => `Press ${[...((a.modifiers as string[]) ?? []), a.key].join("+")}${a.app ? ` in ${a.app}` : ""}` },
  { name: "focus_app", title: "Bring a program to the front", description: "Bring a program window to the front.", properties: { app: { type: "string", minLength: 1 } }, required: ["app"], act: focusApp, route: (a) => `Bring ${a.app} to the front` },
];

export function startScreen(c: KindContext): AdapterRuntime {
  const live = inflight();
  const overrides = new Map(c.adapter.manifest.tools.map((d) => [d.name, d]));
  const tools: Tool[] = SPECS.map((s) => {
    const schema = { type: "object", properties: s.properties, required: s.required, additionalProperties: false };
    const o = overrides.get(s.name);
    return decorate(c, { read_only: s.readOnly || o?.read_only || false, approval: o?.approval ?? false }, {
      name: s.name,
      title: s.title,
      description: s.description,
      inputSchema: schema,
      async execute(raw: Args, ctx: ToolContext) {
        const v = validateArgs(schema, raw);
        if (v.error) return { ok: false, error: v.error };
        const a = v.args;
        return live.track(ctx.signal, async (signal) => {
          const env = childEnv(c);
          if (!s.act) return takeScreenshot(c.dirs, env, signal);
          const route = s.route(a);
          if (dry()) {
            record(c.dirs, { action: s.name, ...a });
            return { ok: true, summary: `${route} (dry run, not done).`, data: { dry_run: true, action: s.name, ...a }, manualRoute: route, fidelity: "close" };
          }
          const err = (a.app && s.name !== "focus_app" ? await focusApp(a, env, signal) : undefined) ?? (await s.act(a, env, signal));
          if (err) return { ok: false, error: err, manualRoute: route };
          return { ok: true, summary: `${route}.`, data: { action: s.name, ...a }, manualRoute: route, fidelity: "close" };
        });
      },
    });
  });
  return makeRuntime(c, { tools: () => tools, cancel: () => live.cancel(), close: () => live.cancel() });
}
