export const nodeTooOldMessage = (version) => `Cuvette needs Node.js 22 or newer. You have ${version}.`;

export function nodeTooOld(version) {
  return Number.parseInt(version.split(".")[0], 10) < 22;
}

export function main(version, stderr, exit) {
  if (!nodeTooOld(version)) return;
  stderr.write(`${nodeTooOldMessage(version)}\n`);
  exit(1);
}
