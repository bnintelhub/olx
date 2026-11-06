import { describe, it, expect } from 'vitest';
import {
  canTransitionPayment,
  assertValidTransition,
} from '../../src/modules/payments/payment.state-machine';
import { PaymentStatus } from '../../src/modules/payments/payment.types';

describe('Payment State Machine', () => {
  it('should allow valid sequential transitions', () => {
    expect(canTransitionPayment(PaymentStatus.CREATED, PaymentStatus.INITIATED)).toBe(true);
    expect(canTransitionPayment(PaymentStatus.INITIATED, PaymentStatus.PENDING)).toBe(true);
    expect(canTransitionPayment(PaymentStatus.PENDING, PaymentStatus.SUCCESS)).toBe(true);
    expect(canTransitionPayment(PaymentStatus.SUCCESS, PaymentStatus.REFUND_REQUESTED)).toBe(true);
    expect(canTransitionPayment(PaymentStatus.REFUND_REQUESTED, PaymentStatus.REFUNDED)).toBe(true);
  });

  it('should allow idempotent same-state transitions', () => {
    expect(canTransitionPayment(PaymentStatus.SUCCESS, PaymentStatus.SUCCESS)).toBe(true);
    expect(canTransitionPayment(PaymentStatus.FAILED, PaymentStatus.FAILED)).toBe(true);
  });

  it('should reject illegal state transitions', () => {
    // Cannot jump straight from FAILED to SUCCESS without verification
    expect(canTransitionPayment(PaymentStatus.FAILED, PaymentStatus.SUCCESS)).toBe(false);

    // Cannot refund an unpaid / failed order
    expect(canTransitionPayment(PaymentStatus.CREATED, PaymentStatus.REFUNDED)).toBe(false);
    expect(canTransitionPayment(PaymentStatus.FAILED, PaymentStatus.REFUNDED)).toBe(false);

    // Terminal states cannot transition to other states
    expect(canTransitionPayment(PaymentStatus.REFUNDED, PaymentStatus.SUCCESS)).toBe(false);
    expect(canTransitionPayment(PaymentStatus.EXPIRED, PaymentStatus.SUCCESS)).toBe(false);
  });

  it('assertValidTransition should throw descriptive AppError on invalid transition', () => {
    expect(() =>
      assertValidTransition(PaymentStatus.FAILED, PaymentStatus.SUCCESS)
    ).toThrowError(/Cannot transition payment status from "FAILED" to "SUCCESS"/);
  });
});

