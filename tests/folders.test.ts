import { expect, test } from "vitest";
import { foldText, folderChoices, folderLabels } from "../src/ui-web/lib/folders.ts";

test("the search text matches the composed and the decomposed form of a letter", () => {
  expect(foldText("caf\u00e9")).toBe(foldText("cafe\u0301"));
  expect(foldText("Caf\u00e9")).toContain("cafe");
});

test("two folders with the same last name get the name of the parent folder", () => {
  const labels = folderLabels(["/a/data", "/b/data", "/a/other", "C:\\lab\\plates"]);
  expect(labels.get("/a/data")).toBe("data (a)");
  expect(labels.get("/b/data")).toBe("data (b)");
  expect(labels.get("/a/other")).toBe("other");
  expect(labels.get("C:\\lab\\plates")).toBe("plates");
});

test("two folders that differ only by text-direction characters get different labels", () => {
  const list = [
    { folder: "/lab/plates", folderShown: "/lab/plates" },
    { folder: "/lab/pla\u202etes", folderShown: "/lab/plates" },
    { folder: "/lab/other", folderShown: "/lab/other" },
  ];
  const choices = folderChoices(list);
  const labels = choices.map((c) => c.label);
  expect(new Set(labels).size).toBe(3);
  expect(choices.find((c) => c.value === "/lab/other")!.label).toBe("other");
  expect(choices.filter((c) => c.label.startsWith("plates")).map((c) => c.label).sort()).toEqual(["plates #1", "plates #2"]);
});
