import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { locate } from "../../src/adapters/locate.ts";
import { loadAdapter, type AdapterCheckContext, type AdapterModule, type LoadedAdapter } from "../../src/adapters/manifest.ts";
import { runProcess } from "../../src/adapters/kinds/common.ts";
import type { Args, FindingIn, Fidelity, Hook, Node, Tool, ToolOutput } from "../../src/core/types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

let adapterCache: LoadedAdapter | undefined;
function adapter(): LoadedAdapter {
  adapterCache ??= loadAdapter(HERE);
  return adapterCache;
}

// ---------------------------------------------------------------- menu index

export function readZipEntry(jar: string, name: string): string | undefined {
  const buf = readFileSync(jar);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return undefined;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && buf.readUInt32LE(p) === 0x02014b50; n++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entry = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (entry === name) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      return (method === 0 ? data : inflateRawSync(data)).toString("utf8");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return undefined;
}

const GROUP_MENU: Record<string, string> = {
  new: "File > New",
  import: "File > Import",
  save: "File > Save As",
  batch: "File > Batch",
  open: "File > Open Samples",
  selection: "Edit > Selection",
  options: "Edit > Options",
  adjust: "Image > Adjust",
  color: "Image > Color",
  stacks: "Image > Stacks",
  tools_: "Image > Stacks > Tools",
  animation_: "Image > Stacks > Animation",
  hyperstacks: "Image > Hyperstacks",
  transform: "Image > Transform",
  zoom: "Image > Zoom",
  overlay: "Image > Overlay",
  lookup: "Image > Lookup Tables",
  noise: "Process > Noise",
  shadows: "Process > Shadows",
  binary: "Process > Binary",
  math: "Process > Math",
  fft: "Process > FFT",
  filters: "Process > Filters",
  gels: "Analyze > Gels",
  tools: "Analyze > Tools",
  macros: "Plugins > Macros",
  shortcuts: "Plugins > Shortcuts",
  utilities: "Plugins > Utilities",
  new_: "Plugins > New",
};

const CORE_COMMANDS = [
  "File > Open...", "File > Close", "File > Save", "Edit > Invert", "Edit > Selection > Specify...",
  "Image > Type > 8-bit", "Image > Type > 16-bit", "Image > Type > 32-bit", "Image > Type > RGB Color",
  "Image > Show Info...", "Image > Properties...", "Image > Duplicate...", "Image > Crop", "Image > Scale...",
  "Process > Subtract Background...", "Process > Smooth", "Process > Sharpen", "Process > Find Edges",
  "Process > Enhance Contrast...", "Analyze > Measure", "Analyze > Analyze Particles...",
  "Analyze > Set Measurements...", "Analyze > Set Scale...", "Analyze > Clear Results", "Analyze > Summarize",
  "Analyze > Histogram", "Analyze > Calibrate...", "Plugins > Utilities > Find Commands...",
];

export function menuFromProps(props: string): string[] {
  const out = new Set<string>(CORE_COMMANDS);
  for (const line of props.split(/\r?\n/)) {
    const m = /^([a-z_]+?)\d+="([^"]+)"/.exec(line.trim());
    if (!m || !(m[1] in GROUP_MENU)) continue;
    const label = m[2].replace(/\[[^\]]*\]\s*$/, "").trim();
    out.add(`${GROUP_MENU[m[1]]} > ${label}`);
  }
  return [...out];
}

let jarCache: Promise<string | undefined> | undefined;
function programJar(): Promise<string | undefined> {
  jarCache ??= locate(adapter().manifest).then((l) => l.path);
  return jarCache;
}

let menuCache: Promise<string[]> | undefined;
export function menuIndex(): Promise<string[]> {
  menuCache ??= buildMenu();
  return menuCache;
}

