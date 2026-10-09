import { lintReport } from "./core/ste.ts";

console.log(lintReport(process.cwd(), { verbose: process.argv.includes("--verbose"), github: !!process.env.GITHUB_ACTIONS }));
