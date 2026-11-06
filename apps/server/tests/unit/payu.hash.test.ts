import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { PayUHashService } from '../../src/modules/payments/providers/payu/payu.hash';

describe('PayUHashService', () => {
  const testKey = 'gtKFFx';
  const testSalt = 'eCwWELxi';

  describe('generatePaymentHash', () => {
    it('should generate valid SHA-512 request hash matching PayU formula', () => {
      const params = {
        key: testKey,
        txnid: 'OLX_20261106_TEST01',
        amount: '99.00',
        productinfo: '7 Days Boost',
        firstname: 'Rahul',
        email: 'rahul@example.com',
        udf1: 'order_123',
        udf2: 'listing_456',
        udf3: 'LISTING_BOOST',
        udf4: 'boost_7_days',
        udf5: 'user_789',
        salt: testSalt,
      };

      const hash = PayUHashService.generatePaymentHash(params);

      // Verify manually against sha512
      const expectedString = `${testKey}|OLX_20261106_TEST01|99.00|7 Days Boost|Rahul|rahul@example.com|order_123|listing_456|LISTING_BOOST|boost_7_days|user_789||||||${testSalt}`;
      const expectedHash = crypto.createHash('sha512').update(expectedString).digest('hex').toLowerCase();

      expect(hash).toBe(expectedHash);
      expect(hash).toHaveLength(128);
    });

    it('should handle empty UDF parameters gracefully', () => {
      const params = {
        key: testKey,
        txnid: 'OLX_20261106_TEST02',
        amount: '199.00',
        productinfo: 'Featured Ad',
        firstname: 'Aarav',
        email: 'aarav@example.com',
        salt: testSalt,
      };

      const hash = PayUHashService.generatePaymentHash(params);
      const expectedString = `${testKey}|OLX_20261106_TEST02|199.00|Featured Ad|Aarav|aarav@example.com|||||||||||${testSalt}`;
      const expectedHash = crypto.createHash('sha512').update(expectedString).digest('hex').toLowerCase();

      expect(hash).toBe(expectedHash);
    });
  });

  describe('verifyResponseHash', () => {
    it('should return true for an authentic PayU response hash', () => {
      const params = {
        key: testKey,
        txnid: 'OLX_20261106_TEST01',
        amount: '99.00',
        productinfo: '7 Days Boost',
        firstname: 'Rahul',
        email: 'rahul@example.com',
        status: 'success',
        udf1: 'order_123',
        udf2: 'listing_456',
        udf3: 'LISTING_BOOST',
        udf4: 'boost_7_days',
        udf5: 'user_789',
        salt: testSalt,
      };

      // Generate legitimate reverse hash
      const reverseSequence = `${testSalt}|success||||||user_789|boost_7_days|LISTING_BOOST|listing_456|order_123|rahul@example.com|Rahul|7 Days Boost|99.00|OLX_20261106_TEST01|${testKey}`;
      const legitimateHash = crypto.createHash('sha512').update(reverseSequence).digest('hex').toLowerCase();

      const isValid = PayUHashService.verifyResponseHash({
        ...params,
        hash: legitimateHash,
      });

      expect(isValid).toBe(true);
    });

    it('should return false if payload status or amount was tampered with', () => {
      const params = {
        key: testKey,
        txnid: 'OLX_20261106_TEST01',
        amount: '99.00',
        productinfo: '7 Days Boost',
        firstname: 'Rahul',
        email: 'rahul@example.com',
        status: 'success',
        salt: testSalt,
      };

      const legitimateHash = crypto
        .createHash('sha512')
        .update(`${testSalt}|success|||||||||||rahul@example.com|Rahul|7 Days Boost|99.00|OLX_20261106_TEST01|${testKey}`)
        .digest('hex');

      // Attacker tampers amount to 1.00
      const isValid = PayUHashService.verifyResponseHash({
        ...params,
        amount: '1.00',
        hash: legitimateHash,
      });

      expect(isValid).toBe(false);
    });

    it('should verify response hash with additional charges when applicable', () => {
      const params = {
        key: testKey,
        txnid: 'OLX_20261106_TEST03',
        amount: '100.00',
        productinfo: 'Top Listing',
        firstname: 'Priya',
        email: 'priya@example.com',
        status: 'success',
        additionalCharges: '2.50',
        salt: testSalt,
      };

      const reverseWithCharges = `2.50|${testSalt}|success|||||||||||priya@example.com|Priya|Top Listing|100.00|OLX_20261106_TEST03|${testKey}`;
      const hashWithCharges = crypto.createHash('sha512').update(reverseWithCharges).digest('hex').toLowerCase();

      const isValid = PayUHashService.verifyResponseHash({
        ...params,
        hash: hashWithCharges,
      });

      expect(isValid).toBe(true);
    });
  });

  describe('generateApiHash', () => {
    it('should generate valid SHA-512 for verify_payment command', () => {
      const hash = PayUHashService.generateApiHash(testKey, 'verify_payment', 'OLX_TXN_123', testSalt);
      const expected = crypto.createHash('sha512').update(`${testKey}|verify_payment|OLX_TXN_123|${testSalt}`).digest('hex');
      expect(hash).toBe(expected);
    });
  });
});

