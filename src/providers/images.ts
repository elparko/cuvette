import { readFileSync, statSync } from "node:fs";

export const MAX_IMAGE_BYTES = Math.floor(3.7 * 1024 * 1024);
export const MAX_IMAGES_PER_RESULT = 4;
export const IMAGE_BUDGET = 50;

export interface LoadedImage {
  media: string;
  data: string;
}

export function mediaType(b: Buffer): string | null {
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 6 && b.subarray(0, 4).toString("latin1") === "GIF8") return "image/gif";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

export function loadImage(path: string): LoadedImage | string {
  try {
    if (statSync(path).size > MAX_IMAGE_BYTES) return "too large";
    const buf = readFileSync(path);
    const media = mediaType(buf);
    if (!media) return "not PNG, JPEG, GIF or WebP";
    return { media, data: buf.toString("base64") };
  } catch {
    return "file not readable";
  }
}

export class ImageBudget {
  used = 0;

  pick(paths: string[]): { images: LoadedImage[]; note: string } {
    const images: LoadedImage[] = [];
    const notes: string[] = [];
    let skipped = 0;
    let overLimit = 0;
    for (const p of paths) {
      if (images.length >= MAX_IMAGES_PER_RESULT || this.used >= IMAGE_BUDGET) {
        overLimit++;
        continue;
      }
      const img = loadImage(p);
      if (typeof img === "string") {
        skipped++;
        continue;
      }
      images.push(img);
      this.used++;
    }
    if (skipped) notes.push(`${skipped} image(s) not attached (unreadable, unsupported type, or over 3.7 MB)`);
    if (overLimit) notes.push(`${overLimit} image(s) not attached (image limit reached)`);
    return { images, note: notes.join("; ") };
  }
}
