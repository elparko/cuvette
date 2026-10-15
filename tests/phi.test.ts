import { closeSync, existsSync, mkdtempSync, openSync, readdirSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { folderHasNoPatientData, groupHits, isCloud, isLocal, localUrl, maskShown, Masker, NOT_SENT, scanContent, scanMessages, scanTable, scanText, setFolderNoPatientData, shownHits, withheld, type PhiAction } from "../src/core/phi.ts";
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

test("an image file name with an identifier triggers, and the masker keeps that image from the model", () => {
  const img = "/data/scans/John_Smith_DOB_03-14-1956.png";
  const plain = "/data/scans/field_01.png";
  const msg: Message = { role: "user", parts: [{ type: "tool_result", callId: "c1", name: "inspect_data", text: "Two previews.", images: [img, plain] }, { type: "image", path: img }] };
  const hits = scanMessages([msg], [msg]);
  expect(hits.map((h) => [h.kind, h.value])).toContainEqual(["birth_date", "03-14-1956"]);
  expect(hits[0]!.where).toBe("image file name John_Smith_DOB_03-14-1956.png");
  const m = new Masker();
  m.add(hits);
  const out = m.message(msg);
  const result = out.parts[0] as Extract<Message["parts"][number], { type: "tool_result" }>;
  expect(result.images).toEqual([plain]);
  expect(result.text).toMatch(/One image not sent to the model: the file name has a possible patient identifier/);
  expect(out.parts[1]).toMatchObject({ type: "text" });
  expect(JSON.stringify(out)).not.toContain("1956.png");
  expect(m.message({ role: "user", parts: [{ type: "tool_result", callId: "c2", name: "x", text: "ok", images: [plain] }] }).parts[0]).toMatchObject({ images: [plain] });
  const named = new Masker();
  named.add(scanText("Patient: John Smith", "x"));
  const shown = named.message({ role: "user", parts: [{ type: "tool_result", callId: "c3", name: "x", text: "ok", images: ["/data/John_Smith_chart.png", "/data/Johnson/field_01.png", "/data/John Smithers.png"] }] });
  expect(shown.parts[0]).toMatchObject({ images: ["/data/Johnson/field_01.png", "/data/John Smithers.png"] });
});

test("stop: an attached image does not stay in the history", () => {
  const out = withheld({ role: "user", parts: [{ type: "text", text: "Patient: John Doe" }, { type: "image", path: "/data/chart.png" }] });
  expect(out.parts).toEqual([{ type: "text", text: NOT_SENT }, { type: "text", text: NOT_SENT }]);
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

function cloudFake(script: ConstructorParameters<typeof FakeProvider>[0] = []): FakeProvider {
  const p = new FakeProvider(script);
  p.info.local = false;
  return p;
}

test("a cloud referee does not read the record after patient identifiers went to the local model", async () => {
  const { session } = await clinicSession({ local: true });
  await session.send("Summarize visits.csv");
  const ref = cloudFake();
  const spy = vi.spyOn(ref, "complete");
  (session as any).refereeProvider = ref;
  await session.review();
  expect(spy).not.toHaveBeenCalled();
  await session.close();
});

test("a cloud referee reads the record after the scientist chose to send", async () => {
  const { session } = await clinicSession({ action: "send" });
  await session.send("Summarize visits.csv");
  const ref = cloudFake();
  const spy = vi.spyOn(ref, "complete");
  (session as any).refereeProvider = ref;
  await session.review();
  expect(spy).toHaveBeenCalled();
  await session.close();
});

test("the helper agent of the task tool does not send patient identifiers to a cloud model", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-phi-proj-"));
  const file = join(cwd, "visits.csv");
  writeFileSync(file, CLINIC_CSV);
  const provider = cloudFake([{ calls: [{ name: "task", args: { job: "Read visits.csv" } }] }, { calls: [{ name: "read_file", args: { path: file } }] }, { text: "Done." }, { text: "Done." }]);
  const session = await Session.create({ adapters: [], provider, cwd });
  session.decisions.applySetup({});
  const cards: PhiEvent[] = [];
  session.bus.on((e) => {
    if (e.type === "phi") cards.push(e);
  });
  await session.send("Summarize visits.csv");
  expect(JSON.stringify(provider.requests.map((r) => r.messages))).not.toContain("John Doe");
  expect(session.record.entries(["phi"])[0]!.data).toMatchObject({ action: "stop" });
  const task = session.record.entries(["tool_result"]).find((e) => e.data.tool === "task")!;
  expect(String(task.data.error)).toMatch(/^The helper agent stopped: a tool result has possible patient identifiers\./);
  expect(cards).toHaveLength(0);
  await session.close();
});

test("/compact checks the history for patient identifiers before the summary goes to a cloud model", async () => {
  const { session, provider, cards } = await clinicSession({ action: "stop" });
  (session as any).history.push({ role: "user", parts: [{ type: "text", text: CLINIC_CSV }] });
  const spy = vi.spyOn(provider, "complete");
  expect(await session.compact()).toBe(false);
  expect(cards).toHaveLength(1);
  expect(spy).not.toHaveBeenCalled();
  expect(session.record.entries(["phi"])[0]!.data.action).toBe("stop");
  await session.close();
});

test("no new title from a cloud model after the scientist stopped patient identifiers", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-phi-proj-"));
  const file = join(cwd, "visits.csv");
  writeFileSync(file, CLINIC_CSV);
  const provider = cloudFake([{ text: "Not read." }]);
  provider.info.provider = "openai";
  const session = await Session.create({ adapters: [], provider, cwd, interactive: true, settings: { planFirst: false, guidance: false } as never });
  session.bus.on((e) => {
    if (e.type === "phi") setTimeout(() => session.respondPhi(e.rid, "stop"), 0);
  });
  const spy = vi.spyOn(provider, "complete");
  await session.send(`Summarize visits.csv for John Doe, MRN 00123456`);
  await session.send("Go on without the file.");
  await session.titling;
  expect(session.record.entries(["phi"])[0]!.data.action).toBe("stop");
  expect(session.record.entries(["assistant"]).some((e) => e.data.final)).toBe(true);
  expect(spy).not.toHaveBeenCalled();
  await session.close();
});

test("a cloud referee does not read a log with identifiers that never went to the model", async () => {
  const provider = cloudFake([{ text: "Done." }]);
  const session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-phi-proj-")) });
  session.decisions.applySetup({});
  await session.send("Summarize the run.");
  session.record.append("tool_result", { callId: "s1.1", tool: "read_file", ok: true, summary: "Patient: John Doe, MRN 00123456" });
  const ref = cloudFake();
  const spy = vi.spyOn(ref, "complete");
  (session as any).refereeProvider = ref;
  await session.review();
  expect(spy).not.toHaveBeenCalled();
  expect(session.record.entries(["phi"])).toHaveLength(0);
  await session.close();
});

test("the MCP client gets masked values, a notice and a logged choice; phi_check off sends the values", async () => {
  const session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-phi-proj-")) });
  const out = session.phiForClient(CLINIC_CSV, "read_file");
  expect(out).not.toContain("John Doe");
  expect(out).toContain("[NAME 1],[MRN 1],[DATE OF BIRTH 1]");
  expect(out).toMatch(/Cuvette masked \d+ possible patient identifiers in this result before it went to the MCP client/);
  expect(session.record.entries(["phi"])[0]!.data).toMatchObject({ action: "mask", by: "harness: the MCP client cannot show the card" });
  expect(session.phiForClient("Again: John Doe", "read_file")).toBe("Again: [NAME 1]");
  expect(session.phiForClient("Counts: 41 cells", "count")).toBe("Counts: 41 cells");
  await session.close();
  const off = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-phi-proj-")), settings: { phi_check: false } as never });
  expect(off.phiForClient(CLINIC_CSV, "read_file")).toBe(CLINIC_CSV);
  await off.close();
});

test("the MCP client gets masked values in a JSON list of rows, also a value with a line break or a quote", async () => {
  const session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-phi-proj-")) });
  const rows = [
    { patient_name: "John Doe", home_address: "1501 Kings Highway\nShreveport", troponin: 54 },
    { patient_name: "Mary Smith", home_address: "22 Oak Street\nBossier City", troponin: 12 },
  ];
  const text = JSON.stringify({ ok: true, rows }, null, 1);
  expect(kinds(JSON.stringify(rows))).toEqual(expect.arrayContaining(["address", "name"]));
  const out = session.phiForClient(text, "read_table");
  expect(out).not.toContain("John Doe");
  expect(out).not.toContain("Mary Smith");
  expect(out).not.toContain("Kings Highway");
  expect(out).not.toContain("Oak Street");
  expect(out).toContain('"troponin": 54');
  const m = new Masker();
  m.add([{ kind: "name", value: 'Ann "Bo" Lee', where: "x" }]);
  expect(m.text(JSON.stringify({ n: 'Ann "Bo" Lee' }))).toBe('{"n":"[NAME 1]"}');
  await session.close();
});

test("a binary or very large tool result does not stop the MCP mask", async () => {
  const session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-phi-proj-")) });
  const bin = Buffer.from(Array.from({ length: 200_000 }, (_, i) => (i * 7919) % 256)).toString("latin1");
  expect(session.phiForClient(bin, "read_file")).toBe(bin);
  const big = `${CLINIC_CSV}${"x,1\n".repeat(500_000)}`;
  const t0 = Date.now();
  const out = session.phiForClient(big, "read_file");
  expect(Date.now() - t0).toBeLessThan(5000);
  expect(out).not.toContain("John Doe");
  await session.close();
});

test("after a summary and a resume, a masked value keeps its placeholder, so two patients do not share one", async () => {
  const { session, provider, file } = await clinicSession({ action: "mask" });
  await session.send("Summarize visits.csv");
  await session.send("And the count?");
  provider.info.contextWindow = 10;
  provider.complete = async () => "## Steps done\n[NAME 1] has troponin 54.";
  expect(await session.compact()).toBe(true);
  const id = session.id;
  const cwd = session.cwd;
  await session.close();
  const later = join(cwd, "later.csv");
  writeFileSync(later, "patient_name,troponin_ng_l\nRobert Brown,230\nAnn Lee,7\n");
  const next = new FakeProvider([{ calls: [{ name: "read_file", args: { path: later } }] }, { text: "Two rows." }, { text: "Two rows." }]);
  next.info.local = false;
  const resumed = await Session.resume(id, { provider: next, cwd });
  await resumed.send("Read later.csv");
  const sent = sentText(next);
  expect(sent).toContain("[NAME 1] has troponin 54");
  expect(sent).not.toContain("Robert Brown");
  expect(sent).toContain("[NAME 3],230");
  expect(sent).toContain("[NAME 4],7");
  expect(readFileSync(file, "utf8")).toBe(CLINIC_CSV);
  await resumed.close();
});

test("a phone notice to an outside server does not carry patient identifiers", async () => {
  const bodies: string[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    bodies.push(init.body);
    return new Response("{}");
  });
  const session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-phi-proj-")), settings: { notify: { ntfy: "https://ntfy.example.org/topic" } } as never });
  session.questions.ask({ decisionKey: "", title: "Which visit?", text: "Use the visit of Patient: John Doe, MRN 00123456?", options: [], recommendation: { value: "", reason: "" }, evidence: "" } as never);
  session.questions.ask({ decisionKey: "", title: "Which threshold?", text: "Otsu or Li?", options: [], recommendation: { value: "", reason: "" }, evidence: "" } as never);
  for (let i = 0; i < 500 && bodies.length < 2; i++) await sleep(10);
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).not.toContain("John Doe");
  expect(bodies[0]).toMatch(/Open Cuvette to read it/);
  expect(bodies[1]).toContain("Otsu or Li?");
  await session.close();
});

