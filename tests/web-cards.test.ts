import { expect, test } from "vitest";
import { cardTakesFocus } from "../src/ui-web/lib/cards.ts";

const el = (inside: Element[] = []) => ({ contains: (x: Element) => inside.includes(x) }) as unknown as Element;

test("a card takes the focus from the page body and from its own buttons only", () => {
  const body = el();
  const button = el();
  const cards = el([button]);
  expect(cardTakesFocus(null, body, cards)).toBe(true);
  expect(cardTakesFocus(body, body, cards)).toBe(true);
  expect(cardTakesFocus(button, body, cards)).toBe(true);
  expect(cardTakesFocus(el(), body, cards)).toBe(false);
});
