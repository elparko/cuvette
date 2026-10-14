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

export const IMAGE_PASTE_HELP = "Cuvette cannot take a pasted image. Save the image in the data folder and write its file name in your message.";

export const pastedImageOnly = (data: { files: ArrayLike<{ type: string }>; types: ArrayLike<string> } | null) =>
  !!data && Array.from(data.files).some((f) => f.type.startsWith("image/")) && !Array.from(data.types).includes("text/plain");
