export const foldText = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function folderLabels(folders: string[]): Map<string, string> {
  const parts = (f: string) => f.split(/[\\/]/).filter(Boolean);
  const last = (f: string) => parts(f).at(-1) || f;
  const count = new Map<string, number>();
  for (const f of folders) count.set(last(f), (count.get(last(f)) ?? 0) + 1);
  return new Map(folders.map((f) => [f, (count.get(last(f)) ?? 0) > 1 ? `${last(f)} (${parts(f).at(-2) ?? "/"})` : last(f)]));
}
