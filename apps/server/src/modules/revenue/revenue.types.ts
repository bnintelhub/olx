export interface ExtraListingPackage {
  id: string;
  name: string;
  adsCount: number;
  priceInr: number;
  validityDays: number;
  badge?: string;
  description: string;
}

export interface BoostPackage {
  id: string;
  name: string;
  priceInr: number;
  durationDays: number;
  features: string[];
  badge?: string;
}

export interface FeaturedPackage {
  id: string;
  name: string;
  durationDays: number;
  priceInr: number;
  badge?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthlyInr: number;
  monthlyListings: number;
  boostCredits: number;
  features: string[];
  isPopular?: boolean;
}

export interface DisplayAdPlacement {
  slot: string;
  ratePerDayInr: number;
  cpmInr: number;
  description: string;
}

export interface RevenuePolicy {
  id: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
  postingLimit: {
    freeAdsPerMonth: number;
    cycleDays: number;
    allowPaidExtraAds: boolean;
    extraPackages: ExtraListingPackage[];
  };
  boostPackages: BoostPackage[];
  featuredPackages: FeaturedPackage[];
  subscriptionPlans: SubscriptionPlan[];
  displayAdvertising: {
    enabled: boolean;
    placements: DisplayAdPlacement[];
  };
}

export interface UserQuotaResponse {
  userId: string;
  freeAdsLimit: number;
  usedThisMonth: number;
  usedFreeAds?: number;
  remainingFreeAds: number;
  totalPaidAds?: number;
  usedPaidAds?: number;
  paidAdsBalance: number;
  totalAllowedAds?: number;
  totalAvailableListings: number;
  isLimitReached: boolean;
  subscriptionTier: string;
  cycleStartDate: string;
  cycleEndDate: string;
  extraPackages: ExtraListingPackage[];
  boostPackages: BoostPackage[];
  featuredPackages: FeaturedPackage[];
}

