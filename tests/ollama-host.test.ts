import { expect, test } from "vitest";
import { ollamaHost } from "../src/core/ollama-host.ts";
import { localUrl } from "../src/core/phi.ts";
import { ollamaState } from "../src/core/firststart.ts";

const host = (v: string | undefined) => ollamaHost({ OLLAMA_HOST: v });

test("the Ollama host gets the http scheme and the port 11434 when they are missing", () => {
  expect(host(undefined)).toBe("http://localhost:11434");
  expect(host("")).toBe("http://localhost:11434");
  expect(host("127.0.0.1")).toBe("http://127.0.0.1:11434");
  expect(host("127.0.0.1:11434")).toBe("http://127.0.0.1:11434");
  expect(host("http://0.0.0.0:11434")).toBe("http://0.0.0.0:11434");
  expect(host("localhost:1234")).toBe("http://localhost:1234");
  expect(host("https://host")).toBe("https://host");
  expect(host("http://10.0.0.5:9999/")).toBe("http://10.0.0.5:9999");
});

test("0.0.0.0 counts as a local address", () => {
  expect(localUrl(host("0.0.0.0"))).toBe(true);
  expect(localUrl(host("http://0.0.0.0:11434"))).toBe(true);
  expect(localUrl(host("https://host"))).toBe(false);
});

test("the first-start check calls the same address for a host with no scheme", async () => {
  const seen: string[] = [];
  const fetchOk = (async (u: string) => {
    seen.push(String(u));
    return new Response(JSON.stringify({ models: [{ name: "qwen3:8b" }] }));
  }) as unknown as typeof fetch;
  const r = await ollamaState({ env: { OLLAMA_HOST: "127.0.0.1" }, fetch: fetchOk });
  expect(seen).toEqual(["http://127.0.0.1:11434/api/tags"]);
  expect(r.reachable).toBe(true);
});
