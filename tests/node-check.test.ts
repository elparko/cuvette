import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error plain JavaScript file without types
import { main, nodeTooOld, nodeTooOldMessage } from "../bin/node-check.js";

describe("node check", () => {
  it("rejects a major version below 22", () => {
    expect(nodeTooOld("20.11.1")).toBe(true);
    expect(nodeTooOld("21.7.3")).toBe(true);
    expect(nodeTooOld("8.0.0")).toBe(true);
  });

  it("accepts 22 and newer", () => {
    expect(nodeTooOld("22.0.0")).toBe(false);
    expect(nodeTooOld("24.1.0")).toBe(false);
  });

  it("names the installed version in the message", () => {
    expect(nodeTooOldMessage("20.1.0")).toBe("Cuvette needs Node.js 22 or newer. You have 20.1.0.");
  });

  it("writes the message and exits with 1 for Node 20", () => {
    const stderr = { write: vi.fn() };
    const exit = vi.fn();
    main("20.0.0", stderr, exit);
    expect(stderr.write).toHaveBeenCalledWith("Cuvette needs Node.js 22 or newer. You have 20.0.0.\n");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("does nothing for Node 22", () => {
    const stderr = { write: vi.fn() };
    const exit = vi.fn();
    main("22.0.0", stderr, exit);
    expect(stderr.write).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("imports the check first in bin/cuvette.js", () => {
    const source = readFileSync(new URL("../bin/cuvette.js", import.meta.url), "utf8");
    const firstImport = source.split("\n").find((line) => line.startsWith("import "));
    expect(firstImport).toContain('"./node-check.js"');
  });
});
