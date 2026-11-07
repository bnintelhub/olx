import { describe, it, expect } from 'vitest';
import { ChatAbuseService } from '../../src/modules/chat/chat.abuse.service';

describe('ChatAbuseService - Anti-Abuse & Scam Detection', () => {
  it('should allow normal marketplace inquiry with 0 risk score', () => {
    const result = ChatAbuseService.analyzeMessageRisk('Hi, is this Honda City still available for a test drive?');
    expect(result.allowed).toBe(true);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('LOW');
    expect(result.safetyNotice).toBeNull();
  });

  it('should detect phone number pattern and attach cautionary guidance', () => {
    const result = ChatAbuseService.analyzeMessageRisk('Call me on 9876543210 to discuss price');
    expect(result.allowed).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(20);
    expect(result.safetyNotice).toBeTruthy();
  });

  it('should detect external links and URLs', () => {
    const result = ChatAbuseService.analyzeMessageRisk('Check this listing on https://fake-deal.com/item');
    expect(result.allowed).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(30);
  });

  it('should detect UPI IDs in message', () => {
    const result = ChatAbuseService.analyzeMessageRisk('Send token amount to seller@okhdfcbank');
    expect(result.allowed).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(35);
  });

  it('should detect advance payment scam keywords and raise high risk', () => {
    const result = ChatAbuseService.analyzeMessageRisk('Please pay advance payment courier charge first');
    expect(result.riskScore).toBeGreaterThanOrEqual(45);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.safetyNotice).toContain('Never transfer money in advance');
  });

  it('should detect combined scam patterns and reject critical fraudulent messages', () => {
    const scamText = 'Pay advance payment now to upi seller@oksbi or scan qr code and share otp to confirm';
    const result = ChatAbuseService.analyzeMessageRisk(scamText);
    expect(result.riskScore).toBeGreaterThanOrEqual(80);
    expect(result.riskLevel).toBe('CRITICAL');
  });

  it('should detect copy-paste flood from identical messages', () => {
    const previous = ['Is this available?', 'Is this available?'];
    const result = ChatAbuseService.analyzeMessageRisk('Is this available?', previous);
    expect(result.riskScore).toBeGreaterThanOrEqual(30);
  });

  it('should validate allowed image mime types and file sizes', () => {
    const valid = ChatAbuseService.validateImageUpload('image/jpeg', 1024 * 1024);
    expect(valid.valid).toBe(true);

    const oversized = ChatAbuseService.validateImageUpload('image/png', 10 * 1024 * 1024);
    expect(oversized.valid).toBe(false);
    expect(oversized.error).toContain('5MB');

    const badExt = ChatAbuseService.validateImageUpload('application/x-executable', 500);
    expect(badExt.valid).toBe(false);
  });
});
