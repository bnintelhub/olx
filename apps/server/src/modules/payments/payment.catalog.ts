import { AppError } from '../../shared/errors/app-error';
import { CatalogProduct, PaymentPurpose } from './payment.types';

// Server-authoritative product & pricing catalogue.
// Client requests specify productId; the backend alone determines the charge amount.
export const PRODUCT_CATALOG: Record<string, CatalogProduct> = {
  // Urgent / Highlight Boosts
  boost_3_days: {
    productId: 'boost_3_days',
    name: '3 Days Quick Boost',
    purpose: PaymentPurpose.LISTING_BOOST,
    durationDays: 3,
    amount: 49.0,
    currency: 'INR',
    description: 'Boost listing visibility with Urgent tag for 3 days',
    boostType: 'URGENT',
  },
  boost_7_days: {
    productId: 'boost_7_days',
    name: '7 Days Standard Boost',
    purpose: PaymentPurpose.LISTING_BOOST,
    durationDays: 7,
    amount: 99.0,
    currency: 'INR',
    description: 'Boost listing visibility with Urgent tag for 7 days',
    boostType: 'URGENT',
  },
  boost_14_days: {
    productId: 'boost_14_days',
    name: '14 Days Extended Boost',
    purpose: PaymentPurpose.LISTING_BOOST,
    durationDays: 14,
    amount: 179.0,
    currency: 'INR',
    description: 'Boost listing visibility with Urgent tag for 14 days',
    boostType: 'URGENT',
  },

  // Featured Promos
  featured_7_days: {
    productId: 'featured_7_days',
    name: 'Featured Ad (7 Days)',
    purpose: PaymentPurpose.FEATURED_LISTING,
    durationDays: 7,
    amount: 199.0,
    currency: 'INR',
    description: 'Highlighted background and top-of-category placement for 7 days',
    boostType: 'FEATURED',
  },
  featured_30_days: {
    productId: 'featured_30_days',
    name: 'Featured Ad (30 Days)',
    purpose: PaymentPurpose.FEATURED_LISTING,
    durationDays: 30,
    amount: 499.0,
    currency: 'INR',
    description: 'Highlighted background and top-of-category placement for 30 days',
    boostType: 'FEATURED',
  },

  // Home Spotlight / Top Listings
  top_7_days: {
    productId: 'top_7_days',
    name: 'Top Spotlight (7 Days)',
    purpose: PaymentPurpose.TOP_LISTING,
    durationDays: 7,
    amount: 249.0,
    currency: 'INR',
    description: 'Premium homepage spotlight placement for 7 days',
    boostType: 'HOME_SPOTLIGHT',
  },
  top_30_days: {
    productId: 'top_30_days',
    name: 'Top Spotlight (30 Days)',
    purpose: PaymentPurpose.TOP_LISTING,
    durationDays: 30,
    amount: 699.0,
    currency: 'INR',
    description: 'Premium homepage spotlight placement for 30 days',
    boostType: 'HOME_SPOTLIGHT',
  },

  // Seller Subscription
  seller_pro_monthly: {
    productId: 'seller_pro_monthly',
    name: 'Seller Pro Plan (Monthly)',
    purpose: PaymentPurpose.SELLER_SUBSCRIPTION,
    durationDays: 30,
    amount: 999.0,
    currency: 'INR',
    description: 'Unlimited listings and verified seller badge for 30 days',
  },
};

// Resolves a product by key or rejects with a validation error
export function getCatalogProduct(productId: string): CatalogProduct {
  const product = PRODUCT_CATALOG[productId];
  if (!product) {
    throw new AppError(400, 'INVALID_PRODUCT', `Unrecognized or inactive product: "${productId}"`);
  }
  return product;
}

// Validates that the requested payment purpose matches the product's defined purpose
export function validatePurposeWithProduct(purpose: PaymentPurpose, product: CatalogProduct): void {
  if (product.purpose !== purpose) {
    throw new AppError(
      400,
      'PURPOSE_PRODUCT_MISMATCH',
      `Product "${product.productId}" is configured for ${product.purpose}, not ${purpose}`
    );
  }
}

