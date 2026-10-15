import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript file without types
import { nodeTooOld, nodeTooOldMessage } from "../bin/node-check.js";

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
});
