export const foldText = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function folderLabels(folders: string[]): Map<string, string> {
  const parts = (f: string) => f.split(/[\\/]/).filter(Boolean);
  const last = (f: string) => parts(f).at(-1) || f;
  const count = new Map<string, number>();
  for (const f of folders) count.set(last(f), (count.get(last(f)) ?? 0) + 1);
  return new Map(folders.map((f) => [f, (count.get(last(f)) ?? 0) > 1 ? `${last(f)} (${parts(f).at(-2) ?? "/"})` : last(f)]));
}

export function folderChoices(list: { folder: string; folderShown: string }[]): { value: string; label: string }[] {
  const folders = [...new Set(list.map((s) => s.folder).filter(Boolean))].sort();
  const shown = new Map(list.map((s) => [s.folder, s.folderShown] as const));
  const labels = folderLabels([...new Set(folders.map((f) => shown.get(f) ?? f))].sort());
  return folders.map((f) => ({ value: f, label: labels.get(shown.get(f) ?? f) ?? f }));
}
