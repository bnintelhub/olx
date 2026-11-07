import { redis } from '../../config/redis';
import { SpamCheckResult } from './chat.types';

// In-memory fallback if Redis is unavailable
const memoryRateLimits = new Map<string, { count: number; expiresAt: number }>();

export class ChatAbuseService {
  private static sanitizeText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Strip zero-width spaces
      .trim();
  }

  // Rate Limiting using Redis with In-Memory fallback
  static async checkRateLimits(userId: string, conversationId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const now = Date.now();

    // 1. User message limit: max 25 messages per minute
    const userKey = `ratelimit:chat:user:${userId}:minute`;
    // 2. Conversation flood limit: max 10 messages per 10 seconds
    const convKey = `ratelimit:chat:conv:${conversationId}:10s`;

    try {
      if (redis.status === 'ready' || redis.status === 'connect') {
        const userCount = await redis.incr(userKey);
        if (userCount === 1) await redis.expire(userKey, 60);

        const convCount = await redis.incr(convKey);
        if (convCount === 1) await redis.expire(convKey, 10);

        if (userCount > 25) {
          return { allowed: false, retryAfter: 60 };
        }
        if (convCount > 10) {
          return { allowed: false, retryAfter: 10 };
        }
        return { allowed: true };
      }
    } catch {
      // Redis unavailable: fallback to in-memory
    }

    // Fallback: In-memory window
    const memEntry = memoryRateLimits.get(userKey);
    if (!memEntry || memEntry.expiresAt < now) {
      memoryRateLimits.set(userKey, { count: 1, expiresAt: now + 60000 });
      return { allowed: true };
    }

    memEntry.count += 1;
    if (memEntry.count > 25) {
      return { allowed: false, retryAfter: Math.ceil((memEntry.expiresAt - now) / 1000) };
    }

    return { allowed: true };
  }

  // New conversation creation limit: relaxed in development, max 25/hr in prod
  static async checkNewConversationLimit(userId: string): Promise<{ allowed: boolean }> {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) return { allowed: true };
    const key = `ratelimit:chat:newconv:${userId}:hour`;
    try {
      if (redis.status === 'ready' || redis.status === 'connect') {
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, 3600);
        return { allowed: count <= 25 };
      }
    } catch {
      // ignore
    }
    return { allowed: true };
  }

  // Risk Scoring (0 to 100) & Pattern Detection
  static analyzeMessageRisk(content: string, previousMessages: string[] = []): SpamCheckResult {
    const clean = this.sanitizeText(content || '');
    if (!clean) {
      return { allowed: false, riskScore: 100, riskLevel: 'CRITICAL', reason: 'Empty message' };
    }

    let riskScore = 0;
    const detectedPatterns: string[] = [];

    // 1. Phone number patterns: Indian 10-digit mobile numbers with optional prefixes
    const phonePattern = /(?:(?:\+?91|0)?[ -]?)?[6-9]\d{4}[ -]?\d{5}\b|\b\d{5}[ -]\d{5}\b/;
    if (phonePattern.test(clean)) {
      riskScore += 20;
      detectedPatterns.push('phone');
    }

    // 2. Email addresses
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (emailPattern.test(clean)) {
      riskScore += 25;
      detectedPatterns.push('email');
    }

    // 3. External URLs / Messaging redirects
    const urlPattern = /(https?:\/\/|www\.|t\.me\/|wa\.me\/|bit\.ly\/)/i;
    if (urlPattern.test(clean)) {
      riskScore += 30;
      detectedPatterns.push('url');
    }

    // 4. UPI ID patterns
    const upiPattern = /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/;
    if (upiPattern.test(clean)) {
      riskScore += 35;
      detectedPatterns.push('upi');
    }

    // 5. Payment fraud & Advance payment scam keywords
    const scamKeywords = [
      'advance payment',
      'advance paise',
      'courier charge',
      'scanner bhejo',
      'send qr',
      'qr code',
      'scan to receive',
      'transfer money first',
      'google pay karo',
      'phonepe karo',
      'share otp',
      'enter otp',
      'give otp',
    ];
    const lower = clean.toLowerCase();
    const hasScamKeyword = scamKeywords.some((kw) => lower.includes(kw));
    if (hasScamKeyword) {
      riskScore += 50;
      detectedPatterns.push('scam_keyword');
    }

    // 6. Repeated identical message detection (Copy-Paste Flood)
    if (previousMessages.length > 0) {
      const matchCount = previousMessages.filter((msg) => msg.toLowerCase() === lower).length;
      if (matchCount >= 2) {
        riskScore += 30;
        detectedPatterns.push('duplicate');
      }
    }

    // Determine risk level & user-facing safety guidance
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let safetyNotice: string | null = null;

    if (riskScore >= 80) {
      riskLevel = 'CRITICAL';
      safetyNotice = 'Safety Alert: This message was flagged for potential payment fraud or phishing.';
    } else if (riskScore >= 50) {
      riskLevel = 'HIGH';
      safetyNotice = 'Safety Advice: Never transfer money in advance or share OTPs before inspecting the item in person.';
    } else if (riskScore >= 20) {
      riskLevel = 'MEDIUM';
      safetyNotice = 'Caution: Please keep all communications and payments secure on OLX.';
    }

    return {
      allowed: riskScore < 85, // Reject messages that exceed 85 (blatant phishing/fraud)
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      safetyNotice,
      reason: detectedPatterns.length ? `Detected: ${detectedPatterns.join(', ')}` : null,
    };
  }

  // Image validation: checks file extension and MIME type
  static validateImageUpload(mimeType: string, fileSize: number): { valid: boolean; error?: string } {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      return { valid: false, error: 'Only JPG, PNG, and WebP images are permitted' };
    }

    if (fileSize > maxSizeBytes) {
      return { valid: false, error: 'Image exceeds the 5MB maximum file size' };
    }

    return { valid: true };
  }
}