test("cloud_visibility applies to every cloud model, not only Claude", async () => {
  const provider = cloudFake();
  provider.info.provider = "openai";
  const session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-phi-proj-")) });
  (session as any).adapterOf = () => ({ manifest: { data_rules: { cloud_visibility: "none" } } });
  const r = (session as any).render({ name: "count", source: "adapter" }, { ok: true, metrics: { cells: 41 }, text: "41 cells" });
  expect(r.text).not.toContain("41");
  await session.close();
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

test("a long line in parts: the text before a part decides a match at the part start", () => {
  const line = `${"a".repeat(2999)}9123-45-6789 ${"b ".repeat(200)}`;
  expect(line.indexOf("123-45")).toBe(3000);
  expect(scanText(line, "f").filter((h) => h.kind === "ssn")).toEqual([]);
  const at = `${"a ".repeat(1499)}x 123-45-6789 ${"b ".repeat(600)}`;
  expect(scanText(at, "f").map((h) => h.value)).toEqual(["123-45-6789"]);
});

test("a long line in parts: the ZIP check reads the full line", () => {
  const line = `ZIP 70112 ${"a ".repeat(2200)} DOB 01/02/1990`;
  expect(scanText(line, "f").map((h) => h.kind)).toEqual(["zip", "birth_date"]);
});

test("a long line in parts: a hit that runs past the end of a part keeps its full value", () => {
  for (const at of [2990, 3790, 3900, 3999]) {
    const email = `${"a".repeat(200)}@example.com`;
    const line = `${"x".repeat(at - 1)} ${email} ${"x".repeat(500)}`;
    expect(scanText(line, "f").map((h) => h.value)).toEqual([email]);
  }
  const date = `${"x ".repeat(1997)}xx DOB 01/02/1990 ${"y ".repeat(700)}`;
  expect(scanText(date, "f").map((h) => h.value)).toEqual(["01/02/1990"]);
});

test("a long line in parts: a hit longer than the overlap that reaches the part end is read in the full line", () => {
  const email = `${"a".repeat(1000)}@e.example.com`;
  const line = `${"x".repeat(2994)} ${email} ${"x".repeat(2000)}`;
  expect(line.indexOf("@e.ex") + 5).toBe(4000);
  expect(scanText(line, "f").map((h) => h.value)).toEqual([email]);
});

test("a CSV cell with a line break does not stop the scan of the rows after it", () => {
  const csv = 'id,patient name,dob,notes\n1,Jane Doe,1980-01-02,"first\nsecond\nthird"\n2,John Smith,1975-03-04,ok\n3,Mary Jones,1990-05-06,ok\n';
  const hits = scanContent(csv, "t.csv").filter((h) => h.column);
  expect(hits.map((h) => h.value).sort()).toEqual(["1975-03-04", "1980-01-02", "1990-05-06", "Jane Doe", "John Smith", "Mary Jones"]);
  expect(hits.find((h) => h.value === "John Smith")!.line).toBe(5);
});

test("a long line with many ZIP codes and no date is scanned in linear time", () => {
  const line = "ZIP 70112 ".repeat(30000);
  const t0 = Date.now();
  expect(scanText(line, "f")).toEqual([]);
  expect(Date.now() - t0).toBeLessThan(5000);
});

test("the Masker masks 20000 values, and two calls give the same text", () => {
  const m = new Masker();
  const names = Array.from({ length: 20000 }, (_, i) => `Pat${String.fromCharCode(97 + (i % 26))}${i.toString(36)} Doe`);
  m.add(names.map((value) => ({ kind: "name" as const, value, where: "t" })));
  const text = `${names[0]} met ${names[19999]} and ${names[5000]}x.`;
  const out = m.text(text);
  expect(out).toBe(`[NAME 1] met [NAME 20000] and ${names[5000]}x.`);
  expect(m.text(text)).toBe(out);
});

test("groupHits of 50000 hits in one group is fast", () => {
  const hits = Array.from({ length: 50000 }, (_, i) => ({ kind: "name" as const, value: `N${i}`, where: "t", line: i + 1 }));
  const t0 = Date.now();
  const g = groupHits(hits);
  expect(Date.now() - t0).toBeLessThan(1000);
  expect(g).toHaveLength(1);
});

test("a stray quote in a CSV cell, such as 5\" for inches, does not join the rows after it", () => {
  const csv = 'id,patient name,dob,notes\n1,Jane Doe,1980-01-02,5" pipe\n2,John Smith,1975-03-04,ok\n3,Mary Jones,1990-05-06,ok\n';
  const names = scanContent(csv, "t.csv").filter((h) => h.column === "patient name");
  expect(names.map((h) => [h.value, h.line])).toEqual([["Jane Doe", 2], ["John Smith", 3], ["Mary Jones", 4]]);
});

test("the Masker with more than 1000 values gives the same text as with few values", () => {
  const hits = (names: string[]) => names.map((value) => ({ kind: "name" as const, value, where: "t" }));
  const few = new Masker();
  few.add(hits(["Ann Lee", "Lee Roe Kim", "Roe Kim Xu"]));
  const many = new Masker();
  many.add(hits([...Array.from({ length: 998 }, (_, i) => `Fill${i.toString(36)} Zed`), "Ann Lee", "Lee Roe Kim", "Roe Kim Xu"]));
  const text = "Ann Lee Roe Kim Xu, and Lee Roe Kim.";
  expect(few.text(text)).toBe("[NAME 1] [NAME 3], and [NAME 2].");
  expect(many.text(text)).toBe("[NAME 999] [NAME 1001], and [NAME 1000].");
});

test("localUrl treats 0.0.0.0 as local", () => {
  expect(localUrl("http://0.0.0.0:11434")).toBe(true);
});

test("localUrl treats the IPv6 any address as local", () => {
  expect(localUrl("http://[::]:11434")).toBe(true);
  expect(localUrl("http://[::1]:11434")).toBe(true);
});

test("localUrl needs a full address, not a host name that starts with digits", () => {
  expect(localUrl("https://10.evil.example.com/v1")).toBe(false);
  expect(localUrl("https://192.168.evil.com/v1")).toBe(false);
  expect(localUrl("https://172.16.example.com/v1")).toBe(false);
  expect(localUrl("http://10.0.0.5:8000/v1")).toBe(true);
  expect(localUrl("http://192.168.1.1/v1")).toBe(true);
  expect(localUrl("http://172.20.1.1/v1")).toBe(true);
  expect(localUrl("http://127.0.0.2/v1")).toBe(true);
  expect(localUrl("http://10.0.0.300/v1")).toBe(false);
});

test("a blank row in a table does not stop the scan of a name column", () => {
  const csv = "patient_name,visit\nJane Doe,1\n\nJohn Smith,2\n";
  const names = scanContent(csv, "v.csv").filter((h) => h.kind === "name").map((h) => h.value);
  expect(names).toEqual(["Jane Doe", "John Smith"]);
});
