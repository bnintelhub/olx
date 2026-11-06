import crypto from 'crypto';
import { PayUHashParams, PayUResponseHashParams } from './payu.types';

export class PayUHashService {
  // Generates request hash for PayU Hosted Checkout form submission:
  // sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
  static generatePaymentHash(params: PayUHashParams): string {
    const {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      salt,
    } = params;

    const hashString = [
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      '',
      '',
      '',
      '',
      '',
      salt,
    ].join('|');

    return crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
  }

  // Verifies response hash sent back from PayU (redirects or webhook callbacks)
  // Normal format: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  // With additional charges: sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  static verifyResponseHash(params: PayUResponseHashParams): boolean {
    const {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      additionalCharges,
      salt,
      hash,
    } = params;

    if (!hash || typeof hash !== 'string') return false;

    // Normal reverse hash sequence
    const normalSequence = [
      salt,
      status,
      '',
      '',
      '',
      '',
      '',
      udf5,
      udf4,
      udf3,
      udf2,
      udf1,
      email,
      firstname,
      productinfo,
      amount,
      txnid,
      key,
    ].join('|');

    const expectedHash = crypto
      .createHash('sha512')
      .update(normalSequence)
      .digest('hex')
      .toLowerCase();

    // Constant-time comparison to prevent timing attacks
    if (this.safeCompare(hash.toLowerCase(), expectedHash)) {
      return true;
    }

    // Check with additional charges prefix if provided by PayU
    if (additionalCharges) {
      const additionalSequence = `${additionalCharges}|${normalSequence}`;
      const expectedAdditionalHash = crypto
        .createHash('sha512')
        .update(additionalSequence)
        .digest('hex')
        .toLowerCase();

      return this.safeCompare(hash.toLowerCase(), expectedAdditionalHash);
    }

    return false;
  }

  // Generates API hash for server-to-server operations (verify_payment, cancel_refund_transaction)
  // sha512(key|command|var1|salt)
  static generateApiHash(key: string, command: string, var1: string, salt: string): string {
    const hashString = `${key}|${command}|${var1}|${salt}`;
    return crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
  }

  // Constant-time string comparison preventing timing leakage
  private static safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
  }
}

