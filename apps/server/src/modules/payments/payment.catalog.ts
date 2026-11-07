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

  // Extra Ads Packages
  test_1: {
    productId: 'test_1',
    name: '1 Extra Ad (Test ₹1)',
    purpose: PaymentPurpose.OTHER,
    durationDays: 30,
    amount: 1.0,
    currency: 'INR',
    description: '1 rupee testing ad package for payment testing',
    adsCount: 1,
  },
  extra_5: {
    productId: 'extra_5',
    name: '5 Extra Ads Package',
    purpose: PaymentPurpose.OTHER,
    durationDays: 30,
    amount: 99.0,
    currency: 'INR',
    description: '5 additional listings beyond monthly limit',
    adsCount: 5,
  },
  extra_15: {
    productId: 'extra_15',
    name: '15 Extra Ads Package',
    purpose: PaymentPurpose.OTHER,
    durationDays: 60,
    amount: 199.0,
    currency: 'INR',
    description: '15 additional listings beyond monthly limit',
    adsCount: 15,
  },
  extra_50: {
    productId: 'extra_50',
    name: '50 Extra Ads Package',
    purpose: PaymentPurpose.OTHER,
    durationDays: 90,
    amount: 499.0,
    currency: 'INR',
    description: '50 additional listings beyond monthly limit',
    adsCount: 50,
  },

  // Pro & Business Subscriptions
  pro_seller: {
    productId: 'pro_seller',
    name: 'Pro Seller Plan',
    purpose: PaymentPurpose.SELLER_SUBSCRIPTION,
    durationDays: 30,
    amount: 499.0,
    currency: 'INR',
    description: '50 ads/month + 10 boost credits + verified seller badge',
    adsCount: 50,
    subscriptionTier: 'PRO_SELLER',
  },
  dealer_plan: {
    productId: 'dealer_plan',
    name: 'Dealer Showcase Plan',
    purpose: PaymentPurpose.SELLER_SUBSCRIPTION,
    durationDays: 30,
    amount: 1999.0,
    currency: 'INR',
    description: '500 ads/month + dealer profile and analytics',
    adsCount: 500,
    subscriptionTier: 'DEALER',
  },
  enterprise_plan: {
    productId: 'enterprise_plan',
    name: 'Enterprise Plan',
    purpose: PaymentPurpose.SELLER_SUBSCRIPTION,
    durationDays: 30,
    amount: 9999.0,
    currency: 'INR',
    description: 'Unlimited listings + API access',
    adsCount: 9999,
    subscriptionTier: 'ENTERPRISE',
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

