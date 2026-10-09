import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Session } from "../../src/core/session.ts";
import { FakeProvider } from "../../src/providers/fake.ts";

export async function analysedSession(): Promise<Session> {
  const provider = new FakeProvider([
    { calls: [{ name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 10 } }] },
    { text: "There are 41 particles (step 1)." },
  ]);
  const s = await Session.create({ adapters: [join(__dirname, "lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  s.decisions.applySetup({ question: "How many particles?", method: "Otsu" });
  await s.send("Count the particles in a.tif");
  const sha = s.record.putBlob(Buffer.from("PNGDATA"), ".png");
  s.record.addNode({
    entry: 0, adapter: "lab", adapterVersion: "0.2.0", programVersion: "1.0", tool: "blur", args: { input: "/data/a.tif", sigma: 2 },
    decisions: {}, codeHash: "c", inputHashes: [], outputs: [{ path: "/work/blur.png", kind: "image", name: "blur.png", sha }],
    result: {}, parents: [], summary: "Blurred with sigma 2.", model: "m", manualRoute: "Process > Blur", fidelity: "exact",
  });
  s.findings.add({ check: "demo", severity: "warning", message: "The sample size is one image." }, "rule");
  return s;
}
