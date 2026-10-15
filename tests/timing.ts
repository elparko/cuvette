import { cpus, loadavg } from "node:os";
import { expect } from "vitest";

export const machineLoaded = () => loadavg()[0]! > cpus().length;

export function withinMs(elapsed: number, limit: number, label?: string) {
  if (machineLoaded()) {
    console.warn(`time limit skipped${label ? ` for "${label}"` : ""}: ${Math.round(elapsed)} ms of ${limit} ms, load ${loadavg()[0]!.toFixed(1)} on ${cpus().length} cpus`);
    return;
  }
  expect(elapsed, label).toBeLessThan(limit);
}
