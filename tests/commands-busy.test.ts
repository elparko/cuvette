import { expect, test } from "vitest";
import { commands } from "../src/ui/commands.ts";

const TEXT = "The review of the answer is still running. Type the command again when it ends.";

for (const name of ["export", "cite", "databook", "review"]) {
  test(`/${name} refuses while the agent works`, async () => {
    const errors: string[] = [];
    let touched = false;
    const session = new Proxy({ busy: true }, { get: (t, k) => (k in t ? (t as never)[k] : ((touched = true), undefined)) });
    const ctx = { session, error: (m: string) => errors.push(m), notice: () => (touched = true), print: () => (touched = true) };
    await commands.find((c) => c.name === name)!.run(name === "export" ? ["md"] : [], ctx as never);
    expect(errors).toEqual([TEXT]);
    expect(touched).toBe(false);
  });
}
