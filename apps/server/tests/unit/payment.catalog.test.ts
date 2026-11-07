import { describe, it, expect } from 'vitest';
import { getCatalogProduct, validatePurposeWithProduct } from '../../src/modules/payments/payment.catalog';
import { PaymentPurpose } from '../../src/modules/payments/payment.types';

describe('Payment Product Catalog', () => {
  it('should return correct pricing for boost_7_days', () => {
    const product = getCatalogProduct('boost_7_days');
    expect(product).toBeDefined();
    expect(product.amount).toBe(99.0);
    expect(product.currency).toBe('INR');
    expect(product.durationDays).toBe(7);
    expect(product.purpose).toBe(PaymentPurpose.LISTING_BOOST);
  });

  it('should return correct pricing for featured_7_days', () => {
    const product = getCatalogProduct('featured_7_days');
    expect(product.amount).toBe(199.0);
    expect(product.purpose).toBe(PaymentPurpose.FEATURED_LISTING);
  });

  it('should return correct configuration for ₹1 rupee test product', () => {
    const product = getCatalogProduct('test_1');
    expect(product).toBeDefined();
    expect(product.amount).toBe(1.0);
    expect(product.currency).toBe('INR');
    expect(product.adsCount).toBe(1);
    expect(product.purpose).toBe(PaymentPurpose.OTHER);
  });

  it('should reject non-existent products', () => {
    expect(() => getCatalogProduct('arbitrary_cheap_product')).toThrowError(/Unrecognized or inactive product/);
  });

  it('should validate matching purpose and product', () => {
    const product = getCatalogProduct('boost_7_days');
    expect(() => validatePurposeWithProduct(PaymentPurpose.LISTING_BOOST, product)).not.toThrow();
  });

  it('should throw error when purpose does not match product purpose', () => {
    const product = getCatalogProduct('boost_7_days'); // Purpose is LISTING_BOOST
    expect(() => validatePurposeWithProduct(PaymentPurpose.FEATURED_LISTING, product)).toThrowError(
      /configured for LISTING_BOOST, not FEATURED_LISTING/
    );
  });
});
