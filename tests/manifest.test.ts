import { expect, test } from "vitest";
import { loadAdapter } from "../src/adapters/manifest.ts";

test("map entries match on args and links resolve", () => {
  const a = loadAdapter("tests/fixtures/mini");
  expect(a.mapEntry("run", { step: "b" })?.route).toBe("A > C");
  expect(a.mapEntry("run", { step: "x" })?.route).toBe("A > B");
  expect(a.linksFor("run")).toEqual({ cutoff: "thr" });
  expect(a.manifest.map[0].fidelity).toBe("close");
});
