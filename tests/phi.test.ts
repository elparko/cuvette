import { closeSync, existsSync, mkdtempSync, openSync, readdirSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { folderHasNoPatientData, groupHits, isCloud, isLocal, localUrl, maskShown, Masker, scanContent, scanMessages, scanTable, scanText, setFolderNoPatientData, shownHits, type PhiAction } from "../src/core/phi.ts";
import { Session } from "../src/core/session.ts";
import type { Message, PhiEvent } from "../src/core/types.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { WebView } from "../src/server/app-view.ts";
import { runTui } from "../src/tui/app.tsx";
import { makeHarness, sleep, until } from "../src/tui/testing.ts";
import { cardFromEvent, closesCard, phiView, type Card } from "../src/ui/cards.ts";
import { FakeSession } from "../src/ui/fake-session.ts";

beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-phi-"));
});

const kinds = (text: string) => scanContent(text, "x").map((h) => h.kind).sort();

const CLINIC_CSV = `patient_name,mrn,dob,sex,admit_date,troponin_ng_l,zip
John Doe,00123456,03/14/1956,M,2024-01-02,54,71103
Mary Smith,00123457,1961-07-30,F,2024-01-03,12,71104
Robert Brown,00123458,11/02/1948,M,2024-01-05,230,71105
`;

const NOTES = `Patient: Jane Q. Roe
DOB: 04/21/1972  MRN: 4482910
Mr. Alvarez was admitted for chest pain.
Contact the patient at (318) 555-0142 or jroe@mail.com.
SSN 123-45-6789 on file.
Home: 1501 Kings Highway, Shreveport, LA 71103
John Smith is a 67-year-old man with HFrEF.
Zip code 71106, visit 2024-03-01.
`;

test("a synthetic clinical table triggers on every identifier column", () => {
  const hits = scanContent(CLINIC_CSV, "visits.csv");
  const cols = new Set(hits.map((h) => h.column));
  expect(cols).toEqual(new Set(["patient_name", "mrn", "dob", "zip"]));
  const name = hits.find((h) => h.value === "John Doe")!;
  expect(name).toMatchObject({ kind: "name", where: "visits.csv", column: "patient_name", line: 2 });
  expect(hits.find((h) => h.value === "Robert Brown")!.line).toBe(4);
  expect(hits.some((h) => h.column === "troponin_ng_l" || h.column === "sex")).toBe(false);
});

test("free-text clinical notes trigger each pattern", () => {
  const hits = scanText(NOTES, "notes.txt");
  const by = (k: string) => hits.filter((h) => h.kind === k).map((h) => h.value);
  expect(by("name")).toEqual(expect.arrayContaining(["Jane Q. Roe", "Alvarez", "John Smith"]));
  expect(by("birth_date")).toEqual(["04/21/1972"]);
  expect(by("mrn")).toEqual(["4482910"]);
  expect(by("phone")).toEqual(["(318) 555-0142"]);
  expect(by("email")).toEqual(["jroe@mail.com"]);
  expect(by("ssn")).toEqual(["123-45-6789"]);
  expect(by("address")).toEqual(expect.arrayContaining(["1501 Kings Highway", "Shreveport, LA 71103"]));
  expect(by("zip")).toEqual(["71106"]);
  expect(hits.find((h) => h.value === "4482910")!.line).toBe(2);
});

test("other identifier column names trigger with values that fit", () => {
  const rows = [["Doe, John", "555-12-3456", "jd@x.org", "318-555-0100", "12 Oak Street"], ["Roe, Jane", "555-12-3457", "jr@x.org", "318-555-0101", "9 Elm Ave"]];
  const hits = scanTable(["Patient", "SSN", "Email", "Phone", "Home address"], rows, "t.csv");
  expect(new Set(hits.map((h) => h.kind))).toEqual(new Set(["name", "ssn", "email", "phone", "address"]));
  expect(hits[0]).toMatchObject({ row: 1 });
});

