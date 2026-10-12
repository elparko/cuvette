import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { imageSize, scaledCopy, scaledCopySync } from "../src/core/thumbs.ts";
import { loadImage, MAX_SIDE, prepareImages, scaleImages } from "../src/providers/images.ts";

const mac = process.platform === "darwin";

function png(w: number, h: number): string {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-thumbs-"));
  const f = join(dir, "big.png");
  execFileSync("python3", ["-I", "-c", `
import struct, zlib, sys
w, h = ${w}, ${h}
raw = b"".join(b"\\x00" + bytes([200, 40, 40]) * w for _ in range(h))
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
open(sys.argv[1], "wb").write(b"\\x89PNG\\r\\n\\x1a\\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))
`, f]);
  return f;
}

test("the size reader reads PNG and JPEG headers", () => {
  expect(imageSize(readFileSync(png(31, 17)))).toEqual({ w: 31, h: 17 });
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0, 0, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x20, 0x00, 0x40, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  expect(imageSize(jpeg)).toEqual({ w: 64, h: 32 });
  expect(imageSize(Buffer.from("not an image"))).toBeNull();
});

test.runIf(mac)("an image larger than the model limit goes to the model as a smaller copy", () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-thumbs-home-"));
  const img = loadImage(png(3200, 1600));
  expect(typeof img).toBe("object");
  const size = imageSize(Buffer.from((img as { data: string }).data, "base64"))!;
  expect(Math.max(size.w, size.h)).toBe(MAX_SIDE);
  expect(size.w / size.h).toBeCloseTo(2, 1);
});

test.runIf(mac)("thumbnails are cached JPEG copies", async () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-thumbs-home-"));
  const f = png(1200, 900);
  const a = await scaledCopy(f, 300, "jpeg");
  expect(a).toMatch(/\.jpg$/);
  expect(imageSize(readFileSync(a!))).toEqual({ w: 300, h: 225 });
  expect(scaledCopySync(f, 300, "jpeg")).toBe(a);
  writeFileSync(f, readFileSync(png(400, 400)));
  expect(await scaledCopy(f, 300, "jpeg")).not.toBe(a);
});

test.runIf(mac)("a stop from the scientist ends the resize before the request", async () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-thumbs-home-"));
  const f = png(3200, 1600);
  const ac = new AbortController();
  ac.abort();
  await expect(prepareImages([{ role: "user", parts: [{ type: "image", path: f }] }], ac.signal)).rejects.toThrow();
  await prepareImages([{ role: "user", parts: [{ type: "image", path: f }] }]);
  const img = loadImage(f) as { data: string };
  expect(Math.max(...Object.values(imageSize(Buffer.from(img.data, "base64"))!))).toBe(MAX_SIDE);
});

test("a loaded image shows the new file after the file changes", () => {
  const f = png(40, 20);
  loadImage(f);
  writeFileSync(f, readFileSync(png(30, 30)));
  const b = loadImage(f) as { data: string };
  expect(imageSize(Buffer.from(b.data, "base64"))).toEqual({ w: 30, h: 30 });
});

test.runIf(mac)("scaleImages makes the smaller copy before the model step", async () => {
  const home = mkdtempSync(join(tmpdir(), "cuvette-thumbs-home-"));
  process.env.CUVETTE_HOME = home;
  const f = png(2400, 1200);
  await scaleImages([f, png(100, 100), join(tmpdir(), "no-such-image.png")]);
  expect(readdirSync(join(home, "cache", "images"))).toHaveLength(1);
});
