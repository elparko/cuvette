import { expect, test } from "vitest";
import { Permissions, modeHook } from "../src/core/permissions.ts";
import type { Mode, Tool } from "../src/core/types.ts";

const tool = (o: Partial<Tool>): Tool => ({ name: "t", description: "", inputSchema: {}, source: "adapter", execute: async () => ({ ok: true }), ...o });

test("defaults", () => {
  const p = new Permissions({});
  expect(p.check(tool({ source: "adapter" }), {})).toBe("allow");
  expect(p.check(tool({ name: "run_command", source: "generic" }), {})).toBe("ask");
  expect(p.check(tool({ name: "read_file", source: "generic", readOnly: true }), {})).toBe("allow");
  expect(p.check(tool({ permission: "deny" }), {})).toBe("deny");
});

test("deny beats a more specific allow", () => {
  const p = new Permissions({ "*": "ask", "imagej_run": "allow", "imagej_*": "deny" });
  expect(p.check(tool({ name: "imagej_run" }), {})).toBe("deny");
  expect(p.check(tool({ name: "other" }), {})).toBe("ask");
});

test("run_command argv globs", () => {
  const p = new Permissions({ "run_command:git *": "allow", "run_command:rm *": "deny" });
  const rc = tool({ name: "run_command", source: "generic" });
  expect(p.check(rc, { argv: ["git", "status"] })).toBe("allow");
  expect(p.check(rc, { argv: ["rm", "-rf", "x"] })).toBe("deny");
  expect(p.check(rc, { argv: ["ls"] })).toBe("ask");
});

test("mode hook", () => {
  let mode: Mode = "plan";
  const h = modeHook(() => mode, (t) => t === "ro");
  expect(h.run({ tool: "ro", args: {} })).toEqual({});
  expect(h.run({ tool: "w", adapter: "a", args: {} }).reason).toMatch(/^Plan mode/);
  mode = "follow";
  expect(h.run({ tool: "w", adapter: "a", args: {} }).decision).toBe("instruct");
  expect(h.run({ tool: "w", args: {} })).toEqual({});
  mode = "teach";
  expect(h.run({ tool: "w", adapter: "a", args: {} }).decision).toBe("deny");
  mode = "watch";
  expect(h.run({ tool: "w", adapter: "a", args: {} })).toEqual({});
});