async function buildMenu(): Promise<string[]> {
  const jar = await programJar();
  if (!jar) return menuFromProps("");
  const cacheFile = join(tmpdir(), `ga-imagej-menu-${Buffer.from(jar + statSync(jar).mtimeMs).toString("base64url").slice(-40)}.txt`);
  if (existsSync(cacheFile)) return readFileSync(cacheFile, "utf8").split("\n").filter(Boolean);
  const r = await runProcess(["java", "-Dapple.awt.UIElement=true", "-cp", jar, join(HERE, "MenuDump.java")], { timeoutMs: 60_000 });
  const lines = r.stdout.split(/\r?\n/).filter((l) => / > /.test(l) && !l.startsWith("Exception"));
  if (r.code === 0 && lines.length > 100) {
    writeFileSync(cacheFile, lines.join("\n"));
    return lines;
  }
  const props = readZipEntry(jar, "IJ_Props.txt") ?? "";
  return menuFromProps(props);
}

export function normalizeLabel(label: string): string {
  return label.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
}

// ---------------------------------------------------------------- manual routes

function onOff(v: unknown): string {
  return v === true ? "on" : v === false ? "off" : String(v);
}

function fillSteps(tool: string, args: Args): string[] {
  const entry = adapter().mapEntry(tool, args);
  if (!entry) return [];
  const shown: Args = { ...args };
  if (shown.max_size === 0 || shown.max_size === undefined) shown.max_size = "Infinity";
  if (shown.measure_image === "" || shown.measure_image === undefined) shown.measure_image = "None";
  return entry.steps
    .filter((s) => !(tool === "measure" && /Specify/.test(s) && !args.roi))
    .map((s) => s.replace(/\{([a-z_]+)\}/g, (all, k: string) => (k in shown ? onOff(shown[k]) : all)));
}

function num(v: unknown): string {
  return typeof v === "number" ? String(v) : String(v ?? "");
}

function recorderLines(tool: string, a: Args): string[] {
  switch (tool) {
    case "open_image":
    case "image_info":
      return [`open("${a.path}");`];
    case "set_scale":
      return [`run("Set Scale...", "distance=${num(a.distance_px)} known=${num(a.known_distance)} pixel=1 unit=${a.unit ?? "um"}");`];
    case "subtract_background":
      return [`run("Subtract Background...", "rolling=${num(a.rolling_radius ?? 50)}${a.light_background ? " light" : ""}");`];
    case "gaussian_blur":
      return [`run("Gaussian Blur...", "sigma=${num(a.sigma ?? 2)}");`];
    case "threshold":
      return [`setAutoThreshold("${a.method}${a.dark_background ? " dark" : ""}");`, `run("Convert to Mask");`];
    case "watershed":
      return [`run("Watershed");`];
    case "analyze_particles": {
      const max = Number(a.max_size) > 0 ? num(a.max_size) : "Infinity";
      const circ = Number(a.min_circularity ?? 0).toFixed(2);
      const redirect = a.measure_image ? `[${String(a.measure_image).split(/[\\/]/).pop()}]` : "None";
      return [
        `run("Set Measurements...", "area mean standard min centroid perimeter shape integrated median redirect=${redirect} decimal=3");`,
        `run("Analyze Particles...", "size=${num(a.min_size ?? 0)}-${max} circularity=${circ}-1.00 show=Outlines display clear${a.exclude_edges ? " exclude" : ""}");`,
      ];
    }
    case "measure":
      return [
        ...(a.roi ? [`makeRectangle(${String(a.roi).split(",").map((x) => x.trim()).join(", ")});`] : []),
        `run("Set Measurements...", "area mean standard min integrated redirect=None decimal=3");`,
        `run("Measure");`,
      ];
    case "run_command":
      return [`run("${a.command}", "${a.options ?? ""}");`];
    case "run_macro":
      return String(a.code ?? "").split("\n");
    default:
      return [];
  }
}

function pipelineParts(a: Args): { tool: string; args: Args }[] {
  const parts: { tool: string; args: Args }[] = [];
  if (Number(a.rolling_radius) > 0) parts.push({ tool: "subtract_background", args: { rolling_radius: a.rolling_radius, light_background: a.light_background ?? false } });
  if (Number(a.sigma) > 0) parts.push({ tool: "gaussian_blur", args: { sigma: a.sigma } });
  parts.push({ tool: "threshold", args: { method: a.method ?? "Default", dark_background: a.dark_background ?? false } });
  if (a.watershed) parts.push({ tool: "watershed", args: {} });
  parts.push({ tool: "analyze_particles", args: { min_size: a.min_size ?? 0, max_size: a.max_size ?? 0, min_circularity: a.min_circularity ?? 0, exclude_edges: a.exclude_edges ?? false } });
  return parts;
}

