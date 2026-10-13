export interface DroppedItem {
  path: string;
  dir: boolean;
}

export function dropFolder(items: unknown): string | null {
  if (!Array.isArray(items)) return null;
  const first = items[0] as Partial<DroppedItem> | undefined;
  if (!first || typeof first.path !== "string" || !first.path) return null;
  if (first.dir) return first.path;
  const cut = Math.max(first.path.lastIndexOf("/"), first.path.lastIndexOf("\\"));
  if (cut < 0) return null;
  return cut === 0 ? first.path.slice(0, 1) : first.path.slice(0, cut);
}

export const dropZones = { n: 0, dragging: false };

export const hasFiles = (e: { dataTransfer: DataTransfer | null }) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
