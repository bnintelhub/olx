import { PaymentStatus } from '../../payment.types';

export class PayUMapper {
  // Maps raw PayU transaction status string to internal PaymentStatus enum
  static toPaymentStatus(payuStatus?: string, unmappedStatus?: string): PaymentStatus {
    const status = (payuStatus || unmappedStatus || '').toLowerCase();

    switch (status) {
      case 'success':
      case 'captured':
        return PaymentStatus.SUCCESS;

      case 'pending':
      case 'in progress':
      case 'initiated':
        return PaymentStatus.PENDING;

      case 'failure':
      case 'failed':
      case 'bounced':
      case 'cancelled':
      case 'dropped':
        return PaymentStatus.FAILED;

      case 'refunded':
        return PaymentStatus.REFUNDED;

      default:
        return PaymentStatus.PENDING;
    }
  }

  // Maps PayU payment mode to standardized string
  static toPaymentMethod(mode?: string): string {
    const rawMode = (mode || '').toUpperCase();
    const modeMap: Record<string, string> = {
      UPI: 'UPI',
      CC: 'CREDIT_CARD',
      DC: 'DEBIT_CARD',
      NB: 'NET_BANKING',
      WALLET: 'WALLET',
      EMI: 'EMI',
      CASH: 'CASH',
    };
    return modeMap[rawMode] || rawMode || 'UNKNOWN';
  }

  // Sanitizes provider response by removing any secrets or sensitive fields before storage/logs
  static sanitizeResponse(response: Record<string, any>): Record<string, any> {
    if (!response || typeof response !== 'object') return {};

    const sensitiveKeys = ['salt', 'secret', 'card_cvv', 'cvv', 'otp', 'pin', 'card_number'];
    const sanitized: Record<string, any> = {};

    for (const [key, val] of Object.entries(response)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = this.sanitizeResponse(val);
      } else {
        sanitized[key] = val;
      }
    }

    return sanitized;
  }
}

