export const nodeTooOldMessage = (version) => `Cuvette needs Node.js 22 or newer. You have ${version}.`;

export function nodeTooOld(version) {
  return Number.parseInt(version.split(".")[0], 10) < 22;
}

if (nodeTooOld(process.versions.node)) {
  process.stderr.write(`${nodeTooOldMessage(process.versions.node)}\n`);
  process.exit(1);
}
