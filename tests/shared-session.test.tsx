import { expect, test } from "vitest";
import { startApp } from "../src/server/app.ts";
import { runTui } from "../src/tui/app.tsx";
import { makeHarness, sleep, until } from "../src/tui/testing.ts";
import { FakeSession } from "../src/ui/fake-session.ts";

test("the terminal and the app on one running session show the same events", async () => {
  const s = new FakeSession({ delayMs: 1 });
  const h = makeHarness();
  const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
  await until(() => h.all().includes("Type /help"));
  const app = await startApp({ session: s, env: {} });
  const post = (p: string, body: unknown) => fetch(`http://127.0.0.1:${app.port}/${p}`, { method: "POST", headers: { "x-token": app.token, "content-type": "application/json" }, body: JSON.stringify(body) });
  const msgs: any[] = [];
  const res = await fetch(`http://127.0.0.1:${app.port}/events?t=${app.token}`);
  const reader = res.body!.getReader();
  void (async () => {
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (done) break;
      buf += new TextDecoder().decode(value);
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const c = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (c.startsWith("data: ")) msgs.push(JSON.parse(c.slice(6)));
      }
    }
  })();

  await post("api/send", { text: "compare endo and epi" });
  await until(() => h.all().includes("Permission needed: run_script"));
  await until(() => msgs.some((m) => m.t === "cards" && m.html.includes("Permission needed: run_script")));
  const html = msgs.filter((m) => m.t === "cards").at(-1).html as string;
  const id = Number(/data-card="(\d+)" data-type="permission"/.exec(html)![1]);
  await post("api/act", { id, act: "allow", fields: {} });
  await until(() => h.all().includes("Your decision: Which AUC cutoff"));
  h.type("1");
  await until(() => h.all().includes("14 features differ between endo and epi at AUC 0.7."), 15000);
  await until(() => msgs.some((m) => m.t === "append" && m.html.includes("14 features differ between endo and epi at AUC 0.7.")));
  expect(msgs.some((m) => m.t === "cards" && !m.html.includes("data-type=\"permission\""))).toBe(true);
  await app.close();
  h.type("\x03");
  await sleep(20);
  h.type("\x03");
  await Promise.race([done, sleep(500)]);
});
