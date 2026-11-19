# Server-Sent Events (SSE) Real-Time Notification Architecture

This document specifies the Server-Sent Events (SSE) real-time event pipeline in OLX Marketplace, with specific focus on payment confirmation notifications, finance ledger updates, role-based authorization, multi-tab coordination, and offline recovery.

---

## 1. System Architecture Overview

When a buyer completes a payment for featured listings, boosts, or subscriptions, the backend verifies the transaction cryptographically and propagates real-time alerts to all active, authorized staff members (`SUPER_ADMIN`, `ADMIN`, `FINANCE_ADMIN`).

```
User (Buyer)
     │
     │ 1. Checkout (PayU Hosted / UPI)
     ▼
Payment Gateway (PayU)
     │
     │ 2. Webhook / Verified Return Callback
     ▼
Backend (Fastify)
     │
     ├── 3. Cryptographic Signature & Amount Verification
     ├── 4. Atomic Database Update (order.status = SUCCESS, paidAt = now())
     ├── 5. Redis Idempotency Guard (SET payment:notified:{orderId}:SUCCESS NX EX 86400)
     ├── 6. Batch DB Persistence (prisma.notification.createMany for active staff)
     ├── 7. SSE Broadcast to Authorized Staff Streams (sendToUser)
     │
     ▼
Admin Dashboard (React + Vite)
     │
     ├── 8. Incoming SSE Event ('payment_received')
     ├── 9. Cross-Tab Sound Lock (localStorage deduplication)
     ├── 10. Web Audio Synthesizer Chime (C6 → E6 → G6 arpeggio)
     ├── 11. Toast Notification ("Payment Received — ₹X from User")
     └── 12. React Query Invalidation (Notifications, Unread Count, Finance Ledger)
```

---

## 2. SSE Endpoints & Connection Lifecycle

### Connection URL
- **Endpoint**: `GET /api/v1/notifications/stream?context=admin`
- **Authentication**: HTTP-only secure cookie (`access_token`)
- **Transport**: Standard W3C Server-Sent Events (`text/event-stream`)

### Keep-Alive & Stability Flags
The backend configures Node.js TCP socket flags to prevent intermediate proxies, firewalls, and browsers from dropping the persistent stream:
```ts
request.raw.socket.setTimeout(0);
request.raw.socket.setNoDelay(true);
request.raw.socket.setKeepAlive(true);
reply.sse.keepAlive();
```

---

## 3. Event Contracts & Schemas

### A. Handshake (`ready`)
Emitted immediately upon opening the SSE stream to synchronize client state:
```json
{
  "id": "init-1732018800000",
  "event": "ready",
  "data": {
    "connectionId": "user123-1732018800000-abc12",
    "userId": "user-uuid",
    "role": "SUPER_ADMIN",
    "unreadCount": 3,
    "timestamp": "2026-11-19T12:00:00.000Z"
  }
}
```

### B. Payment Received (`payment_received`)
Dispatched when a payment order completes successfully:
```json
{
  "id": "pay_evt_payord_1732018800_SUCCESS",
  "event": "payment_received",
  "data": {
    "id": "pay_evt_payord_1732018800_SUCCESS",
    "orderId": "payord_1732018800",
    "txnId": "OLX_20261119_A1B2C3D4",
    "providerTransactionId": "4039937155331",
    "amount": 499,
    "currency": "INR",
    "userId": "buyer-uuid-99",
    "payerName": "Rahul Sharma",
    "payerEmail": "rahul@example.com",
    "purpose": "FEATURED_LISTING",
    "paymentMethod": "UPI",
    "clickUrl": "/payments?search=payord_1732018800",
    "status": "SUCCESS",
    "createdAt": "2026-11-19T12:00:00.000Z"
  }
}
```

### C. Payment Refunded (`payment_refund`)
Dispatched when an order is refunded:
```json
{
  "id": "pay_evt_payord_1732018800_REFUND",
  "event": "payment_refund",
  "data": {
    "id": "pay_evt_payord_1732018800_REFUND",
    "orderId": "payord_1732018800",
    "txnId": "OLX_20261119_A1B2C3D4",
    "refundedAmount": 499,
    "currency": "INR",
    "reason": "Customer cancellation within refund window",
    "clickUrl": "/payments?search=payord_1732018800&view=refunds",
    "status": "REFUNDED",
    "createdAt": "2026-11-19T12:00:00.000Z"
  }
}
```

### D. Multi-Tab Read Synchronization (`unread_sync`)
Dispatched when a user marks one or all notifications as read in any tab:
```json
{
  "id": "1732018805000",
  "event": "unread_sync",
  "data": {
    "unreadCount": 0,
    "readId": "optional-notification-id"
  }
}
```

---

## 4. Web Audio Synthesizer & Cross-Tab Sound Lock

The admin dashboard uses client-side Web Audio API tone synthesis in `apps/admin/src/lib/sound.ts`. This requires zero external `.mp3` or `.wav` asset downloads, works 100% offline, and produces low-latency chimes.

### Payment Chime Profile
- **Note 1**: Sine oscillator at 1046.50 Hz (C6), ramp 0.02s → 0.25s
- **Note 2**: Sine oscillator at 1318.51 Hz (E6), ramp 0.10s → 0.35s
- **Note 3**: Triangle oscillator at 1567.98 Hz (G6), sustain ramp 0.18s → 0.55s

