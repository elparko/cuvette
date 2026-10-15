import { cpus, loadavg } from "node:os";
import { expect } from "vitest";

export const machineLoaded = () => loadavg()[0]! > cpus().length;

export function withinMs(elapsed: number, limit: number, label?: string) {
  if (machineLoaded()) return;
  expect(elapsed, label).toBeLessThan(limit);
}