test("a JSON tool result with a table preview triggers", () => {
  const json = JSON.stringify({ ok: true, table: { columns: ["First name", "Last name", "Hb"], rows: [["Ann", "Lee", 12.1], ["Bob", "Cruz", 13.4]] } });
  expect(kinds(json)).toEqual(["name", "name", "name", "name"]);
});

test("research tables and text do not trigger", () => {
  const research = `subject_id,patient,group,age,sex,visit_date,crp,cell_count,name
P001,1,placebo,54,F,2021-03-02,3.1,120,TP53
P002,2,vitamin D,61,M,2021-03-04,2.2,98,BRCA1
P003,3,placebo,47,F,2021-03-09,4.0,110,EGFR
`;
  expect(kinds(research)).toEqual([]);
  const compounds = "Compound ID,Name,measured log solubility\nAmigdalin,Amigdalin,-0.77\nFenfuram,Fenfuram,-3.3\ncitral,Citral,-2.06\n";
  expect(kinds(compounds)).toEqual([]);
  const text = [
    "The Patient Health Questionnaire (PHQ-9) score fell by 3 points.",
    "Kaplan Meier curves show survival; Mann Whitney U test p = 0.03.",
    "Samples were run on 2019-05-12 at 310 nm; accession GSE123456.",
    "Contact: Josef Spidlen <jspidlen@bccrc.ca>",
    "Send email to help@lab.org for questions.",
    "Western Blot was performed on day 3.",
    "Plate A01 well address B12, 96-well format, 1000 cells per well.",
    "Values: 212 555 1234 3.14 2.71",
  ].join("\n");
  expect(kinds(text)).toEqual([]);
});

test("masked values in the card keep the first letter of each word", () => {
  expect(maskShown("John Doe")).toBe("J*** D**");
  expect(maskShown("123-45-6789")).toBe("1**-**-****");
  const shown = shownHits(scanContent(CLINIC_CSV, "visits.csv")).find((h) => h.kind === "name")!;
  expect(shown).toEqual({ kind: "name", label: "Name", masked: "J*** D**", where: "visits.csv, column patient_name, line 2" });
  expect(groupHits(scanText(NOTES, "notes.txt")).find((h) => h.kind === "name")).toEqual({ kind: "name", label: "Name", masked: "J*** Q. R**, A****** and 1 more", where: "notes.txt, lines 1 to 7" });
});

test("the masker replaces each value with the same placeholder", () => {
  const m = new Masker();
  m.add(scanContent(CLINIC_CSV, "visits.csv"));
  const out = m.text(CLINIC_CSV + "\nJohn Doe again; not John Doeson.");
  expect(out).not.toContain("John Doe,");
  expect(out).toContain("[NAME 1],[MRN 1],[DATE OF BIRTH 1]");
  expect(out).toContain("[NAME 1] again; not John Doeson.");
  expect(out).toContain("54,[ZIP 1]");
});

test("scanMessages names the file from the tool call", () => {
  const msgs: Message[] = [
    { role: "assistant", parts: [{ type: "tool_call", id: "c1", name: "read_file", args: { path: "/data/visits.csv" } }] },
    { role: "user", parts: [{ type: "tool_result", callId: "c1", name: "read_file", text: CLINIC_CSV }] },
  ];
  const hits = scanMessages(msgs.slice(1), msgs);
  expect(hits[0]!.where).toBe("/data/visits.csv");
  expect(scanMessages([{ role: "user", parts: [{ type: "text", text: "Patient: John Doe, DOB 1/2/1950" }] }], [])[0]!.where).toBe("your message");
});

