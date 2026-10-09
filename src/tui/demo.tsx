import { FakeSession } from "../ui/fake-session.ts";
import { runTui } from "./app.tsx";

const session = new FakeSession({ mode: process.env.CUVETTE_DEMO_MODE === "follow" ? "follow" : "watch" });
await runTui(session, { autoSetup: process.env.CUVETTE_DEMO_SETUP !== "off" });
