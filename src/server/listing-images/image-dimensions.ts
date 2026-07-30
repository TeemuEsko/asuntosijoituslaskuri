export type ImageDimensions = { width: number; height: number };

function uint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | bytes[offset + 1]! << 8 | bytes[offset + 2]! << 16;
}

export function readImageDimensions(bytes: Uint8Array, mediaType: "image/jpeg" | "image/png" | "image/webp"): ImageDimensions | null {
  if (mediaType === "image/png") {
    if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47 || bytes[4] !== 0x0d || bytes[5] !== 0x0a || bytes[6] !== 0x1a || bytes[7] !== 0x0a || String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mediaType === "image/jpeg") {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    for (let offset = 2; offset + 8 < bytes.length;) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1]!;
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = bytes[offset + 2]! << 8 | bytes[offset + 3]!;
      if (length < 2 || offset + length + 2 > bytes.length) return null;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { height: bytes[offset + 5]! << 8 | bytes[offset + 6]!, width: bytes[offset + 7]! << 8 | bytes[offset + 8]! };
      }
      offset += length + 2;
    }
    return null;
  }
  if (bytes.length < 30 || String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") return null;
  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  if (chunk === "VP8X") return { width: 1 + uint24LittleEndian(bytes, 24), height: 1 + uint24LittleEndian(bytes, 27) };
  if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: (bytes[26]! | bytes[27]! << 8) & 0x3fff, height: (bytes[28]! | bytes[29]! << 8) & 0x3fff };
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    const bits = bytes[21]! | bytes[22]! << 8 | bytes[23]! << 16 | bytes[24]! << 24;
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}