test("cloud and local models", () => {
  expect(isCloud({ provider: "claude" })).toBe(true);
  expect(isCloud({ provider: "ollama" })).toBe(false);
  expect(isLocal({ provider: "ollama" })).toBe(true);
  expect(isCloud({ provider: "openai", local: false })).toBe(true);
  expect(isCloud({ provider: "fake" })).toBe(false);
  expect(localUrl("http://localhost:1234/v1")).toBe(true);
  expect(localUrl("https://api.example.com/v1")).toBe(false);
});

test("the folder answer is kept in the user settings", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-folder-"));
  expect(folderHasNoPatientData(dir)).toBe(false);
  setFolderNoPatientData(dir, true);
  expect(folderHasNoPatientData(dir)).toBe(true);
  expect(JSON.parse(readFileSync(join(process.env.CUVETTE_HOME!, "settings.json"), "utf8")).no_patient_data_folders).toHaveLength(1);
  setFolderNoPatientData(dir, false);
  expect(folderHasNoPatientData(dir)).toBe(false);
});

async function clinicSession(opts: { local?: boolean; settings?: Record<string, unknown>; action?: PhiAction } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-phi-proj-"));
  const file = join(cwd, "visits.csv");
  writeFileSync(file, CLINIC_CSV);
  const provider = new FakeProvider([{ calls: [{ name: "read_file", args: { path: file } }] }, { text: "Three visits." }, { text: "Three visits." }]);
  provider.info.local = opts.local ?? false;
  const session = await Session.create({ adapters: [], provider, cwd, settings: opts.settings as never });
  session.decisions.applySetup({});
  const cards: PhiEvent[] = [];
  session.bus.on((e) => {
    if (e.type !== "phi") return;
    cards.push(e);
    if (opts.action) setTimeout(() => session.respondPhi(e.rid, opts.action!), 0);
  });
  return { session, provider, file, cards };
}

const sentText = (p: FakeProvider) => JSON.stringify(p.requests.at(-1)!.messages);

test("mask: the model sees placeholders, the file does not change, and the record logs the choice", async () => {
  const { session, provider, file, cards } = await clinicSession({ action: "mask" });
  await session.send("Summarize visits.csv");
  expect(cards).toHaveLength(1);
  expect(cards[0]!.hits).toContainEqual({ kind: "name", label: "Name", masked: "J*** D**, M*** S**** and 1 more", where: `${file}, column patient_name, lines 2 to 4` });
  expect(cards[0]!.hits.map((h) => h.kind)).toEqual(["name", "mrn", "birth_date", "zip"]);
  expect(provider.requests).toHaveLength(2);
  const sent = sentText(provider);
  expect(sent).toContain("[NAME 1],[MRN 1],[DATE OF BIRTH 1]");
  expect(sent).not.toContain("John Doe");
  expect(sent).not.toContain("00123456");
  expect(readFileSync(file, "utf8")).toBe(CLINIC_CSV);
  const phi = session.record.entries(["phi"]);
  expect(phi).toHaveLength(1);
  expect(phi[0]!.data).toMatchObject({ rid: cards[0]!.rid, action: "mask", by: "scientist" });
  expect(JSON.stringify(phi[0]!.data)).not.toContain("John Doe");
  await session.close();
});

test("send anyway: the model sees the values and the record logs the choice", async () => {
  const { session, provider, cards } = await clinicSession({ action: "send" });
  await session.send("Summarize visits.csv");
  expect(cards).toHaveLength(1);
  expect(sentText(provider)).toContain("John Doe");
  expect(session.record.entries(["phi"])[0]!.data).toMatchObject({ action: "send", by: "scientist" });
  await session.close();
});

test("stop: nothing goes to the model, and a later turn sends a placeholder text", async () => {
  const { session, provider } = await clinicSession({ action: "stop" });
  expect(await session.send("Summarize visits.csv")).toBe("");
  expect(provider.requests).toHaveLength(1);
  expect(session.record.entries(["phi"])[0]!.data.action).toBe("stop");
  expect(session.record.entries(["notice"]).some((e) => /Nothing was sent/.test(String(e.data.text)))).toBe(true);
  await session.send("Go on without the file.");
  const sent = sentText(provider);
  expect(sent).not.toContain("John Doe");
  expect(sent).toContain("Not sent to the model");
  await session.close();
});

