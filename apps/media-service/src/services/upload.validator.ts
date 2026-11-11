import crypto from 'crypto';
import path from 'path';

export interface ValidationResult {
  valid: boolean;
  mimeType: string;
  extension: string;
  error?: string;
}

const ALLOWED_MIME_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/heic': ['heic', 'heif'],
  'video/mp4': ['mp4'],
  'application/pdf': ['pdf'],
};

/**
 * Validates file signature / magic bytes directly from initial chunk.
 * Guarantees that executables or shell scripts disguised as images are rejected.
 */
export function validateMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // 3. WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  // 4. MP4 / ISO Base Media File: ....ftyp
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return { valid: true, detectedMime: 'video/mp4' };
  }

  // 5. PDF: %PDF
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
    return { valid: true, detectedMime: 'application/pdf' };
  }

  return { valid: false };
}

/**
 * Sanitizes filename: strips path characters, control characters, null bytes,
 * and dangerous double extensions like .jpg.exe
 */
export function sanitizeFilename(filename: string): { cleanName: string; extension: string } {
  if (!filename || typeof filename !== 'string') {
    return { cleanName: 'unnamed', extension: 'bin' };
  }

  const base = path.basename(filename).replace(/[\0\x00-\x1f\x7f]/g, '').trim();
  const lower = base.toLowerCase();

  // Dangerous extension rejection (.exe, .php, .sh, .bat, etc.)
  const dangerousPattern = /\.(exe|php|phtml|sh|bat|cmd|vbs|js|mjs|cgi|py|pl|jar)\b/i;
  if (dangerousPattern.test(lower)) {
    throw new Error('SECURITY_ERROR: Dangerous file extension detected.');
  }

  const parts = base.split('.');
  const extension = parts.length > 1 ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const cleanName = parts.join('.').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);

  return { cleanName: `${cleanName}.${extension}`, extension };
}

