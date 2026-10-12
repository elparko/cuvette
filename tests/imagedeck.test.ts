import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { deflateSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pdfPages } from "../src/core/databook.ts";
import { buildPages, caption, cells, collectImages, deckInfo, globRe, gridOf, parseDeckArgs, writeImageDeck, type DeckOptions } from "../src/core/imagedeck.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { buildWorkbook, savedLine, writeResults } from "../src/core/results.ts";
import { findChrome } from "../src/core/trail.ts";
import { crc32 } from "../src/eln/zip.ts";
import { scriptPython } from "../src/tools/run_script.ts";
import { unzip } from "./fixtures/unzip.ts";

const FIXTURE = join(__dirname, "fixtures", "databook", "log.jsonl");
const HAS_PPTX = spawnSync(scriptPython(), ["-c", "import pptx"]).status === 0;

function png(w: number, h: number, shade: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const rows = Buffer.alloc((w + 1) * h, shade);
  for (let y = 0; y < h; y++) rows[y * (w + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

let home: string;
let oldHome: string | undefined;

beforeEach(() => {
  oldHome = process.env.CUVETTE_HOME;
  home = mkdtempSync(join(tmpdir(), "cuvette-deck-home-"));
  process.env.CUVETTE_HOME = home;
});

afterEach(() => {
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

interface Fixture {
  r: AnalysisRecord;
  out: string;
}

function session(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "cuvette-deck-"));
  const dir = join(root, "s");
  const out = join(root, "out");
  const files = join(root, "files");
  for (const d of [dir, out, files]) mkdirSync(d, { recursive: true });
  writeFileSync(join(dir, "log.jsonl"), readFileSync(FIXTURE, "utf8"));
  const r = new AnalysisRecord(dir, "20261008-192132-8dd2");
  const file = (name: string, w: number, h: number, shade: number) => {
    const p = join(files, name);
    writeFileSync(p, png(w, h, shade));
    return p;
  };
  const node = (tool: string, args: Record<string, unknown>, outputs: string[], metrics: Record<string, number>, summary: string) =>
    r.addNode({
      entry: r.entries().length, adapter: "biostats", adapterVersion: "0.1.1", programVersion: "0.30.3", tool, args, decisions: {}, codeHash: "c", inputHashes: [],
      outputs: outputs.map((p) => ({ path: p, kind: "image" as const, name: basename(p) })), result: { ok: true, metrics }, parents: [], summary, model: "m", manualRoute: "", fidelity: "close",
    });
  const maskB = file("field2_mask.png", 40, 40, 10);
  const tif = join(files, "field2_mask.tif");
  writeFileSync(tif, "not shown");
  node("threshold_image", { path: "/data/treated/field2.png", threshold_method: "otsu" }, [maskB, tif], { n_objects: 12 }, "Otsu threshold 40.");
  const maskA = file("field1_outlines.png", 40, 40, 20);
  node("label_objects", { path: "/data/control/field1.png" }, [maskA], { n_objects: 14 }, "14 objects.");
  const plot = file("extra_by_drug.png", 80, 40, 30);
  node("plot_groups", { path: "/data/sleep.csv", y: "extra", x: "drug", error_bars: "95% confidence interval", title: "Extra sleep by drug" }, [plot], { n_a: 10, n_b: 10, mean_a: 0.75, mean_b: 2.33 }, "Plotted extra sleep by drug.");
  const qc = file("pilot_qc.png", 40, 40, 40);
  r.append("pilot_run", { sample: "control/field1", values: { cells: 14 }, images: [qc, maskA], check: "ok", comparison: [], definitions: [] });
  const ba = file("bland-altman-cells.png", 60, 40, 50);
  r.append("validation", { measure: "cells", plot: ba, pairs: [{ sample: "a", ours: 1, ref: 1, pilot: true }, { sample: "b", ours: 2, ref: 2, pilot: false }] });
  return { r, out };
}

const names = (list: { file: string }[]) => list.map((i) => i.file.split("/").pop());

describe("image deck", () => {
  it("reads the options in any order", () => {
    expect(parseDeckArgs([])).toEqual({ formats: ["pptx"], images: "all", order: "step", perPage: 1 });
    expect(parseDeckArgs(["pdf", "qc", "group", "9", "a4"])).toEqual({ formats: ["pdf"], images: "qc", order: "group", perPage: 9, size: "a4" });
    expect(parseDeckArgs(["both", "*mask*", "name", "16:9"])).toMatchObject({ formats: ["pptx", "pdf"], images: "*mask*", order: "name", size: "16:9" });
    expect(parseDeckArgs(["--images", "demonstration", "sample"])).toMatchObject({ images: "pilot", order: "group" });
    expect(parseDeckArgs(["5"])).toMatch(/Unknown option "5"/);
    expect(globRe("figures/step0?-*.png").test("figures/step04-mask.png")).toBe(true);
    expect(globRe("*.png").test("figures/a.png")).toBe(false);
  });

  it("selects figures, QC images and demonstration images, without twins", () => {
    const { r, out } = session();
    const opts = (images: string, order: DeckOptions["order"] = "step") => collectImages(r, out, { images, order });
    expect(names(opts("all"))).toEqual(["step03-field2-mask.png", "step04-field1-outlines.png", "step05-extra-by-drug.png", "pilot_qc.png", "bland-altman-cells.png"]);
    expect(names(opts("figures"))).toEqual(["step05-extra-by-drug.png", "bland-altman-cells.png"]);
    expect(names(opts("qc"))).toEqual(["step03-field2-mask.png", "step04-field1-outlines.png", "pilot_qc.png"]);
    expect(names(opts("pilot"))).toEqual(["step04-field1-outlines.png", "pilot_qc.png"]);
    expect(names(opts("*mask*"))).toEqual(["step03-field2-mask.png"]);
    expect(names(opts("all", "name"))).toEqual(["bland-altman-cells.png", "pilot_qc.png", "step03-field2-mask.png", "step04-field1-outlines.png", "step05-extra-by-drug.png"]);
    expect(opts("all", "group").map((i) => i.group)).toEqual(["a, b (by drug)", "All samples", "control/field1", "control/field1", "treated/field2"]);
  });

  it("writes captions from the record", () => {
    const { r, out } = session();
    const all = collectImages(r, out, { images: "all", order: "step" });
    const by = (n: string) => caption(all.find((i) => i.file.endsWith(n))!);
    expect(by("extra-by-drug.png")).toBe(
      "Extra sleep by drug. Groups: a, b (by drug). n: n_a = 10, n_b = 10. Error bars: 95% confidence interval. Step 5 (plot_groups). File: figures/step05-extra-by-drug.png. Result: Plotted extra sleep by drug.",
    );
    expect(by("field1-outlines.png")).toBe(
      "Field1 outlines: QC image from label objects. Sample: control/field1. n: n_objects = 14. Step 4 (label_objects). Shown in the demonstration on control/field1. File: figures/step04-field1-outlines.png. Result: 14 objects.",
    );
    expect(by("pilot_qc.png")).toMatch(/^Demonstration on one sample: QC image 1 of 2, run 1\. Sample: control\/field1\. n = 1 sample\. After step 5, before the batch\. File: .*pilot_qc\.png\.$/);
    expect(by("bland-altman-cells.png")).toMatch(/n = 2 samples\. Error bars: none/);
    const info = deckInfo(r, [], out);
    expect(info.question).toMatch(/^Is one sleeping drug better/);
    expect(info.analysis).toMatch(/^Confirmed analysis, version 1: /);
    expect(info.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(info.methods.some((m) => /^Step 5 \(plot_groups\)/.test(m))).toBe(true);
  });

  it("lays out 1, 2, 4, 6 or 9 images on each page", () => {
    expect([1, 2, 4, 6, 9].map((n) => gridOf(n as 1, true))).toEqual([[1, 1], [2, 1], [2, 2], [3, 2], [3, 3]]);
    expect([1, 2, 4, 6, 9].map((n) => gridOf(n as 1, false))).toEqual([[1, 1], [1, 2], [2, 2], [2, 3], [3, 3]]);
    for (const per of [1, 2, 4, 6, 9] as const)
      for (const size of ["16:9", "a4", "letter"] as const) {
        const c = cells(size, per);
        expect(c).toHaveLength(per);
        for (const { img, cap } of c) expect(img[1] + img[3]).toBeLessThan(cap[1]);
      }
    const { r, out } = session();
    const all = collectImages(r, out, { images: "all", order: "step" });
    const info = deckInfo(r, [], out);
    const pages = buildPages(all, info, "a4", 4);
    expect(pages).toHaveLength(1 + 2 + 1);
    expect(pages.map((p) => p.images.length)).toEqual([0, 4, 1, 0]);
    expect(pages[1]!.notes!.split("\n\n")).toHaveLength(4);
    expect(buildPages(all, info, "16:9", 1)).toHaveLength(7);
    expect(buildPages(all, info, "16:9", 9)).toHaveLength(3);
  });

  it.skipIf(!HAS_PPTX)("writes a PPTX with one image part for each image and the captions as text", async () => {
    const { r, out } = session();
    const w = await writeImageDeck({ record: r, adapters: [], dir: out, options: { formats: ["pptx"], images: "all", order: "step", perPage: 1 } });
    expect(w.pptx).toBe(join(out, "images.pptx"));
    expect(w.slides).toBe(7);
    const z = unzip(readFileSync(w.pptx!));
    const slides = [...z.keys()].filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k));
    const media = [...z.keys()].filter((k) => k.startsWith("ppt/media/"));
    expect(slides).toHaveLength(7);
    expect(media).toHaveLength(5);
    const xml = (n: number) => z.get(`ppt/slides/slide${n}.xml`)!.toString("utf8");
    expect(xml(1)).toContain("Is one sleeping drug better");
    expect(xml(4)).toContain("Error bars: 95% confidence interval");
    expect(xml(4)).toContain("<p:pic>");
    expect(xml(7)).toContain("SHA-256");
    const pres = z.get("ppt/presentation.xml")!.toString("utf8");
    expect(pres).toContain(`cx="${Math.trunc(338.667 * 36000)}"`);
    const sizes = spawnSync(scriptPython(), ["-I", "-c", "import sys\nfrom pptx import Presentation\np=Presentation(sys.argv[1])\ns=p.slides[3]\nprint([round(x.width/x.height,2) for x in s.shapes if x.shape_type==13])", w.pptx!], { encoding: "utf8" });
    expect(sizes.stdout.trim()).toBe("[2.0]");
    const s = writeResults({ record: r, adapters: [], fields: [], programs: [], dir: out, xlsx: true });
    expect(savedLine(s, "")).toContain("images.pptx");
    const files = buildWorkbook({ record: r, adapters: [], fields: [], programs: [], dir: out, figures: [] }).find((x) => x.name === "Files")!;
    expect(files.rows).toContainEqual(["", "image deck", "images.pptx", ""]);
  }, 120000);

  it.skipIf(!findChrome())("writes a PDF with a title page, the image pages and a last page", async () => {
    const { r, out } = session();
    const w = await writeImageDeck({ record: r, adapters: [], dir: out, options: { formats: ["pdf"], images: "qc", order: "group", perPage: 2, size: "letter" } });
    expect(w.pdf).toBe(join(out, "images.pdf"));
    expect(w.images).toBe(3);
    expect(pdfPages(w.pdf!)).toBe(1 + 2 + 1);
    expect(w.pages).toBe(4);
  }, 120000);
});