afterEach(() => vi.unstubAllGlobals());

test("use a local model: the session changes to the configured local model", async () => {
  vi.stubGlobal("fetch", async () => new Response('{"error":"no model"}', { status: 400 }));
  const { session, cards } = await clinicSession({ action: "local", settings: { local_model: "openai:http://127.0.0.1:9/v1|local-test" } });
  await session.send("Summarize visits.csv");
  expect(cards[0]!.local).toBe("openai:http://127.0.0.1:9/v1|local-test");
  expect(session.model).toMatchObject({ provider: "openai", model: "local-test", local: true });
  expect(session.record.entries(["setting"]).at(-1)!.data).toMatchObject({ name: "model", new: "openai:http://127.0.0.1:9/v1|local-test", reason: "patient data card" });
  expect(session.record.entries(["phi"])[0]!.data.action).toBe("local");
  await session.close();
});

test("without a local model the card does not offer one", async () => {
  const { session, cards } = await clinicSession({ action: "mask" });
  await session.send("Summarize visits.csv");
  expect(cards[0]!.local).toBeUndefined();
  const v = phiView(cardFromEvent(cards[0]!) as Extract<Card, { t: "phi" }>);
  expect(v.actions.map((a) => a.act)).toEqual(["send", "mask", "stop"]);
  expect(v.noLocal).toMatch(/local_model/);
  await session.close();
});

test("a local model skips the card and logs a notice", async () => {
  const { session, provider, cards } = await clinicSession({ local: true });
  await session.send("Summarize visits.csv");
  expect(cards).toHaveLength(0);
  expect(sentText(provider)).toContain("John Doe");
  expect(session.record.entries(["phi"])[0]!.data).toMatchObject({ action: "local model", by: "harness" });
  expect(session.record.entries(["notice"]).some((e) => /local model fake/.test(String(e.data.text)))).toBe(true);
  await session.close();
});

test("phi_check off and a folder with no patient data skip the card", async () => {
  const off = await clinicSession({ settings: { phi_check: "off" } });
  await off.session.send("Summarize visits.csv");
  expect(off.cards).toHaveLength(0);
  expect(off.session.record.entries(["notice"]).some((e) => /check is off \(the phi_check setting\)/.test(String(e.data.text)))).toBe(true);
  await off.session.close();
  const folder = await clinicSession();
  setFolderNoPatientData(folder.session.cwd, true);
  await folder.session.send("Summarize visits.csv");
  expect(folder.cards).toHaveLength(0);
  expect(folder.session.record.entries(["notice"]).some((e) => /no patient data/.test(String(e.data.text)))).toBe(true);
  await folder.session.close();
});

test("a headless run masks with no card", async () => {
  const { session, provider, cards } = await clinicSession({ settings: { headless: true } });
  await session.send("Summarize visits.csv");
  expect(cards).toHaveLength(0);
  expect(sentText(provider)).not.toContain("John Doe");
  expect(session.record.entries(["phi"])[0]!.data).toMatchObject({ action: "mask" });
  await session.close();
});

test("the choice holds for later content in the session", async () => {
  const { session, provider, file, cards } = await clinicSession({ action: "mask" });
  await session.send("Summarize visits.csv");
  provider.requests.length = 0;
  (provider as unknown as { steps: unknown[]; index: number }).steps = [{ calls: [{ name: "read_file", args: { path: file } }] }, { text: "Again." }, { text: "Again." }];
  (provider as unknown as { index: number }).index = 0;
  await session.send("Read it again");
  expect(cards).toHaveLength(1);
  expect(sentText(provider)).not.toContain("Mary Smith");
  expect(session.record.entries(["phi"]).at(-1)!.data.by).toBe("your earlier choice in this session");
  await session.close();
});