function single(tool: string, a: Args): string {
  const entry = adapter().mapEntry(tool, a);
  const lines = [entry ? entry.route : tool];
  for (const s of fillSteps(tool, a)) lines.push(`  ${s}`);
  const rec = recorderLines(tool, a).filter(Boolean);
  if (rec.length) {
    lines.push("Macro Recorder text:");
    for (const r of rec) lines.push(`  ${r}`);
  }
  return lines.join("\n");
}

export function manualRoute(tool: string, a: Args): string | undefined {
  if (tool === "threshold_and_count" || tool === "count_folder") {
    const parts = pipelineParts(a);
    const head = tool === "count_folder" ? [`Repeat the steps below for each image in ${a.folder} that matches ${a.pattern ?? "*.tif"}.`] : [];
    const body = parts.map((p, i) => `Step ${i + 1}. ${single(p.tool, p.args)}`);
    return [...head, ...body].join("\n");
  }
  if (tool === "list_commands") return `Plugins > Utilities > Find Commands...\n  Type ${a.query ?? ""} in the search field`;
  if (tool === "run_macro") return `Plugins > New > Macro\n  Paste the macro text and click Run in the macro editor\n${String(a.code ?? "")}`;
  return single(tool, a);
}

export function fidelity(tool: string, a: Args): Fidelity | undefined {
  if (tool !== "run_macro") return undefined;
  const lines = String(a.code ?? "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//"));
  const onlyRun = lines.length > 0 && lines.every((l) => /^run\("[^"]*"(\s*,\s*"[^"]*")?\);?$/.test(l));
  return onlyRun ? "exact" : "code_only";
}

// ---------------------------------------------------------------- list_commands

const listCommands: Tool = {
  name: "list_commands",
  title: "List menu commands",
  description: "Search the ImageJ menus. Gives the menu path of each command that matches the words in query. Use it to find the exact name for run_command.",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string", description: "Words to look for, such as median or fill holes." } },
    required: ["query"],
    additionalProperties: false,
  },
  source: "adapter",
  adapter: "imagej",
  remoteName: "list_commands",
  readOnly: true,
  async execute(args): Promise<ToolOutput> {
    const q = String(args.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    if (!q.length) return { ok: false, error: "query is empty" };
    const found = (await menuIndex()).filter((p) => q.every((w) => p.toLowerCase().includes(w)));
    const shown = found.slice(0, 40).map((p) => {
      const cmd = normalizeLabel(p.split(" > ").pop() ?? p);
      return `${p}   (command name: ${cmd})`;
    });
    const text = found.length ? shown.join("\n") + (found.length > shown.length ? `\n[${found.length - shown.length} more]` : "") : "No menu command matches.";
    return {
      ok: true,
      text,
      summary: `Found ${found.length} menu commands for "${args.query}".`,
      metrics: { n_found: found.length },
      data: { commands: found.slice(0, 200) },
      manualRoute: manualRoute("list_commands", args),
      fidelity: "exact",
    };
  },
};

// ---------------------------------------------------------------- checks

const MEASURING = new Set(["analyze_particles", "threshold_and_count", "count_folder", "measure"]);
const UNIT_WORDS = /(?:\d\s*|\b)(?:µm|μm|um|micron|microns|micrometers?|micrometres?|mm|nm)(?:\b|²|\^2|2)/i;
const P_VALUE = /\bp\s*(?:[<=>≤≥]|-value|value)|\bp-value|\bsignificant(?:ly)?\b/i;

function metricsOf(n: Node): Record<string, number> {
  const r = n.result as { metrics?: Record<string, number> } | undefined;
  return r?.metrics ?? {};
}

function valuesOf(n: Node): Record<string, unknown> {
  const r = n.result as { data?: { values?: Record<string, unknown> } } | undefined;
  return r?.data?.values ?? {};
}

function okNodes(ctx: AdapterCheckContext): Node[] {
  return ctx.nodes.filter((n) => (n.result as { ok?: boolean } | undefined)?.ok !== false);
}

