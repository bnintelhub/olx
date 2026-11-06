import { AppError } from '../../shared/errors/app-error';
import { PaymentStatus } from './payment.types';

// Legal state transitions for payment orders & transactions
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [
    PaymentStatus.INITIATED,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.INITIATED]: [
    PaymentStatus.PENDING,
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.PENDING]: [
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.SUCCESS]: [
    PaymentStatus.REFUND_REQUESTED,
  ],
  [PaymentStatus.REFUND_REQUESTED]: [
    PaymentStatus.REFUNDED,
    PaymentStatus.SUCCESS, // Rollback if provider refund fails
  ],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.EXPIRED]: [],
  [PaymentStatus.REFUNDED]: [],
};

// Checks whether a given status transition is permitted
export function canTransitionPayment(current: PaymentStatus, target: PaymentStatus): boolean {
  if (current === target) return true; // Idempotent no-op
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

// Validates state transition or throws a descriptive business error
export function assertValidTransition(current: PaymentStatus, target: PaymentStatus): void {
  if (!canTransitionPayment(current, target)) {
    throw new AppError(
      400,
      'INVALID_PAYMENT_STATE_TRANSITION',
      `Cannot transition payment status from "${current}" to "${target}"`
    );
  }
}

