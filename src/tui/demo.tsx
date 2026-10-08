import { FakeSession } from "./fake-session.ts";
import { runTui } from "./app.tsx";

const session = new FakeSession({ mode: process.env.GA_DEMO_MODE === "follow" ? "follow" : "watch" });
await runTui(session, { autoSetup: process.env.GA_DEMO_SETUP !== "off" });
