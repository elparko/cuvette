import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { findAdapter } from "../src/adapters/manifest.ts";
import {
  allRefs, authorYear, citeText, cuvetteRef, formatRef, Markers, parseBibtex, people, refOf, sessionCitations, toBibtex, toRis, toolCitations,
} from "../src/core/citations.ts";
import { buildDatabook } from "../src/core/databook.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { referenceSheet, writeResults } from "../src/core/results.ts";
import { exportProtocol } from "../src/core/exports.ts";
import { exportHtml } from "../src/core/trail.ts";
import type { NodeIn } from "../src/core/types.ts";
import { citeCommand } from "../src/ui/commands.ts";
import { citeHtml, doctorHtml, programsHtml } from "../src/server/app-html.ts";
import { listPrograms } from "../src/core/programs.ts";
import { Manifest } from "../src/adapters/manifest.ts";
import { doctorText, type Check } from "../src/core/doctor.ts";
import type { SessionLike } from "../src/ui/types.ts";

const LOVE = `@article{love2014moderated,
  author  = {Love, Michael I. and Huber, Wolfgang and Anders, Simon},
  title   = {Moderated estimation of fold change and dispersion for {RNA-seq} data with {DESeq2}},
  journal = {Genome Biology},
  year    = {2014},
  volume  = {15},
  number  = {12},
  pages   = {550},
  doi     = {10.1186/s13059-014-0550-8}
}`;

const love = () => refOf({ text: "Love 2014", doi: "10.1186/s13059-014-0550-8", url: "", bibtex: LOVE, kind: "program", when: {} }, "DESeq2", "deseq2");

describe("BibTeX reading", () => {
  test("fields, braces, accents and the author list", () => {
    const [b] = parseBibtex(`@article{x, author = {M{\\"a}chler, Martin and Ba{\\~n}os, Hector and {1000 Genomes Consortium} and others}, title = "A {DNA} test", year = 2015, pages = {1--48}}`);
    expect(b!.type).toBe("article");
    expect(b!.fields.year).toBe("2015");
    expect(b!.fields.title).toBe("A {DNA} test");
    const p = people(b!.fields.author);
    expect(p.map((x) => x.family)).toEqual(["Mächler", "Baños", "1000 Genomes Consortium", "others"]);
    expect(p[2]!.literal).toBe(true);
    expect(people("Jui-Cheng Yen and van Eck, N. J.")).toEqual([{ family: "Yen", given: "Jui-Cheng" }, { family: "van Eck", given: "N. J." }]);
  });
});