function imagesAnalyzed(nodes: Node[]): number {
  const seen = new Set<string>();
  let folderImages = 0;
  for (const n of nodes) {
    if (n.tool === "count_folder") folderImages += metricsOf(n).n_images ?? 0;
    else if (MEASURING.has(n.tool)) seen.add(String(n.args.mask ?? n.args.input ?? n.id));
  }
  return seen.size + folderImages;
}

function pseudoreplication(ctx: AdapterCheckContext): FindingIn[] {
  const replicate = String(ctx.decisions.replicate ?? "");
  if (!replicate.startsWith("cells or particles")) return [];
  if (!P_VALUE.test(ctx.answer)) return [];
  const nodes = okNodes(ctx).filter((n) => MEASURING.has(n.tool));
  const images = imagesAnalyzed(nodes);
  const few = images < 4;
  return [
    {
      check: "pseudoreplication",
      severity: few ? "error" : "warning",
      message: few
        ? `The answer reports p-values from cells or particles, but only ${images} image(s) were analyzed. Cells in one image are not independent samples. Count per image and compare images or biological replicates.`
        : "The unit of replication is cells or particles, and the answer reports p-values. Cells in one image are not independent samples. Compare per-image values instead.",
      nodes: nodes.map((n) => n.id),
    },
  ];
}

function isCalibrated(ctx: AdapterCheckContext): boolean {
  const size = String(ctx.decisions.pixel_size ?? "uncalibrated").toLowerCase();
  if (size && !size.startsWith("uncalibrated") && !size.startsWith("unknown")) return true;
  for (const n of okNodes(ctx)) {
    if (n.tool === "set_scale") return true;
    const v = valuesOf(n);
    if (v.calibrated === 1 || (typeof v.pixel_unit === "string" && !/^pixels?$/.test(v.pixel_unit))) return true;
    if (typeof v.area_unit === "string" && !/^pixels?$/.test(v.area_unit)) return true;
  }
  return false;
}

function uncalibratedUnits(ctx: AdapterCheckContext): FindingIn[] {
  if (!UNIT_WORDS.test(ctx.answer) || isCalibrated(ctx)) return [];
  return [
    {
      check: "uncalibrated_units",
      severity: "error",
      message: "The answer gives sizes in micrometers, but the images have no scale. Set the scale from a scale bar with set_scale, or report sizes in pixels.",
    },
  ];
}

function saturation(ctx: AdapterCheckContext): FindingIn[] {
  const opened = okNodes(ctx).filter(
    (n) => ((n.tool === "open_image" || n.tool === "image_info") && (metricsOf(n).saturated_fraction ?? 0) > 0.01) || (metricsOf(n).n_saturated_images ?? 0) > 0,
  );
  if (!opened.length || !okNodes(ctx).some((n) => MEASURING.has(n.tool))) return [];
  const mentioned = /saturat|clipp|overexpos|maximum value/i.test(ctx.answer);
  const aboutIntensity = /intensit|bright|fluoresc|signal|expression/i.test(ctx.answer);
  return [
    {
      check: "saturation",
      severity: aboutIntensity && !mentioned ? "error" : "warning",
      message: "A measured image has more than 1 percent of its pixels at the maximum value. Intensities from saturated pixels are too low, and objects can merge. Name the saturated images in the answer, and do not compare intensities from them. Image again with less exposure.",
      nodes: opened.map((n) => n.id),
    },
  ];
}

const JPEG = /\.jpe?g$/i;

function jpegQuantification(ctx: AdapterCheckContext): FindingIn[] {
  const nodes = okNodes(ctx);
  const jpeg = nodes.filter((n) => [n.args.path, n.args.input, n.args.mask, n.args.measure_image].some((p) => typeof p === "string" && JPEG.test(p)));
  if (!jpeg.length || !nodes.some((n) => MEASURING.has(n.tool))) return [];
  return [
    {
      check: "jpeg_quantification",
      severity: "warning",
      message: "A JPEG file was measured. JPEG compression changes pixel values and moves object edges. Use the original TIFF or PNG file.",
      nodes: jpeg.map((n) => n.id),
    },
  ];
}

