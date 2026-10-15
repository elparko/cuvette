import { expect, test } from "vitest";
import { feedEntry } from "../src/server/window.ts";

test("the panel feed labels a corrected answer", () => {
  expect(feedEntry({ id: 1, kind: "assistant", data: { final: true, text: "A." } })).toMatchObject({ text: "A." });
  expect(feedEntry({ id: 2, kind: "assistant", data: { final: true, text: "B.", corrects: 1 } })).toMatchObject({ text: "Corrected answer: B." });
});
