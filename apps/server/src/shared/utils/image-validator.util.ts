import fs from 'fs';

export interface ValidatedImageInfo {
  format: 'jpeg' | 'png' | 'webp' | 'heic';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';
  extension: '.jpg' | '.png' | '.webp' | '.heic';
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// Inspects actual magic bytes to reject disguised or malicious executables
export function validateImageMagicBytes(buffer: Buffer): ValidatedImageInfo | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: 0xFF, 0xD8, 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      format: 'jpeg',
      mimeType: 'image/jpeg',
      extension: '.jpg',
    };
  }

  // PNG: 0x89, 0x50, 0x4E, 0x47 (89 'P' 'N' 'G')
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      format: 'png',
      mimeType: 'image/png',
      extension: '.png',
    };
  }

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
  const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
  if (isRiff && isWebp) {
    return {
      format: 'webp',
      mimeType: 'image/webp',
      extension: '.webp',
    };
  }

  // HEIC / HEIF: ISOBMFF ftyp at offset 4
  const isFtyp = buffer.toString('ascii', 4, 8) === 'ftyp';
  if (isFtyp) {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();
    const heicBrands = ['heic', 'heix', 'hevc', 'heim', 'heis', 'heif', 'mif1', 'msf1'];
    if (heicBrands.includes(brand)) {
      return {
        format: 'heic',
        mimeType: 'image/heic',
        extension: '.heic',
      };
    }
  }

  return null;
}

// Fast synchronous header parsing for PNG, WebP, JPEG, and HEIC
export function parseImageDimensions(buffer: Buffer): ImageDimensions | null {
  if (!buffer || buffer.length < 16) return null;

  // 1. PNG (IHDR chunk at offset 8, dimensions at 16 & 20)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    if (buffer.length >= 24) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }
  }

  // 2. WebP (RIFF....WEBP)
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const format = buffer.toString('ascii', 12, 16);
    // VP8X (Extended WebP)
    if (format === 'VP8X' && buffer.length >= 30) {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height };
    }
    // VP8 (Lossy WebP)
    if (format === 'VP8 ' && buffer.length >= 30) {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
    // VP8L (Lossless WebP)
    if (format === 'VP8L' && buffer.length >= 25) {
      const b0 = buffer[21];
      const b1 = buffer[22];
      const b2 = buffer[23];
      const b3 = buffer[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width, height };
    }
  }

  // 3. JPEG (SOI 0xFFD8)
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xff || marker === 0x00) {
        offset++;
        continue;
      }
      // SOF markers: Baseline, Extended, Progressive, Lossless, etc.
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      if (marker === 0xd9 || marker === 0xda) {
        break; // End of header or start of scan
      }
      if (offset + 4 > buffer.length) break;
      const len = buffer.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }

  // 4. HEIC / HEIF (ispe box in ISOBMFF meta)
  const ispeIdx = buffer.indexOf('ispe');
  if (ispeIdx !== -1 && ispeIdx + 16 <= buffer.length) {
    const width = buffer.readUInt32BE(ispeIdx + 8);
    const height = buffer.readUInt32BE(ispeIdx + 12);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  return null;
}

// Reads image dimensions from buffer or inspects the first 64KB of the temporary file
export async function getImageDimensions(
  buffer: Buffer,
  filePath?: string
): Promise<ImageDimensions | null> {
  const fromBuffer = parseImageDimensions(buffer);
  if (fromBuffer) return fromBuffer;

  if (filePath && fs.existsSync(filePath)) {
    try {
      const fd = await fs.promises.open(filePath, 'r');
      try {
        const headerBuf = Buffer.alloc(65536);
        const { bytesRead } = await fd.read(headerBuf, 0, 65536, 0);
        return parseImageDimensions(headerBuf.subarray(0, bytesRead));
      } finally {
        await fd.close();
      }
    } catch {
      return null;
    }
  }

  return null;
}