function thresholdNotChecked(ctx: AdapterCheckContext): FindingIn[] {
  const nodes = okNodes(ctx);
  const used = nodes.filter((n) => n.tool === "threshold" || n.tool === "threshold_and_count" || n.tool === "count_folder");
  if (!used.length) return [];
  const byMethod = new Map<string, number>();
  for (const n of nodes) {
    if (n.tool === "threshold_and_count" && typeof metricsOf(n).count === "number") byMethod.set(String(n.args.method ?? "Default"), metricsOf(n).count);
  }
  const sens = ctx.entries.filter((e) => e.kind === "sensitivity" && String((e.data as { decisionKey?: string }).decisionKey) === "threshold_method");
  for (const e of sens) {
    const rows = ((e.data as { options?: { value: unknown; ok: boolean; metrics?: Record<string, number> }[] }).options ?? []);
    for (const r of rows) if (r.ok && typeof r.metrics?.count === "number") byMethod.set(String(r.value), r.metrics.count);
  }
  const counts = [...byMethod.values()];
  if (counts.length >= 2) {
    const hi = Math.max(...counts);
    const lo = Math.min(...counts);
    if (hi > 0 && (hi - lo) / hi > 0.2) {
      return [
        {
          check: "threshold_not_checked",
          severity: "warning",
          message: `The count changes by more than 20 percent between threshold methods (${lo} to ${hi}). Report the range, not one number, and say why you chose the method.`,
          nodes: used.map((n) => n.id),
        },
      ];
    }
    return [];
  }
  if (!sens.length) {
    return [
      {
        check: "threshold_not_checked",
        severity: "info",
        message: "The threshold method was not compared with other methods. Run threshold_and_count with two or three methods and check that the count holds.",
        nodes: used.map((n) => n.id),
      },
    ];
  }
  return [];
}

function backgroundNotHandled(ctx: AdapterCheckContext): FindingIn[] {
  const nodes = okNodes(ctx);
  const uneven = nodes.filter((n) => n.tool === "open_image" && (metricsOf(n).background_variation ?? 0) > 0.1);
  if (!uneven.length) return [];
  const handled = nodes.some((n) => n.tool === "subtract_background" || (Number(n.args.rolling_radius) > 0 && (n.tool === "threshold_and_count" || n.tool === "count_folder")));
  if (handled) return [];
  if (!nodes.some((n) => MEASURING.has(n.tool) || n.tool === "threshold")) return [];
  return [
    {
      check: "background_not_handled",
      severity: "warning",
      message: "The background differs across a measured image, and no step subtracted it. An uneven background can change the count and the sizes. Run subtract_background with a radius larger than the largest object, or explain why it is not needed.",
      nodes: uneven.map((n) => n.id),
    },
  ];
}

// ---------------------------------------------------------------- hook

const afterOpen: Hook = {
  name: "imagej-open-image-warnings",
  event: "PostToolUse",
  matcher: "open_image",
  run(input: { tool: string; output: ToolOutput }) {
    if (input.tool !== "open_image" || !input.output?.ok) return {};
    const m = input.output.metrics ?? {};
    const v = ((input.output.data as { values?: Record<string, unknown> } | undefined)?.values ?? {}) as Record<string, unknown>;
    const notes: string[] = [];
    if ((m.saturated_fraction ?? 0) > 0.01) {
      notes.push(`Saturation: ${((m.saturated_fraction ?? 0) * 100).toFixed(1)} percent of the pixels are at the maximum value. Tell the scientist before you measure this image.`);
    }
    if (v.file_type === "jpeg") notes.push("JPEG file: do not use it for quantification. Ask the scientist for the original file.");
    if ((m.background_variation ?? 0) > 0.1) notes.push("The background differs across the image. Ask whether to subtract it.");
    if (m.calibrated === 0) notes.push("The image has no scale. Ask the scientist for the pixel size before you report sizes in real units.");
    return notes.length ? { additionalContext: notes.join("\n") } : {};
  },
};

const mod: AdapterModule & { fidelity: typeof fidelity } = {
  checks: {
    pseudoreplication,
    uncalibrated_units: uncalibratedUnits,
    saturation,
    jpeg_quantification: jpegQuantification,
    threshold_not_checked: thresholdNotChecked,
    background_not_handled: backgroundNotHandled,
  },
  hooks: [afterOpen],
  tools: [listCommands],
  manualRoute,
  fidelity,
};

export default mod;
