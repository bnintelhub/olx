import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatPresenceService } from '../../src/modules/chat/chat.presence.service';
import { ChatService } from '../../src/modules/chat/chat.service';
import { prisma } from '../../src/config/prisma';

vi.mock('../../src/config/prisma', () => ({
  prisma: {
    ad: { findUnique: vi.fn() },
    block: { findFirst: vi.fn(), upsert: vi.fn() },
    conversation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    message: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    report: { create: vi.fn() },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock('../../src/config/redis', () => ({
  redis: {
    status: 'ready',
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
  },
}));

describe('ChatPresenceService', () => {
  it('tracks socket connections and determines presence status', async () => {
    const userId = 'user-test-presence';
    expect(await ChatPresenceService.isUserOnline(userId)).toBe(false);

    await ChatPresenceService.setUserOnline(userId, 'socket-client-1');
    expect(await ChatPresenceService.isUserOnline(userId)).toBe(true);

    const completelyOffline = await ChatPresenceService.setUserOffline(userId, 'socket-client-1');
    expect(completelyOffline).toBe(true);
    expect(await ChatPresenceService.isUserOnline(userId)).toBe(false);
  });

  it('throttles excessive typing event broadcasts', () => {
    const convId = 'conv-presence-test';
    const userId = 'user-typing-presence';

    expect(ChatPresenceService.shouldThrottleTyping(convId, userId)).toBe(false);
    expect(ChatPresenceService.shouldThrottleTyping(convId, userId)).toBe(true);
  });
});

describe('ChatService - Business Rules & Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects conversation initiation if buyer is the listing owner', async () => {
    vi.mocked(prisma.ad.findUnique).mockResolvedValueOnce({
      id: 'ad-1',
      userId: 'user-seller',
      status: 'ACTIVE',
      deletedAt: null,
    } as any);

    await expect(
      ChatService.startConversation('user-seller', 'ad-1')
    ).rejects.toThrow('You cannot initiate a conversation on your own listing');
  });

  it('rejects conversation initiation if listing is rejected or archived', async () => {
    vi.mocked(prisma.ad.findUnique).mockResolvedValueOnce({
      id: 'ad-inactive',
      userId: 'user-seller',
      status: 'REJECTED',
      deletedAt: null,
    } as any);

    await expect(
      ChatService.startConversation('user-buyer', 'ad-inactive')
    ).rejects.toThrow('Listing is not eligible for chat inquiries');
  });

  it('rejects conversation initiation if users have blocked each other', async () => {
    vi.mocked(prisma.ad.findUnique).mockResolvedValueOnce({
      id: 'ad-1',
      userId: 'user-seller',
      status: 'ACTIVE',
      deletedAt: null,
    } as any);
    vi.mocked(prisma.block.findFirst).mockResolvedValueOnce({ id: 'block-1' } as any);

    await expect(
      ChatService.startConversation('user-buyer', 'ad-1')
    ).rejects.toThrow('Communication is restricted with this user');
  });

  it('returns existing conversation without duplicating if one exists', async () => {
    vi.mocked(prisma.ad.findUnique).mockResolvedValueOnce({
      id: 'ad-1',
      userId: 'user-seller',
      status: 'ACTIVE',
      deletedAt: null,
    } as any);
    vi.mocked(prisma.block.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce({
      id: 'conv-existing-123',
      adId: 'ad-1',
      buyerId: 'user-buyer',
      sellerId: 'user-seller',
      ad: {
        id: 'ad-1',
        title: 'Honda City',
        price: 500000,
        status: 'ACTIVE',
        slug: 'honda-city',
        images: [],
      },
      buyer: { id: 'user-buyer', profile: { name: 'Buyer' } },
      seller: { id: 'user-seller', profile: { name: 'Seller' } },
    } as any);

    const conv = await ChatService.startConversation('user-buyer', 'ad-1');
    expect(conv.id).toBe('conv-existing-123');
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });

  it('enforces participant authorization on message send', async () => {
    vi.mocked(prisma.message.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce({
      id: 'conv-1',
      buyerId: 'user-buyer',
      sellerId: 'user-seller',
      isBlocked: false,
    } as any);

    await expect(
      ChatService.sendMessage('intruder-user', {
        conversationId: 'conv-1',
        content: 'Unauthorized message',
      })
    ).rejects.toThrow('Access denied to this conversation');
  });

  it('rejects malicious scam messages with HTTP 400', async () => {
    vi.mocked(prisma.message.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce({
      id: 'conv-1',
      buyerId: 'user-buyer',
      sellerId: 'user-seller',
      isBlocked: false,
    } as any);
    vi.mocked(prisma.block.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);

    await expect(
      ChatService.sendMessage('user-buyer', {
        conversationId: 'conv-1',
        content: 'Pay advance payment now to upi seller@oksbi or scan qr code and share otp to confirm',
      })
    ).rejects.toThrow(/Detected:.*scam_keyword/);
  });

  it('handles message idempotency via clientMessageId', async () => {
    vi.mocked(prisma.message.findFirst).mockResolvedValueOnce({
      id: 'msg-idempotent-456',
      conversationId: 'conv-1',
      clientMessageId: 'client-uuid-123',
      content: 'Hello',
      deletedAt: null,
    } as any);

    const res = await ChatService.sendMessage('user-buyer', {
      conversationId: 'conv-1',
      content: 'Hello',
      clientMessageId: 'client-uuid-123',
    });

    expect(res.message.id).toBe('msg-idempotent-456');
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('only allows the sender to soft-delete their own message', async () => {
    vi.mocked(prisma.message.findUnique).mockResolvedValueOnce({
      id: 'msg-1',
      senderId: 'user-sender',
      createdAt: new Date(),
    } as any);

    await expect(
      ChatService.deleteMessage('other-user', 'msg-1')
    ).rejects.toThrow('You can only delete your own messages');
  });

  it('successfully soft-deletes message when sender requests it', async () => {
    vi.mocked(prisma.message.findUnique).mockResolvedValueOnce({
      id: 'msg-1',
      senderId: 'user-sender',
      createdAt: new Date(),
    } as any);
    vi.mocked(prisma.message.update).mockResolvedValueOnce({ id: 'msg-1', deletedAt: new Date() } as any);

    const result = await ChatService.deleteMessage('user-sender', 'msg-1');
    expect(result.success).toBe(true);
    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'msg-1' },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    });
  });
});
