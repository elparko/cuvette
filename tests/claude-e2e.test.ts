import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { saveClaudeKey, saveClaudeWorkspace, WORKSPACE_HELP } from "../src/core/credentials.ts";
import { checkClaudeKey, ClaudeProvider } from "../src/providers/claude.ts";

type Block =
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

interface Reply {
  blocks?: Block[];
  stop?: string;
  stopDetails?: unknown;
  usage?: Record<string, number>;
  status?: number;
  error?: { type: string; message: string };
}

interface Captured {
  url: string;
  headers: IncomingMessage["headers"];
  body: any;
}

let server: Server;
let base = "";
let captured: Captured[] = [];
let replies: Reply[] = [];

function sse(res: ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify({ type: event, ...(data as object) })}\n\n`);
}

function streamMessage(res: ServerResponse, r: Reply, model: string) {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", "request-id": "req_mock" });
  const usage = { input_tokens: 120, output_tokens: 1, cache_creation_input_tokens: 30, cache_read_input_tokens: 0, ...(r.usage ?? {}) };
  sse(res, "message_start", {
    message: { id: "msg_mock", type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage },
  });
  (r.blocks ?? []).forEach((b, index) => {
    if (b.type === "thinking") {
      sse(res, "content_block_start", { index, content_block: { type: "thinking", thinking: "", signature: "" } });
      const mid = Math.ceil(b.thinking.length / 2);
      sse(res, "content_block_delta", { index, delta: { type: "thinking_delta", thinking: b.thinking.slice(0, mid) } });
      sse(res, "content_block_delta", { index, delta: { type: "thinking_delta", thinking: b.thinking.slice(mid) } });
      sse(res, "content_block_delta", { index, delta: { type: "signature_delta", signature: b.signature } });
    } else if (b.type === "text") {
      sse(res, "content_block_start", { index, content_block: { type: "text", text: "" } });
      const mid = Math.ceil(b.text.length / 2);
      sse(res, "content_block_delta", { index, delta: { type: "text_delta", text: b.text.slice(0, mid) } });
      sse(res, "content_block_delta", { index, delta: { type: "text_delta", text: b.text.slice(mid) } });
    } else {
      sse(res, "content_block_start", { index, content_block: { type: "tool_use", id: b.id, name: b.name, input: {} } });
      const json = JSON.stringify(b.input);
      const mid = Math.ceil(json.length / 2);
      sse(res, "content_block_delta", { index, delta: { type: "input_json_delta", partial_json: json.slice(0, mid) } });
      sse(res, "content_block_delta", { index, delta: { type: "input_json_delta", partial_json: json.slice(mid) } });
    }
    sse(res, "content_block_stop", { index });
  });
  sse(res, "ping", {});
  sse(res, "message_delta", {
    delta: { stop_reason: r.stop ?? "end_turn", stop_sequence: null, ...(r.stopDetails ? { stop_details: r.stopDetails } : {}) },
    usage: { output_tokens: 42 },
  });
  sse(res, "message_stop", {});
  res.end();
}

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
      captured.push({ url: req.url ?? "", headers: req.headers, body });
      const r = replies.shift();
      if (!r) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "mock has no reply queued" } }));
        return;
      }
      if (r.status && r.status !== 200) {
        res.writeHead(r.status, { "content-type": "application/json", "request-id": "req_mock", "x-should-retry": "false" });
        res.end(JSON.stringify({ type: "error", error: r.error ?? { type: "api_error", message: "error" } }));
        return;
      }
      if (body.stream) streamMessage(res, r, body.model);
      else {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: "msg_mock", type: "message", role: "assistant", model: body.model, stop_reason: r.stop ?? "end_turn", stop_sequence: null,
            content: r.blocks ?? [], usage: { input_tokens: 10, output_tokens: 5 },
          }),
        );
      }
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

const saved = { key: process.env.ANTHROPIC_API_KEY, url: process.env.ANTHROPIC_BASE_URL, token: process.env.ANTHROPIC_AUTH_TOKEN };
let session: Session | undefined;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-claude-"));
  process.env.ANTHROPIC_API_KEY = "test";
  process.env.ANTHROPIC_BASE_URL = base;
  delete process.env.ANTHROPIC_AUTH_TOKEN;
  captured = [];
  replies = [];
});
afterEach(async () => {
  await session?.close();
  session = undefined;
  for (const [k, v] of [["ANTHROPIC_API_KEY", saved.key], ["ANTHROPIC_BASE_URL", saved.url], ["ANTHROPIC_AUTH_TOKEN", saved.token]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const lab = join(__dirname, "fixtures/lab");
const SIG = "EqQBCkYIBxgCKkDsignature+/==";

async function labSession(extra: Record<string, unknown> = {}) {
  session = await Session.create({ adapters: [lab], model: "claude", referee: "none", cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), ...extra });
  session.bus.on((e) => {
    if (e.type === "question") setTimeout(() => session!.answer(e.question.qid, "Triangle"), 0);
  });
  session.decisions.applySetup({ question: "How many particles?" });
  return session;
}

describe("Claude through the real SDK against a mock Messages API", () => {
  test("tool turn then text turn", async () => {
    replies = [
      {
        blocks: [
          { type: "thinking", thinking: "I should count the particles.", signature: SIG },
          { type: "text", text: "Counting now." },
          { type: "tool_use", id: "toolu_01", name: "count", input: { input: "/data/a.tif", method: "Otsu", min_size: 10 } },
          { type: "tool_use", id: "toolu_02", name: "no_such_tool", input: { x: 1 } },
        ],
        stop: "tool_use",
      },
      { blocks: [{ type: "text", text: "There are 66 particles with the Triangle method (step 2)." }], stop: "end_turn", usage: { cache_read_input_tokens: 90 } },
    ];
    const s = await labSession();
    const deltas: string[] = [];
    s.bus.on((e: any) => {
      if (e.type === "delta") deltas.push(`${e.kind}:${e.text}`);
    });
    const answer = await s.send("Count the particles in a.tif");
    expect(answer).toMatch(/66 particles/);
    expect(captured).toHaveLength(2);

    const [r1, r2] = captured;
    expect(r1.url).toBe("/v1/messages?beta=true");
    expect(r1.headers["x-api-key"]).toBe("test");
    expect(r1.headers["anthropic-version"]).toBe("2023-06-01");
    expect(String(r1.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(r1.body.stream).toBe(true);
    expect(r1.body.model).toBe("claude-opus-5-5");
    expect(r1.body.thinking.type).toBe("adaptive");
    expect(r1.body.thinking).not.toHaveProperty("budget_tokens");
    for (const r of captured) expect(r.body.thinking.type).not.toBe("disabled");
    expect(r1.body.output_config.effort).toBe("high");
    expect(r1.body).not.toHaveProperty("tool_choice");
    expect(r1.body.system.at(-1).cache_control).toEqual({ type: "ephemeral" });
    expect(typeof r1.body.system[0].text).toBe("string");
    const names: string[] = r1.body.tools.map((t: any) => t.name);
    expect(names).toContain("count");
    expect(names).toContain("blur");
    expect(r1.body.tools.at(-1).cache_control).toEqual({ type: "ephemeral" });
    expect(r1.body.tools.slice(0, -1).some((t: any) => t.cache_control)).toBe(false);
    for (const t of r1.body.tools) expect(t.input_schema.type).toBe("object");
    expect(r2.body.tools.map((t: any) => t.name)).toEqual(names);
    expect(r1.body.messages[0].role).toBe("user");

    const msgs = r2.body.messages;
    expect(msgs.map((m: any) => m.role)).toEqual(["user", "assistant", "user"]);
    const assistant = msgs[1].content;
    expect(assistant[0]).toMatchObject({ type: "thinking", thinking: "I should count the particles.", signature: SIG });
    expect(assistant.filter((b: any) => b.type === "tool_use").map((b: any) => b.id)).toEqual(["toolu_01", "toolu_02"]);
    expect(assistant.find((b: any) => b.id === "toolu_01").input).toEqual({ input: "/data/a.tif", method: "Otsu", min_size: 10 });
    const results = msgs[2].content;
    expect(results.map((b: any) => b.type)).toEqual(["tool_result", "tool_result"]);
    expect(results.map((b: any) => b.tool_use_id)).toEqual(["toolu_01", "toolu_02"]);
    expect(results[0].is_error).toBeUndefined();
    expect(JSON.stringify(results[0].content)).toMatch(/66/);
    expect(results[1].is_error).toBe(true);
    expect(results.at(-1).cache_control).toEqual({ type: "ephemeral" });
    expect(results[0].cache_control).toBeUndefined();
    expect(JSON.stringify(msgs.slice(0, -1))).not.toContain("cache_control");
    expect(r1.body.messages.at(-1).content.at(-1).cache_control).toEqual({ type: "ephemeral" });
    expect(JSON.stringify(results[1].content)).toMatch(/no_such_tool|unknown|No tool/i);
    expect(JSON.stringify(msgs)).not.toContain('"type":"image"');
    expect(deltas.filter((d) => d.startsWith("text:")).join("").replaceAll("text:", "")).toContain("Counting now.");
    expect(deltas.filter((d) => d.startsWith("thinking:")).join("").replaceAll("thinking:", "")).toBe("I should count the particles.");

    const nodes = s.record.nodes().filter((n) => !n.sensitivityOf);
    expect(nodes.map((n) => n.tool)).toEqual(["count"]);
    expect(nodes[0].decisions.method).toBe("Triangle");
  });

  test("the referee runs on the mock through complete()", async () => {
    replies = [
      { blocks: [{ type: "tool_use", id: "toolu_01", name: "count", input: { input: "/data/a.tif", method: "Default" } }], stop: "tool_use" },
      { blocks: [{ type: "text", text: "There are 64 particles (step 1)." }] },
      { blocks: [{ type: "thinking", thinking: "checking", signature: SIG }, { type: "text", text: '[{"severity":"warning","message":"One method only.","entries":[1]}]' }] },
    ];
    const s = await labSession({ referee: "same" });
    s.decisions.change("method", "Default");
    await s.send("count it");
    const refereeCall = captured.at(-1)!;
    expect(refereeCall.url).toBe("/v1/messages");
    expect(refereeCall.body.stream).toBeUndefined();
    expect(refereeCall.body.thinking).toEqual({ type: "adaptive", display: "summarized" });
    expect(refereeCall.body.messages[0].content).toMatch(/FINAL ANSWER/);
    const findings = s.record.entries(["finding"]).map((e) => JSON.stringify(e.data));
    expect(findings.join("\n")).toMatch(/One method only/);
  });

  test("a separate referee provider on the mock works with a fake agent", async () => {
    const { FakeProvider } = await import("../src/providers/fake.ts");
    replies = [{ blocks: [{ type: "text", text: "[]" }] }];
    const referee = new ClaudeProvider("claude-sonnet-5-5");
    session = await Session.create({ adapters: [lab], provider: new FakeProvider([{ text: "Nothing to count." }]), refereeProvider: referee, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
    session.decisions.applySetup({});
    await session.send("hello");
    expect(captured.at(-1)!.body.model).toBe("claude-sonnet-5-5");
  });

  test("images appear only when a tool result has them", () => {
    const p = new ClaudeProvider("claude-opus-5-5", { apiKey: "test" });
    const none = p.toNative([{ role: "user", parts: [{ type: "tool_result", callId: "a", name: "x", text: "ok" } as any] }]);
    expect(JSON.stringify(none)).not.toContain("image");
  });

  test("refusal gives a clear message and no crash", async () => {
    replies = [{ blocks: [{ type: "text", text: "I can't help with that." }], stop: "refusal", stopDetails: { type: "refusal", category: "cyber", explanation: "x" } }];
    const s = await labSession();
    const answer = await s.send("do something");
    expect(answer).toMatch(/declined this request \(category: cyber\)/);
  });

  test("refusal drops tool_use blocks", async () => {
    replies = [{ blocks: [{ type: "tool_use", id: "toolu_09", name: "count", input: {} }], stop: "refusal", stopDetails: { type: "refusal", category: null } }];
    const p = new ClaudeProvider("claude-opus-5-5", { apiKey: "test" });
    const r = await p.step({ system: "s", messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }], tools: [] });
    expect(r.stopReason).toBe("refusal");
    expect(r.message.parts.some((x) => x.type === "tool_call")).toBe(false);
    expect(r.note).toMatch(/declined/);
  });

  async function stepError(reply: Reply) {
    replies = [reply];
    const p = new ClaudeProvider("claude-opus-5-5");
    return p.step({ system: "s", messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }], tools: [] }).then(
      () => "",
      (e: Error) => e.message,
    );
  }

  test("the saved key is used when the shell has none, and a new key takes effect at once", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    saveClaudeKey("sk-ant-saved-one-0000");
    const p = new ClaudeProvider("claude-opus-5-5");
    const ask = () => p.step({ system: "s", messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }], tools: [] });
    replies = [{ blocks: [{ type: "text", text: "a" }] }, { blocks: [{ type: "text", text: "b" }] }];
    await ask();
    saveClaudeKey("sk-ant-saved-two-1111");
    await ask();
    expect(captured.map((c) => c.headers["x-api-key"])).toEqual(["sk-ant-saved-one-0000", "sk-ant-saved-two-1111"]);
  });

  test("checkClaudeKey accepts a working key and rejects a 401", async () => {
    replies = [{}];
    expect(await checkClaudeKey("sk-ant-good")).toMatchObject({ ok: true, text: "The key works. It can use claude-opus-5-5." });
    expect(captured[0]!.url).toBe("/v1/models/claude-opus-5-5");
    expect(captured[0]!.headers["x-api-key"]).toBe("sk-ant-good");
    replies = [{ status: 401, error: { type: "authentication_error", message: "invalid x-api-key" } }];
    expect(await checkClaudeKey("sk-ant-bad")).toMatchObject({ ok: false, text: expect.stringMatching(/HTTP 401.*settings\/keys/) });
  });

  test("checkClaudeKey sends a low credit balance and a 403 to Billing", async () => {
    replies = [{ status: 400, error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } }];
    expect(await checkClaudeKey("sk-ant-nocredit")).toMatchObject({ ok: false, text: expect.stringMatching(/no credit left.*settings\/billing/) });
    replies = [{ status: 403, error: { type: "permission_error", message: "no access" } }];
    expect(await checkClaudeKey("sk-ant-forbidden")).toMatchObject({ ok: false, text: expect.stringMatching(/HTTP 403.*settings\/billing/) });
  });

  test("a saved workspace ID goes on every request, and the workspace 400 explains the fix", async () => {
    saveClaudeWorkspace("wrkspc_test123");
    replies = [{ blocks: [{ type: "text", text: "a" }] }];
    const p = new ClaudeProvider("claude-opus-5-5");
    await p.step({ system: "s", messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }], tools: [] });
    expect(captured[0]!.headers["anthropic-workspace-id"]).toBe("wrkspc_test123");
    saveClaudeWorkspace("");
    const msg = "This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header with the ID of the workspace to use.";
    expect(await stepError({ status: 400, error: { type: "invalid_request_error", message: msg } })).toBe(WORKSPACE_HELP);
    replies = [{ status: 400, error: { type: "invalid_request_error", message: msg } }];
    expect(await checkClaudeKey("sk-ant-noworkspace")).toEqual({ ok: false, text: WORKSPACE_HELP });
    expect(captured.at(-1)!.headers["anthropic-workspace-id"]).toBeUndefined();
  });

  test("401 gives the credentials message", async () => {
    const msg = await stepError({ status: 401, error: { type: "authentication_error", message: "invalid x-api-key" } });
    expect(msg).toMatch(/^No valid Claude credentials. Type \/key to add your API key, set ANTHROPIC_API_KEY, or run `ant auth login`. The API said: .*invalid x-api-key/);
  });

  test("401 inside a session ends the turn with that message", async () => {
    replies = [{ status: 401, error: { type: "authentication_error", message: "invalid x-api-key" } }];
    const s = await labSession();
    await s.send("hi");
    const errors = s.record.entries(["error"]).map((e) => String(e.data.message));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^No valid Claude credentials. Type \/key/);
  });

  test("429, 500, 529 and 403 are reported in plain words", async () => {
    expect(await stepError({ status: 429, error: { type: "rate_limit_error", message: "slow" } })).toMatch(/rate limit/i);
    expect(await stepError({ status: 500, error: { type: "api_error", message: "boom" } })).toMatch(/server error \(500\)/);
    const overloaded = await stepError({ status: 529, error: { type: "overloaded_error", message: "Overloaded" } });
    expect(overloaded).toMatch(/server error \(529\)/);
    expect(overloaded).not.toMatch(/\{|stack|APIError/);
    expect(await stepError({ status: 403, error: { type: "permission_error", message: "no access" } })).toMatch(/cannot use claude-opus-5-5/);
    expect(await stepError({ status: 404, error: { type: "not_found_error", message: "model: nope" } })).toMatch(/Unknown Claude model/);
  });

  test("a mid-stream overloaded error event is reported in plain words", async () => {
    const orig = server.listeners("request")[0] as (...a: any[]) => void;
    server.removeAllListeners("request");
    server.on("request", (req, res) => {
      req.resume();
      req.on("end", () => {
        res.writeHead(200, { "content-type": "text/event-stream" });
        sse(res, "message_start", { message: { id: "m", type: "message", role: "assistant", model: "x", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } });
        sse(res, "error", { error: { type: "overloaded_error", message: "Overloaded" } });
        res.end();
      });
    });
    try {
      const msg = await stepError({});
      expect(msg).toMatch(/server error|overloaded/i);
    } finally {
      server.removeAllListeners("request");
      server.on("request", orig);
    }
  });

  test("a 400 that mentions fallbacks retries once without them", async () => {
    replies = [
      { status: 400, error: { type: "invalid_request_error", message: "fallbacks: Extra inputs are not permitted" } },
      { blocks: [{ type: "text", text: "hello" }] },
      { blocks: [{ type: "text", text: "again" }] },
    ];
    const p = new ClaudeProvider("claude-opus-5-5");
    const req = { system: "s", messages: [{ role: "user" as const, parts: [{ type: "text" as const, text: "hi" }] }], tools: [] };
    const r = await p.step(req);
    expect(r.message.parts[0]).toMatchObject({ text: "hello" });
    expect(captured).toHaveLength(2);
    expect(captured[0].body.fallbacks).toBe("default");
    expect(captured[0].url).toBe("/v1/messages?beta=true");
    expect(captured[1].body).not.toHaveProperty("fallbacks");
    expect(captured[1].body).not.toHaveProperty("betas");
    expect(captured[1].url).toBe("/v1/messages");
    expect(String(captured[1].headers["anthropic-beta"] ?? "")).not.toContain("server-side-fallback");
    await p.step(req);
    expect(captured).toHaveLength(3);
    expect(captured[2].url).toBe("/v1/messages");
  });

  test("a 400 that does not mention fallbacks is not retried", async () => {
    const msg = await stepError({ status: 400, error: { type: "invalid_request_error", message: "messages.0: bad" } });
    expect(msg).toMatch(/Claude rejected the request/);
    expect(captured).toHaveLength(1);
  });

  test("a tool result with images sends image blocks inside the tool_result", () => {
    const p = new ClaudeProvider("claude-opus-5-5", { apiKey: "test" });
    const png = join(tmpdir(), `cuvette-e2e-${Date.now()}.png`);
    const px = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    require("node:fs").writeFileSync(png, px);
    const out = p.toNative([
      { role: "assistant", parts: [{ type: "tool_call", id: "t1", name: "x", args: {} }, { type: "tool_call", id: "t2", name: "y", args: {} }] },
      { role: "user", parts: [{ type: "tool_result", callId: "t1", name: "x", text: "pic", images: [png] } as any, { type: "tool_result", callId: "t2", name: "y", text: "bad", isError: true } as any] },
    ]) as any[];
    const results = out[1].content;
    expect(out).toHaveLength(2);
    expect(results[0].content[1]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/png" } });
    expect(results[1].is_error).toBe(true);
  });
});
