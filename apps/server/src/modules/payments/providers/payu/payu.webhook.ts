import { env } from '../../../../config/env';
import { PayUHashService } from './payu.hash';
import { PayUMapper } from './payu.mapper';
import { PayUCallbackPayload } from '../../payment.types';

export class PayUWebhookService {
  // Validates PayU callback/webhook integrity by recomputing reverse hash
  static validateSignature(payload: PayUCallbackPayload): boolean {
    const key = payload.key || env.PAYU_MERCHANT_KEY;
    const txnid = payload.txnid || '';
    const amount = payload.amount || '';
    const productinfo = payload.productinfo || '';
    const firstname = payload.firstname || '';
    const email = payload.email || '';
    const status = payload.status || '';
    const hash = payload.hash || '';
    const salt = env.PAYU_MERCHANT_SALT;

    if (!hash || !txnid || !amount || !status) {
      return false;
    }

    return PayUHashService.verifyResponseHash({
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      udf1: payload.udf1 || '',
      udf2: payload.udf2 || '',
      udf3: payload.udf3 || '',
      udf4: payload.udf4 || '',
      udf5: payload.udf5 || '',
      additionalCharges: payload.additionalCharges,
      salt,
      hash,
    });
  }

  // Strictly compares expected transaction amount with provider-reported amount
  static validateAmount(expectedAmount: number, payloadAmount: string | number): boolean {
    const actual = typeof payloadAmount === 'string' ? parseFloat(payloadAmount) : payloadAmount;
    if (isNaN(actual)) return false;

    // Tolerance of 0.01 for minor floating point rounding
    return Math.abs(expectedAmount - actual) < 0.01;
  }

  // Sanitizes webhook payload for safe telemetry capture
  static sanitizePayload(payload: Record<string, any>): Record<string, any> {
    return PayUMapper.sanitizeResponse(payload);
  }
}