describe("formatting", () => {
  test("APA: authors with initials, year, title, journal, volume(issue), pages, DOI link", () => {
    expect(formatRef(love(), "apa")).toBe("Love, M. I., Huber, W., & Anders, S. (2014). Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biology, 15(12), 550. https://doi.org/10.1186/s13059-014-0550-8");
  });
  test("Vancouver: family name and initials without dots, year;volume(issue):pages, doi", () => {
    expect(formatRef(love(), "vancouver")).toBe("Love MI, Huber W, Anders S. Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biology. 2014;15(12):550. doi:10.1186/s13059-014-0550-8");
  });
  test("Vancouver lists six authors, then et al; APA ends an incomplete list with et al.", () => {
    const many = `@article{z, author = {A, Aa and B, Bb and C, Cc and D, Dd and E, Ee and F, Ff and G, Gg}, title = {T}, journal = {J}, year = {2020}, volume = {1}, pages = {1--2}}`;
    const r = refOf({ text: "x", doi: "10.1/z", url: "", bibtex: many, kind: "method", when: {} });
    expect(formatRef(r, "vancouver")).toMatch(/^A A, B B, C C, D D, E E, F F, et al\. T\. J\. 2020;1:1-2\. doi:10\.1\/z$/);
    const some = refOf({ text: "x", doi: "", url: "", bibtex: "@article{o, author = {Ab, Cd and others}, title = {T}, journal = {J}, year = {2001}}", kind: "method", when: {} });
    expect(formatRef(some, "apa")).toMatch(/^Ab, C\., et al\. \(2001\)\. T\. J\.$/);
    expect(authorYear(some)).toBe("Ab et al., 2001");
  });
  test("APA for software and proceedings; a citation with text only keeps the text", () => {
    expect(formatRef(cuvetteRef("0.1.0"), "apa")).toMatch(/^Smith, P\. \(\d{4}\)\. Cuvette \(Version 0\.1\.0\) \[Computer software\]\./);
    const proc = refOf({ text: "x", doi: "10.25080/Majora-92bf1922-011", url: "", bibtex: "@inproceedings{s, author = {Seabold, Skipper and Perktold, Josef}, title = {Statsmodels}, booktitle = {Proceedings of the 9th Python in Science Conference}, year = {2010}, pages = {92--96}}", kind: "program", when: {} });
    expect(formatRef(proc, "apa")).toBe("Seabold, S., & Perktold, J. (2010). Statsmodels. In Proceedings of the 9th Python in Science Conference (pp. 92–96). https://doi.org/10.25080/Majora-92bf1922-011");
    const plain = refOf({ text: "Andrews, S. (2010). FastQC.", doi: "", url: "https://example.org/fastqc", bibtex: "", kind: "program", when: {} });
    expect(formatRef(plain, "apa")).toBe("Andrews, S. (2010). FastQC. https://example.org/fastqc");
    expect(formatRef(plain, "vancouver")).toBe("Andrews, S. (2010). FastQC. Available from: https://example.org/fastqc");
    expect(authorYear(plain)).toBe("Andrews, 2010");
  });
  test("markers: numbers in order of first citation for Vancouver, author and year for APA", () => {
    const a = love();
    const b = cuvetteRef("0.1.0");
    const v = new Markers("vancouver");
    expect(v.cite([b])).toBe(" [1]");
    expect(v.cite([a, b])).toBe(" [1, 2]");
    expect(v.list([a, b]).map((r) => r.program)).toEqual(["Cuvette", "DESeq2"]);
    expect(new Markers("apa").cite([a])).toBe(" (Love et al., 2014)");
  });
});

describe("BibTeX and RIS output", () => {
  test("BibTeX keeps the entry of the adapter with the session key and makes a misc entry for a text-only citation", () => {
    const a = love();
    a.key = "love2014moderated";
    const t = refOf({ text: "Doe, J. (2020). Tool.", doi: "10.1/tool", url: "", bibtex: "", kind: "program", when: {} });
    const bib = toBibtex([a, t]);
    expect(bib).toContain("@article{love2014moderated,\n  author  = {Love, Michael I. and Huber, Wolfgang and Anders, Simon},");
    expect(bib).toMatch(/@misc\{doe2020tool,\n {2}title = \{Doe, J\. \(2020\)\. Tool\.\},\n {2}doi {3}= \{10\.1\/tool\}/);
    expect(parseBibtex(bib)).toHaveLength(2);
  });
  test("RIS has one record for each reference, with type, authors, journal, year, pages and DOI", () => {
    const ris = toRis([love()]);
    expect(ris.split("\n")).toEqual(expect.arrayContaining(["TY  - JOUR", "AU  - Love, Michael I.", "AU  - Anders, Simon", "JO  - Genome Biology", "PY  - 2014", "VL  - 15", "IS  - 12", "SP  - 550", "DO  - 10.1186/s13059-014-0550-8", "ER  - "]));
    expect(ris.split("\n").filter((l) => l.startsWith("TI  - "))).toEqual(["TI  - Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2"]);
  });
});

function node(over: Partial<NodeIn>): NodeIn {
  return {
    entry: 1, adapter: "biostats", adapterVersion: "0.1.1", programVersion: "0.15.0", tool: "adjust_pvalues", args: {}, decisions: {}, codeHash: "", inputHashes: [],
    outputs: [], result: { ok: true }, parents: [], summary: "", model: "fake", manualRoute: "", fidelity: "exact", ...over,
  };
}

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-cite-"));
  const record = new AnalysisRecord(join(dir, "session"), "s-cite");
  const biostats = findAdapter("biostats");
  const lme4 = findAdapter("lme4");
  record.append("adapter", { name: "biostats", program: biostats.manifest.program.name, version: "0.1.1" });
  record.append("adapter", { name: "lme4", program: "lme4", version: "0.1.0" });
  const n1 = record.addNode(node({ tool: "adjust_pvalues", args: { pvalues: [0.01, 0.04], method: "fdr_bh" } }));
  record.addNode(node({ tool: "adjust_pvalues", args: { pvalues: [0.01, 0.04], method: "holm" }, parents: [n1.id], sensitivityOf: "p_adjust_method" }));
  record.addNode(node({ tool: "fit_cox", args: { path: "/d/s.csv", duration: "t", event: "e" } }));
  record.addNode(node({ tool: "anova_oneway", args: { path: "/d/a.csv", outcome: "y", group: "g", posthoc: "tukey" }, decisions: { posthoc: "tukey" } }));
  record.markStale("posthoc", "posthoc changed");
  return { dir, record, adapters: [biostats, lme4] };
}

