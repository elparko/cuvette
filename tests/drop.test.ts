import { expect, test } from "vitest";
import { dropFolder } from "../src/ui-web/lib/drop.ts";

test("a dropped folder is the folder", () => {
  expect(dropFolder([{ path: "/Users/a/data", dir: true }])).toBe("/Users/a/data");
});

test("a dropped file gives its parent folder", () => {
  expect(dropFolder([{ path: "/Users/a/data/s1.fcs", dir: false }])).toBe("/Users/a/data");
  expect(dropFolder([{ path: "/s1.fcs", dir: false }])).toBe("/");
  expect(dropFolder([{ path: "C:\\data\\s1.fcs", dir: false }])).toBe("C:\\data");
});

test("only the first item counts", () => {
  expect(dropFolder([{ path: "/a/x.csv", dir: false }, { path: "/b", dir: true }])).toBe("/a");
});

test("bad input gives null", () => {
  expect(dropFolder(null)).toBeNull();
  expect(dropFolder([])).toBeNull();
  expect(dropFolder([{ path: "", dir: true }])).toBeNull();
  expect(dropFolder([{ path: "s1.fcs", dir: false }])).toBeNull();
});
