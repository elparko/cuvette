import { expect, test } from "vitest";
import { assumptionBlock, fileFits, withoutWaits } from "../src/core/answers.ts";
import type { Question } from "../src/core/types.ts";

test("withoutWaits takes the list under the heading and keeps the rest", () => {
  const r = withoutWaits("Result.\n\nWaits for you:\n- Confirm the units.\n- Check the file.\n\nEnd.");
  expect(r.open).toEqual(["Confirm the units.", "Check the file."]);
  expect(r.answer).toBe("Result.\n\nEnd.");
});

test("withoutWaits removes a Nothing line and makes no open point", () => {
  for (const word of ["Nothing.", "None.", "none"]) {
    const r = withoutWaits(`Result.\n\nWaits for you:\n${word}\n`);
    expect(r.open).toEqual([]);
    expect(r.answer).toBe("Result.");
  }
  expect(withoutWaits("Result.\n\nWaits for you: Nothing.").answer).toBe("Result.");
});

test("withoutWaits stops the list at a blank line that is followed by a heading or a plain line", () => {
  const r = withoutWaits("Waits for you:\n- Confirm the units.\n\nNext section:\n- Other bullet.\n");
  expect(r.open).toEqual(["Confirm the units."]);
  expect(r.answer).toBe("Next section:\n- Other bullet.");
});

test("withoutWaits leaves a bold line and an answer with no heading", () => {
  expect(withoutWaits("Waits for you:\n- One.\n**Note:** text.").answer).toBe("**Note:** text.");
  expect(withoutWaits("No heading here.")).toEqual({ answer: "No heading here.", open: [] });
});

test("assumptionBlock lists the used values and the open points, or nothing", () => {
  expect(assumptionBlock(["Sigma: used 2."], ["Confirm the units."])).toBe("Assumed because no answer was given:\n- Sigma: used 2.\n- Not confirmed by the scientist: Confirm the units.");
  expect(assumptionBlock([], [])).toBe("");
});

test("fileFits accepts an option value, an option label and a close label, and refuses other text", () => {
  const q = { options: [{ value: "otsu", label: "Otsu method" }] } as unknown as Question;
  expect(fileFits(q, "otsu")).toBe(true);
  expect(fileFits(q, "Otsu method")).toBe(true);
  expect(fileFits(q, "otsu")).toBe(true);
  expect(fileFits(q, "banana")).toBe(false);
});
