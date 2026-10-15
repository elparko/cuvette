import { expect, test } from "vitest";
import { commands } from "../src/ui/commands.ts";
import { REVIEW_PURPOSE } from "../src/core/status.ts";

const REVIEW = "The review of the answer is still running. Type the command again when it ends.";
const TURN = "The agent is still working on this turn. Type the command again when the turn ends. Esc stops the turn.";

for (const name of ["export", "cite", "databook", "review"]) {
  for (const [state, purpose, text] of [["the review runs", REVIEW_PURPOSE, REVIEW], ["a turn runs", "Running a script", TURN]] as const) {
    test(`/${name} refuses while ${state}`, async () => {
      const errors: string[] = [];
      let touched = false;
      const session = new Proxy({ busy: true, lastStatus: { purpose } }, { get: (t, k) => (k in t ? (t as never)[k] : ((touched = true), undefined)) });
      const ctx = { session, error: (m: string) => errors.push(m), notice: () => (touched = true), print: () => (touched = true) };
      await commands.find((c) => c.name === name)!.run(name === "export" ? ["md"] : [], ctx as never);
      expect(errors).toEqual([text]);
      expect(touched).toBe(false);
    });
  }
}
