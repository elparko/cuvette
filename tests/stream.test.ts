import { expect, test } from "vitest";

test("a reset after a new connection replaces the conversation and loads the side panel again", async () => {
  Object.assign(globalThis, { location: new URL("http://127.0.0.1/?t=x"), window: globalThis });
  const { reduce, START } = await import("../src/ui-web/lib/stream.ts");
  let s = reduce(START, { t: "reset", items: "<p>a</p>" });
  expect(s.changed).toBe(0);
  s = reduce(s, { t: "append", html: "<p>b</p>" });
  s = reduce(s, { t: "reset", items: "<p>a</p><p>b</p><p>c</p>" });
  expect(s.items).toEqual(["<p>a</p><p>b</p><p>c</p>"]);
  expect(s.changed).toBe(1);
});
