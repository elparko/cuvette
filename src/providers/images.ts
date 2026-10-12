import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { imageSize, scaledCopy, scaledCopySync } from "../core/thumbs.ts";

export const MAX_IMAGE_BYTES = Math.floor(3.7 * 1024 * 1024);
export const MAX_IMAGES_PER_RESULT = 4;
export const IMAGE_BUDGET = 50;
// Claude scales larger images down to about this size, and refuses a side over 2000 pixels when a request has many images.
export const MAX_SIDE = 1568;

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

// Each model step sends the full history again. The cache keeps the encoded images, so that a step does not read and encode them again.
const CACHE_BYTES = 64 * 1024 * 1024;
const cache = new Map<string, LoadedImage>();
let cached = 0;

export function loadImage(path: string): LoadedImage | string {
  let key: string;
  try {
    const st = statSync(path);
    key = `${path}\0${st.size}\0${st.mtimeMs}`;
  } catch {
    return "file not readable";
  }
  const hit = cache.get(key);
  if (hit) return hit;
  const img = readImage(path);
  if (typeof img === "string" || img.data.length > CACHE_BYTES) return img;
  cache.set(key, img);
  cached += img.data.length;
  for (const [k, v] of cache) {
    if (cached <= CACHE_BYTES) break;
    cache.delete(k);
    cached -= v.data.length;
  }
  return img;
}

// Makes the smaller copies before the model step, without a block of the event loop.
export async function prepareImages(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (p) => {
      try {
        const head = Buffer.alloc(64 * 1024);
        const fd = openSync(p, "r");
        let n: number;
        try {
          n = readSync(fd, head, 0, head.length, 0);
        } finally {
          closeSync(fd);
        }
        const media = mediaType(head.subarray(0, n));
        const size = imageSize(head.subarray(0, n));
        if (media && (statSync(p).size > MAX_IMAGE_BYTES || (size && Math.max(size.w, size.h) > MAX_SIDE))) await scaledCopy(p, MAX_SIDE, media === "image/jpeg" ? "jpeg" : "png");
      } catch {}
    }),
  );
}

function readImage(path: string): LoadedImage | string {
  try {
    let buf = readFileSync(path);
    let media = mediaType(buf);
    if (!media) return "not PNG, JPEG, GIF or WebP";
    const size = imageSize(buf);
    if ((size && Math.max(size.w, size.h) > MAX_SIDE) || buf.length > MAX_IMAGE_BYTES) {
      const small = scaledCopySync(path, MAX_SIDE, media === "image/jpeg" ? "jpeg" : "png");
      if (!small) return "too large";
      buf = readFileSync(small);
      media = mediaType(buf);
      if (!media || buf.length > MAX_IMAGE_BYTES) return "too large";
    }
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
    if (skipped) notes.push(`${skipped} image(s) not attached (unreadable, unsupported type, or too large to resize)`);
    if (overLimit) notes.push(`${overLimit} image(s) not attached (image limit reached)`);
    return { images, note: notes.join("; ") };
  }
}
