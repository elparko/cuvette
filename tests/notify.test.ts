import { createServer, type Server } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { ntfyNotifier, setWindowUrl } from "../src/server/notify.ts";

interface Post {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

let server: Server;
let topic = "";
let posts: Post[] = [];
let session: Session | undefined;

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      posts.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString("utf8") });
      res.writeHead(200).end("{}");
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  topic = `http://127.0.0.1:${(server.address() as { port: number }).port}/cuvette-test-topic`;
});
afterAll(() => new Promise<void>((ok) => server.close(() => ok())));
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-notify-"));
  posts = [];
  setWindowUrl(undefined);
});
afterEach(async () => {
  setWindowUrl(undefined);
  await session?.close();
  session = undefined;
});

async function blockedSession() {
  const provider = new FakeProvider([
    { calls: [{ name: "count", args: { input: "/data/a.tif", method: "Otsu" } }] },
    { text: "Stopped at the question." },
    { text: "Stopped at the question." },
  ]);
  session = await Session.create({
    adapters: [join(__dirname, "fixtures/lab")],
    provider,
    cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")),
    settings: { notify: { ntfy: topic }, askWaits: false, autoResume: false },
  });
  session.decisions.applySetup({ question: "How many particles?" });
  return session;
}

test("a blocking scientist-owned decision posts the question to the ntfy topic", async () => {
  const s = await blockedSession();
  await s.send("Count the particles");
  const open = s.questions.open();
  expect(open).toHaveLength(1);
  for (let i = 0; i < 1500 && posts.length < 1; i++) await new Promise((r) => setTimeout(r, 20));
  expect(posts).toHaveLength(1);
  const p = posts[0];
  expect(p.method).toBe("POST");
  expect(p.url).toBe("/cuvette-test-topic");
  expect(p.headers.title).toBe("A question waits for you");
  expect(p.headers.click).toBeUndefined();
  expect(p.body.split("\n")[0]).toBe(open[0].title);
  expect(p.body).toContain(open[0].text);
  expect(open[0].title).toMatch(/Threshold method/i);
});

test("the post never carries the window address", async () => {
  setWindowUrl("http://127.0.0.1:4500/?t=abc");
  const s = await blockedSession();
  await s.send("Count the particles");
  for (let i = 0; i < 1500 && posts.length < 1; i++) await new Promise((r) => setTimeout(r, 20));
  expect(posts).toHaveLength(1);
  expect(posts[0].headers.click).toBeUndefined();
  expect(posts[0].body).not.toContain("?t=");
  expect(posts[0].body).not.toContain("4500");
});

test("a plain http address that is not local gets no post and one report", async () => {
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  try {
    const send = ntfyNotifier("http://ntfy.example.org/topic-once");
    const q = { qid: "q1", title: "T", text: "Body" } as never;
    await send(q);
    await send(q);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledTimes(1);
    expect(String(err.mock.calls[0][0])).toContain("http://ntfy.example.org/topic-once");
  } finally {
    err.mockRestore();
    fetchSpy.mockRestore();
  }
});

test("an https address gets the post", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
  try {
    await ntfyNotifier("https://ntfy.example.org/topic")({ qid: "q1", title: "T", text: "Body" } as never);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  } finally {
    fetchSpy.mockRestore();
  }
});

test("a dead topic address does not break the question", async () => {
  const q = { qid: "q1", title: "T", text: "Body" } as never;
  await expect(ntfyNotifier("http://127.0.0.1:1/none")(q)).resolves.toBeUndefined();
});

test("a topic that answers 500 does not throw", async () => {
  const bad = createServer((_, res) => res.writeHead(500).end());
  await new Promise<void>((ok) => bad.listen(0, "127.0.0.1", ok));
  try {
    const url = `http://127.0.0.1:${(bad.address() as { port: number }).port}/x`;
    await expect(ntfyNotifier(url)({ qid: "q1", title: "T", text: "B" } as never)).resolves.toBeUndefined();
  } finally {
    bad.close();
  }
});