### Cross-Tab Sound Deduplication
When an administrator has 3 tabs open, the SSE event reaches all 3 tabs simultaneously. To prevent 3 overlapping audio chimes from echoing, `playPaymentChime(eventId)` utilizes a shared `localStorage` lock:
```ts
const lockData = localStorage.getItem('olx_admin_sound_lock');
if (lockData) {
  const parsed = JSON.parse(lockData);
  if (parsed?.id === eventId && nowMs - parsed.timestamp < 3000) {
    return; // Another open tab already claimed audio playback
  }
}
localStorage.setItem('olx_admin_sound_lock', JSON.stringify({ id: eventId, timestamp: nowMs }));
```
Result: All tabs display the visual toast and refresh UI counts, but **only 1 tab plays the sound**.

---

## 5. Comprehensive 15 Edge Cases Analysis

| # | Edge Case | Mitigation Strategy | Implementation |
|---|---|---|---|
| **1** | **Duplicate Webhooks** | Atomic Redis idempotency check using `SET payment:notified:{orderId}:{status} 1 NX EX 86400`. If Redis key exists, early return. | `PaymentNotificationService.notifyPaymentSuccess` |
| **2** | **Payment Success but SSE Disconnected** | Database-first persistence: all authorized staff receive a row in `notifications` table (`isRead = false`). When staff reconnects, initial handshake fetches unread badge and drawer list. | `prisma.notification.createMany` |
| **3** | **Multiple Admins Active** | SSE connection manager tracks active sockets per user. Event is broadcast to every active stream of all authorized staff. | `sseConnectionManager.sendToUser` |
| **4** | **Role Change During Session** | Notification service queries database dynamically for active users with role `IN ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN']` and `status: 'ACTIVE'`. Stale connections of revoked users are excluded. | `PaymentNotificationService` dynamic DB query |
| **5** | **Unauthorized Admin Access** | Strict role filter: `MODERATOR`, `CUSTOMER_SUPPORT`, `CONTENT_MANAGER`, and `ANALYST` never receive payment notifications or DB rows. | `AUTHORIZED_STAFF_ROLES` whitelist |
| **6** | **Payment Success → DB Update Failed** | Strict sequence: `notifyPaymentSuccess` is invoked strictly after `PaymentRepository.updatePaymentStatus` completes successfully. If DB throws, notification code is never executed. | `PaymentService.verifyPayment` / `handleWebhook` |
| **7** | **SSE Reconnect** | On reconnect (`stream.onopen`), the client automatically invalidates `UNREAD_COUNT_QUERY_KEY`, `NOTIFICATIONS_QUERY_KEY`, `['admin-stats']`, and `['finance']`. | `useAdminNotificationSSE` `onopen` callback |
| **8** | **Admin Multiple Tabs (Duplicate Audio)** | Cross-tab lock in `localStorage` checks whether `eventId` was chimed within the last 3000ms. UI updates in all tabs; audio chimes once. | `playPaymentChime` in `apps/admin/src/lib/sound.ts` |
| **9** | **Out-of-Order Events** | Server state machine (`assertValidTransition`) strictly prevents illegal state transitions (e.g. `SUCCESS` cannot regress to `PENDING` or `FAILED`). Events always include timestamp and target state. | `payment.state-machine.ts` |
| **10** | **Refund / Chargeback** | Dedicated `payment_refund` event with amber toast, separate eventId (`pay_evt_{orderId}_REFUND`), and dedicated audit log entry. | `PaymentNotificationService.notifyPaymentRefund` |
| **11** | **Concurrent Payment Updates** | Atomic Redis NX lock combined with Prisma transaction updates ensures parallel webhooks do not race. | `PaymentRepository.updatePaymentStatus` |
| **12** | **Notification Storm (High Volume)** | 1) Web Audio throttled to max 1 chime per 500ms.<br>2) LRU seenIds buffer bounded at 100 entries.<br>3) DB batch insert via `prisma.notification.createMany` in single SQL statement.<br>4) Compact SSE payload (< 500 bytes). | Multi-layer rate limiting |
| **13** | **Admin Offline/Online Transition** | SSE handshake (`ready` event) supplies current unread count; on-open invalidation syncs all historical notifications from `/api/v1/notifications`. | Handshake + Query invalidation |
| **14** | **Permission Boundary** | Finance role receives payment alerts, but never receives moderation reports or buyer dispute alerts (which route exclusively to `MODERATOR` and `CUSTOMER_SUPPORT`). | Modular role segregation |
| **15** | **Event ID / Idempotency** | Deterministic event ID format: `pay_evt_{orderId}_{status}`. Client-side Set checks `seenIdsRef.current.has(data.id)` and discards duplicate events. | Client-side LRU Set deduplication |

---

## 6. Verification & Testing

### Unit Test Suite
Run the payment notification test suite:
```bash
pnpm --filter @olx/server exec vitest run tests/unit/payment-notification.test.ts
```

### Typecheck Verification
```bash
pnpm --filter @olx/server exec tsc --noEmit
pnpm --filter @olx/admin exec tsc --noEmit
```