test("the card in both views: masked values, where, and the four actions", async () => {
  const ev: PhiEvent = { type: "phi", rid: "phi1", model: "claude-opus-5-5", hits: shownHits(scanContent(CLINIC_CSV, "visits.csv")).slice(0, 2), more: 3, local: "ollama:qwen3:8b" };
  const card = cardFromEvent(ev) as Extract<Card, { t: "phi" }>;
  expect(closesCard({ id: 1, ts: "", kind: "phi", data: { rid: "phi1" } } as never, card)).toBe(true);
  const v = phiView(card);
  expect(v.lines[0]).toBe("Name: J*** D** (visits.csv, column patient_name, line 2)");
  expect(v.actions.map((a) => a.label)).toEqual(["Send anyway", "Mask the values and send", "Use the local model ollama:qwen3:8b for this session", "Stop"]);

  const s = new FakeSession();
  const view = new WebView(s, { token: "t", env: {}, url: (p) => p, quit: async () => {} });
  s.bus.emit(ev);
  const html = view.cardsHtml();
  expect(html).toContain("Possible patient identifiers");
  expect(html).toContain("J*** D**");
  expect(html).not.toContain("John Doe");
  for (const a of ["send", "mask", "local", "stop"]) expect(html).toContain(`data-act="${a}"`);
  await view.act(view.slots.find((x) => x.card.t === "phi")!.id, { act: "mask" });
  expect(s.phiResponses).toEqual([{ rid: "phi1", action: "mask" }]);
  expect(view.slots.some((x) => x.card.t === "phi")).toBe(false);
  view.close();

  const h = makeHarness();
  const t = new FakeSession({ delayMs: 0 });
  const done = runTui(t, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
  await sleep(100);
  t.bus.emit(ev);
  await until(() => h.all().includes("Possible patient identifiers"));
  expect(h.all()).toContain("Name: J*** D** (visits.csv, column patient_name, line 2)");
  expect(h.all()).toContain("Mask the values and send");
  await sleep(100);
  h.type("s");
  await until(() => t.phiResponses.length === 1);
  expect(t.phiResponses[0]).toEqual({ rid: "phi1", action: "send" });
  h.type("\x03");
  await sleep(20);
  h.type("\x03");
  await Promise.race([done, sleep(500)]);
});

const DATA = "/Volumes/T7/guided-analysis/data";
const BINARY = new Set([".gz", ".zip", ".bz2", ".xz", ".tif", ".tiff", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".pdf", ".h5", ".h5ad", ".hdf5", ".bam", ".bai", ".cram", ".ibd", ".fif", ".xlsx", ".xls", ".npz", ".npy", ".rds", ".rda", ".mgz", ".nii", ".czi", ".nd2", ".lif", ".raw", ".fcs", ".sqlite", ".db", ".parquet", ".pkl", ".mat"]);
const MAX = 1_000_000;

function textFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) textFiles(p, out);
    else if (e.isFile() && !BINARY.has(extname(e.name).toLowerCase())) {
      const size = statSync(p).size;
      if (!size || size > MAX) continue;
      const fd = openSync(p, "r");
      const head = Buffer.alloc(Math.min(size, 8192));
      readSync(fd, head, 0, head.length, 0);
      closeSync(fd);
      if (!head.includes(0)) out.push(p);
    }
  }
  return out;
}

test.skipIf(!existsSync(DATA))("no benchmark data file triggers the check", () => {
  const files = textFiles(DATA);
  expect(files.length).toBeGreaterThan(100);
  const hit = files.map((f) => ({ f, hits: scanContent(readFileSync(f, "utf8"), f) })).filter((x) => x.hits.length);
  expect(hit.map((x) => `${x.f}: ${x.hits.map((h) => `${h.kind} ${h.value}`).join("; ")}`)).toEqual([]);
}, 300_000);