describe("which citations apply", () => {
  test("when filters read the arguments, then the linked decision, then the parameter default", () => {
    const a = findAdapter("biostats");
    const text = (args: Record<string, unknown>, decisions: Record<string, unknown> = {}) => toolCitations(a, "adjust_pvalues", args, decisions).map((c) => c.text.slice(0, 12));
    expect(text({ method: "fdr_bh" })).toEqual(["Benjamini, Y"]);
    expect(text({}, { p_adjust_method: "fdr_by" })).toEqual(["Benjamini, Y"]);
    expect(text({})).toEqual(["Holm, S. (19"]);
    expect(text({ method: "bonferroni" })).toEqual([]);
    const ij = findAdapter("imagej");
    const rolling = (r: number) => toolCitations(ij, "threshold_and_count", { method: "Otsu", rolling_radius: r }).map((c) => c.text.split(",")[0]);
    expect(rolling(0)).toEqual(["Otsu"]);
    expect(rolling(50)).toEqual(["Otsu", "Sternberg"]);
  });

  test("a session cites the programs and methods that ran; comparison-only and out-of-date methods are listed apart", () => {
    const { record, adapters } = fixture();
    const c = sessionCitations(record, adapters);
    const names = (refs: typeof c.used) => refs.map((r) => authorYear(r));
    expect(names(c.used)).toEqual([
      "Seabold & Perktold, 2010", "Vallat, 2018", "Davidson-Pilon, 2019", "Smith, 2026",
      "Benjamini & Hochberg, 1995", "Cox, 1972", "Efron, 1977", "Grambsch & Therneau, 1994",
    ]);
    expect(names(c.comparison)).toEqual(["Holm, 1979"]);
    expect(names(c.outOfDate)).toEqual(["Tukey, 1949"]);
    expect(c.notRun).toEqual(["lme4"]);
    expect(c.used.find((r) => r.doi === "10.1111/j.2517-6161.1995.tb02031.x")!.tools).toEqual(["adjust_pvalues"]);
    expect(allRefs(c).every((r) => r.doi || r.url)).toBe(true);
    expect(new Set(allRefs(c).map((r) => r.key)).size).toBe(allRefs(c).length);
  });

  test("a method used in the main run and in a comparison is cited once, as used", () => {
    const { record, adapters } = fixture();
    record.addNode(node({ tool: "adjust_pvalues", args: { pvalues: [0.2], method: "holm" } }));
    const c = sessionCitations(record, adapters);
    expect(c.comparison).toEqual([]);
    expect(c.used.some((r) => authorYear(r) === "Holm, 1979")).toBe(true);
  });
});

