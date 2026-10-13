import { expect, test } from "vitest";
import { taskTool } from "../src/tools/task.ts";
import { FakeProvider } from "../src/providers/fake.ts";

test("the helper agent gets the folder note before its job", async () => {
  const provider = new FakeProvider([{ text: "Nothing wrong." }]);
  const tool = taskTool({ provider: () => provider, tools: () => [], run: async () => ({ text: "", isError: false }), folders: () => "Folders of this session. The project folder is /data/exp1." });
  const out = await tool.execute({ job: "Look at the images." }, { callId: "c1", signal: new AbortController().signal } as never);
  expect(out.ok).toBe(true);
  const first = provider.requests[0].messages[0].parts[0] as { text: string };
  expect(first.text).toBe("Folders of this session. The project folder is /data/exp1.\n\nLook at the images.");
});
