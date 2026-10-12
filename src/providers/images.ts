import { readFileSync } from "node:fs";
import { open } from "node:fs/promises";
import type { Message } from "../core/types.ts";
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

export function loadImage(path: string): LoadedImage | string {
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

async function needsScaling(path: string): Promise<"png" | "jpeg" | undefined> {
  try {
    const fh = await open(path, "r");
    try {
      const { size: bytes } = await fh.stat();
      const head = Buffer.alloc(Math.min(bytes, 256 * 1024));
      await fh.read(head, 0, head.length, 0);
      const media = mediaType(head);
      if (media !== "image/png" && media !== "image/jpeg") return undefined;
      const size = imageSize(head);
      return (size && Math.max(size.w, size.h) > MAX_SIDE) || bytes > MAX_IMAGE_BYTES ? (media === "image/jpeg" ? "jpeg" : "png") : undefined;
    } finally {
      await fh.close();
    }
  } catch {
    return undefined;
  }
}

// Makes the scaled copies before the request, so that a stop from the scientist ends a slow resize.
export async function prepareImages(messages: Message[], signal?: AbortSignal): Promise<void> {
  const paths: string[] = [];
  for (const m of messages)
    for (const p of m.parts) {
      if (p.type === "tool_result" && !p.isError) paths.push(...(p.images ?? []).slice(0, MAX_IMAGES_PER_RESULT));
      else if (p.type === "image") paths.push(p.path);
    }
  await scaleImages(paths.slice(0, IMAGE_BUDGET), signal);
}

export async function scaleImages(paths: string[], signal?: AbortSignal): Promise<void> {
  for (const p of paths) {
    signal?.throwIfAborted();
    const format = await needsScaling(p);
    if (format) await scaledCopy(p, MAX_SIDE, format, signal);
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