describe("outputs", () => {
  const fake = (record: AnalysisRecord, adapters: ReturnType<typeof fixture>["adapters"], dir: string, style: "apa" | "vancouver" = "apa") =>
    ({ record, adapters, outputDir: dir, workDir: dir, cwd: dir, citationStyle: () => style }) as unknown as SessionLike;

  test("/cite lists the session, saves BibTeX, RIS and a text list, and shows how to cite each program", async () => {
    const { dir, record, adapters } = fixture();
    const text = await citeCommand([], fake(record, adapters, dir));
    expect(text).toMatch(/^Cite these in your methods:\n\n- Benjamini, Y\., & Hochberg, Y\. \(1995\)/);
    expect(text).toContain("   For: method, adjust_pvalues (step 1)");
    expect(text).toContain("   For: statsmodels, pingouin, lifelines (step 1, comparison run, step 2, step 3)");
    expect(text).toContain("Used in a comparison only. Cite these only if you report the comparison:\n\n- Holm, S. (1979).");
    expect(text).toContain("Loaded, but no step ran: lme4. These are not cited.");
    const v = await citeCommand(["vancouver"], fake(record, adapters, dir));
    expect(v).toMatch(/^Cite these in your methods:\n\n1\. Seabold S, Perktold J\. Statsmodels/);
    expect(v).toMatch(/\n9\. Holm S\. A Simple Sequentially Rejective Multiple Test Procedure\. Scandinavian Journal of Statistics\. 1979;6\(2\):65-70\. Available from: https:\/\/www\.jstor\.org\/stable\/4615733/);
    expect(await citeCommand(["bibtex"], fake(record, adapters, dir))).toBe(`Saved 10 references: ${join(dir, "references.bib")}`);
    expect(parseBibtex(readFileSync(join(dir, "references.bib"), "utf8")).map((b) => b.key)).toContain("benjamini1995controlling");
    await citeCommand(["ris"], fake(record, adapters, dir));
    expect(readFileSync(join(dir, "references.ris"), "utf8").match(/^TY {2}- /gm)).toHaveLength(10);
    await citeCommand(["text", "vancouver"], fake(record, adapters, dir));
    expect(readFileSync(join(dir, "references.txt"), "utf8")).toMatch(/^References\n\n1\. Seabold S/);
    const progs = await citeCommand(["programs", "deseq2"], fake(record, adapters, dir));
    expect(progs).toBe("DESeq2 (deseq2)\n  Love, M. I., Huber, W., & Anders, S. (2014). Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biology, 15(12), 550. https://doi.org/10.1186/s13059-014-0550-8");
    await expect(citeCommand(["nonsense"], fake(record, adapters, dir))).rejects.toThrow(/Use: \/cite/);
  });

  test("results.xlsx has a References sheet and the output folder gets references.bib", () => {
    const { dir, record, adapters } = fixture();
    const sheet = referenceSheet(record, adapters, "vancouver");
    expect(sheet.columns).toEqual(["Number", "Reference", "Kind", "Used for", "Steps", "Status", "DOI", "URL", "BibTeX key"]);
    const bh = sheet.rows.find((r) => r[6] === "10.1111/j.2517-6161.1995.tb02031.x")!;
    expect(bh.slice(2, 6)).toEqual(["method", "adjust_pvalues", "step 1", "used"]);
    expect(String(bh[1])).toMatch(/^Benjamini Y, Hochberg Y\./);
    expect(sheet.rows.find((r) => String(r[1]).startsWith("Holm"))![5]).toBe("used in a comparison");
    expect(sheet.rows.find((r) => String(r[1]).startsWith("Tukey"))![5]).toBe("used only in steps that are out of date");
    const out = join(dir, "out");
    writeResults({ record, adapters, fields: [], programs: [], dir: out, xlsx: true });
    const bib = readFileSync(join(out, "references.bib"), "utf8");
    expect(bib).toMatch(/% Used\n\n@inproceedings\{seabold2010statsmodels,/);
    expect(bib).toMatch(/% Used in a comparison only\n\n@article\{holm1979simple,/);
  });

  test("a session with no program step writes no references.bib", () => {
    const dir = mkdtempSync(join(tmpdir(), "cuvette-cite-"));
    const record = new AnalysisRecord(join(dir, "session"), "s-none");
    writeResults({ record, adapters: [], fields: [], programs: [], dir: join(dir, "out"), xlsx: false });
    expect(existsSync(join(dir, "out", "references.bib"))).toBe(false);
  });

  test("the data book cites each program and method inline with markers that match the References list", () => {
    const { record } = fixture();
    const html = buildDatabook({ records: [record], project: "/p", paper: "a4", date: "2026-10-08", citationStyle: "vancouver" }).html;
    const methods = /<p class="methods">([^<]*)<\/p>/.exec(html)![1]!;
    expect(methods).toMatch(/^The analysis used statsmodels, pingouin, lifelines version [^[]* \[1, 2, 3\]\./);
    expect(methods).toMatch(/Cuvette [\d.]+ \[4\] kept the record|Cuvette [\d.]+ \[4\] ran the program steps/);
    expect(methods).toMatch(/Step 1 \(adjust_pvalues\): [^.]*\[5\]\./);
    expect(methods).toMatch(/Step 2 \(fit_cox\): [^.]*\[6, 7, 8\]\./);
    expect(methods).not.toMatch(/Step 3 \(anova_oneway\): [^.]*\[/);
    const refs = html.slice(html.indexOf(" References</h2>"));
    const items = [...refs.matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]!);
    expect(items[0]).toMatch(/^Seabold S, Perktold J\./);
    expect(items[3]).toMatch(/^Smith P\. Cuvette/);
    expect(items[4]).toMatch(/^Benjamini Y, Hochberg Y\./);
    expect(refs).toMatch(/<h3>Used in a comparison<\/h3>[\s\S]*<ol class="refs" start="9"><li>Holm S\./);
    expect(refs).toMatch(/<h3>Used only in steps that are out of date<\/h3>[\s\S]*<li>Tukey JW\./);
    const apa = buildDatabook({ records: [record], project: "/p", paper: "a4", date: "2026-10-08", citationStyle: "apa" }).html;
    expect(/<p class="methods">([^<]*)<\/p>/.exec(apa)![1]).toMatch(/Step 1 \(adjust_pvalues\): [^.]*\(Benjamini &amp; Hochberg, 1995\)\./);
  });

  test("the HTML report and the protocol carry the references", () => {
    const { dir, record, adapters } = fixture();
    const html = readFileSync(exportHtml(record, adapters, join(dir, "index.html"), "vancouver"), "utf8");
    expect(html).toMatch(/<section id="cite"><h2 id="references">References<\/h2>/);
    expect(html).toContain('<a href="https://doi.org/10.1111/j.2517-6161.1995.tb02031.x">');
    const md = readFileSync(exportProtocol(record, adapters, join(dir, "protocol.md"), "vancouver"), "utf8");
    expect(md).toMatch(/Data were analyzed in statsmodels, pingouin, lifelines 0\.15\.0 \[1, 2, 3\]\. Cuvette \[4\] ran the steps/);
    expect(md).toMatch(/## References\n\n1\. Seabold S, Perktold J/);
    expect(md).toContain("### Used in a comparison");
  });

  test("citeText names the style and the save commands", () => {
    const { record, adapters } = fixture();
    expect(citeText(sessionCitations(record, adapters), "apa")).toMatch(/Style: APA\. Change it: \/cite vancouver/);
  });

  test("the app shows the Cite section in the Results tab and a How to cite line for each program; the terminal shows the same", async () => {
    const { dir, record, adapters } = fixture();
    const html = citeHtml({ session: fake(record, adapters, dir, "vancouver") } as never);
    expect(html).toMatch(/^<h4 id="cite">Cite<\/h4>/);
    expect(html).toMatch(/<ol class="refs"><li>Seabold S, Perktold J\./);
    expect(html).toContain('data-command="/cite bibtex"');
    expect(html).toMatch(/<strong>Used in a comparison\.<\/strong>[\s\S]*start="9"><li>Holm S\./);
    const check: Check = { id: "program:deseq2", group: "Programs", name: "deseq2", status: "ok", detail: "DESeq2 1.52.0", cite: "Love, M. I., Huber, W., & Anders, S. (2014)." };
    expect(doctorHtml([check], true, [check])).toContain("How to cite: Love, M. I., Huber, W., &amp; Anders, S. (2014).");
    expect(doctorText([check])).toContain("           How to cite: Love, M. I., Huber, W., & Anders, S. (2014).");
  });

  test("the Programs page shows How to cite for each program", async () => {
    const home = mkdtempSync(join(tmpdir(), "cuvette-cite-home-"));
    const m = Manifest.parse({ adapter: { name: "deseq2", field: "genomics" }, program: { name: "DESeq2", citation: findAdapter("deseq2").manifest.program.citation }, connection: { kind: "cli" }, locate: { which: ["Rscript"] } });
    const rows = await listPrograms({
      home, env: {}, adapters: { deseq2: { manifest: m, root: "/x/deseq2" } },
      locate: async () => ({ version: "", how: "not found" }), run: async () => ({ code: 0, stdout: "", stderr: "" }), find: () => undefined, size: async () => 0, lastUsed: () => new Map(),
    } as never);
    expect(rows[0]!.cite).toMatch(/^Love, M\. I\., Huber, W\., & Anders, S\. \(2014\)/);
    expect(programsHtml(rows)).toContain('<div class="pcite small dim">How to cite: Love, M. I., Huber, W., &amp; Anders, S. (2014).');
  });
});
