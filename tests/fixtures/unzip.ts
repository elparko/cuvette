import { inflateRawSync } from "node:zlib";
import { crc32 } from "../../src/eln/zip.ts";

export function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central header");
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString("utf8");
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + csize);
    const data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    if (crc32(data) !== crc) throw new Error(`bad crc for ${name}`);
    out.set(name, data);
    p += 46 + nlen + elen + clen;
  }
  return out;
}
