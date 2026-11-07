import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Save,
  RotateCcw,
  Layers,
  Star,
  Zap,
  Building2,
  Tv,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { apiClient } from '../../lib/api-client';

const INITIAL_POLICY = {
  postingLimit: {
    freeAdsPerMonth: 5,
    cycleDays: 30,
    allowPaidExtraAds: true,
    extraPackages: [
      { id: 'extra_5', name: '5 Extra Ads', adsCount: 5, priceInr: 99, validityDays: 30, badge: 'Starter' },
      { id: 'extra_15', name: '15 Extra Ads', adsCount: 15, priceInr: 199, validityDays: 60, badge: 'Popular' },
      { id: 'extra_50', name: '50 Extra Ads', adsCount: 50, priceInr: 499, validityDays: 90, badge: 'Best Value' },
    ],
  },
  boostPackages: [
    { id: 'boost_top', name: 'Boost to Top', priceInr: 49, durationDays: 3, features: ['Top search position', 'Instant bump'], badge: 'Quick' },
    { id: 'featured_boost', name: 'Featured Ad', priceInr: 99, durationDays: 7, features: ['Featured badge', 'Highlighted card', 'Category top slot'], badge: 'Recommended' },
    { id: 'top_featured', name: 'Top + Featured', priceInr: 149, durationDays: 7, features: ['Top rank + Featured tag', 'Homepage spotlight'], badge: 'Best Seller' },
    { id: 'auto_boost', name: 'Auto Boost', priceInr: 199, durationDays: 14, features: ['Auto-boosts every 48h', 'Urgent sticker', 'Top category rank for 14d'], badge: 'Pro Boost' },
  ],
  featuredPackages: [
    { id: 'feat_3d', name: 'Featured (3 Days)', durationDays: 3, priceInr: 79, badge: 'Quick' },
    { id: 'feat_7d', name: 'Featured (7 Days)', durationDays: 7, priceInr: 149, badge: 'Popular' },
    { id: 'feat_15d', name: 'Featured (15 Days)', durationDays: 15, priceInr: 249, badge: 'Max Visibility' },
  ],
  subscriptionPlans: [
    { id: 'individual', name: 'Individual', priceMonthlyInr: 0, monthlyListings: 5, boostCredits: 0, features: ['5 Free Ads / Month', 'Standard Search Placement'] },
    { id: 'pro_seller', name: 'Pro Seller', priceMonthlyInr: 499, monthlyListings: 50, boostCredits: 10, isPopular: true, features: ['50 Active Listings', '10 Boost Credits', 'Verified Pro Badge'] },
    { id: 'dealer', name: 'Dealer / Broker', priceMonthlyInr: 1999, monthlyListings: 500, boostCredits: 50, features: ['500 Active Listings', 'Bulk CSV Upload', 'Dealer Showcase Profile'] },
    { id: 'enterprise', name: 'Enterprise', priceMonthlyInr: 9999, monthlyListings: 99999, boostCredits: 200, features: ['Unlimited Inventory', 'REST API Integration', 'Instant Moderation'] },
  ],
  displayAdvertising: {
    enabled: true,
    placements: [
      { slot: 'HERO_LEADERBOARD', ratePerDayInr: 299, cpmInr: 60, description: 'Top leaderboard banner on Home & Category pages' },
      { slot: 'IN_FEED_SPONSORED', ratePerDayInr: 149, cpmInr: 35, description: 'Native sponsored card inside ad listings feed' },
      { slot: 'SIDEBAR_STICKY', ratePerDayInr: 199, cpmInr: 45, description: 'Sticky banner on desktop ad details & search pages' },
    ],
  },
};

export function RevenuePolicyPage() {
  const [activeTab, setActiveTab] = useState<'posting' | 'boost' | 'featured' | 'subscriptions' | 'display'>('posting');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [policy, setPolicy] = useState<any>(INITIAL_POLICY);

  const fetchPolicy = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/revenue/admin/policy');
      if (res.data?.success && res.data.data) setPolicy(res.data.data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSavePolicy = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await apiClient.put('/revenue/admin/policy', policy);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save revenue policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset monetization rules and pricing back to system defaults?')) return;
    setIsSaving(true);
    try {
      const res = await apiClient.post('/revenue/admin/policy/reset');
      if (res.data?.data) {
        setPolicy(res.data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const navTabs = [
    { key: 'posting', label: '1. Free Limits & Extra Ads', icon: Layers },
    { key: 'boost', label: '2. Boost & Promote', icon: Zap },
    { key: 'featured', label: '3. Featured Listings', icon: Star },
    { key: 'subscriptions', label: '4. Dealer Subscriptions', icon: Building2 },
    { key: 'display', label: '5. Display Ads', icon: Tv },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Revenue & Monetization Policy</h2>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
              Live & Enforced
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure dynamic free limits, extra listing bundles, ad boost tiers, and dealer subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults} disabled={isSaving || isLoading} className="text-xs font-semibold gap-1.5 h-9 cursor-pointer">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </Button>
          <Button size="sm" onClick={handleSavePolicy} disabled={isSaving || isLoading} className="text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Applying...' : 'Save & Apply Policy'}</span>
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Revenue policy successfully updated! New limits and pricing are immediately active in the marketplace.</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto text-xs">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isActive ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Free Limits & Extra Listing Packages */}
      {activeTab === 'posting' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Monthly Free Listing Limit Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Free Ads Allowed per User / Month</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={policy.postingLimit?.freeAdsPerMonth || 5}
                    onChange={(e) =>
                      setPolicy({ ...policy, postingLimit: { ...policy.postingLimit, freeAdsPerMonth: Number(e.target.value) || 5 } })
                    }
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">Standard users can publish up to this count for free within a 30-day window.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Quota Rolling Cycle (Days)</label>
                  <Input
                    type="number"
                    min="7"
                    max="90"
                    value={policy.postingLimit?.cycleDays || 30}
                    onChange={(e) =>
                      setPolicy({ ...policy, postingLimit: { ...policy.postingLimit, cycleDays: Number(e.target.value) || 30 } })
                    }
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">Number of days before free listing count resets (standard: 30 days).</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Revenue #1 — Paid Extra Listings Packages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {policy.postingLimit?.extraPackages?.map((pkg: any, idx: number) => (
                  <div key={pkg.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{pkg.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{pkg.badge || 'Package'}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-muted-foreground w-20">Price (INR):</label>
                        <Input
                          type="number"
                          value={pkg.priceInr}
                          onChange={(e) => {
                            const updated = [...policy.postingLimit.extraPackages];
                            updated[idx].priceInr = Number(e.target.value) || 0;
                            setPolicy({ ...policy, postingLimit: { ...policy.postingLimit, extraPackages: updated } });
                          }}
                          className="h-8 text-xs font-bold"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-muted-foreground w-20">Ads Count:</label>
                        <Input
                          type="number"
                          value={pkg.adsCount}
                          onChange={(e) => {
                            const updated = [...policy.postingLimit.extraPackages];
                            updated[idx].adsCount = Number(e.target.value) || 1;
                            setPolicy({ ...policy, postingLimit: { ...policy.postingLimit, extraPackages: updated } });
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Boost & Promote */}
      {activeTab === 'boost' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Revenue #2 — Boost & Promote Options</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {policy.boostPackages?.map((pkg: any, idx: number) => (
                <div key={pkg.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{pkg.name}</span>
                    <Badge variant="outline" className="text-[10px]">{pkg.badge}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">Price (INR):</label>
                    <Input
                      type="number"
                      value={pkg.priceInr}
                      onChange={(e) => {
                        const updated = [...policy.boostPackages];
                        updated[idx].priceInr = Number(e.target.value) || 0;
                        setPolicy({ ...policy, boostPackages: updated });
                      }}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <ul className="text-[11px] text-foreground space-y-0.5 list-disc pl-4">
                    {pkg.features?.map((f: string, i: number) => (<li key={i}>{f}</li>))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Featured Listings */}
      {activeTab === 'featured' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Revenue #3 — Featured Listing Duration Pricing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {policy.featuredPackages?.map((pkg: any, idx: number) => (
                <div key={pkg.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{pkg.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{pkg.durationDays} Days</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">Price (INR):</label>
                    <Input
                      type="number"
                      value={pkg.priceInr}
                      onChange={(e) => {
                        const updated = [...policy.featuredPackages];
                        updated[idx].priceInr = Number(e.target.value) || 0;
                        setPolicy({ ...policy, featuredPackages: updated });
                      }}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Subscriptions */}
      {activeTab === 'subscriptions' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Revenue #4 — Dealer & Business Subscriptions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {policy.subscriptionPlans?.map((plan: any, idx: number) => (
                <div key={plan.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">{plan.name}</span>
                    {plan.isPopular && <Badge className="text-[9px] bg-primary text-primary-foreground">Popular</Badge>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">Monthly Fee (₹):</label>
                    <Input
                      type="number"
                      value={plan.priceMonthlyInr}
                      onChange={(e) => {
                        const updated = [...policy.subscriptionPlans];
                        updated[idx].priceMonthlyInr = Number(e.target.value) || 0;
                        setPolicy({ ...policy, subscriptionPlans: updated });
                      }}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-[11px] text-muted-foreground">Monthly Ads: <strong>{plan.monthlyListings}</strong></div>
                    <div className="text-[11px] text-muted-foreground">Boost Credits: <strong>{plan.boostCredits}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Display Ads */}
      {activeTab === 'display' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Tv className="w-4 h-4 text-primary" />
              <span>Revenue #5 — Display Advertising Rates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {policy.displayAdvertising?.placements?.map((slot: any, idx: number) => (
                <div key={slot.slot} className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="text-xs font-bold">{slot.slot.replace(/_/g, ' ')}</div>
                  <p className="text-[11px] text-muted-foreground">{slot.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-muted-foreground w-24">Rate/Day (₹):</label>
                      <Input
                        type="number"
                        value={slot.ratePerDayInr}
                        onChange={(e) => {
                          const updated = [...policy.displayAdvertising.placements];
                          updated[idx].ratePerDayInr = Number(e.target.value) || 0;
                          setPolicy({ ...policy, displayAdvertising: { ...policy.displayAdvertising, placements: updated } });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-muted-foreground w-24">CPM (₹/1k):</label>
                      <Input
                        type="number"
                        value={slot.cpmInr}
                        onChange={(e) => {
                          const updated = [...policy.displayAdvertising.placements];
                          updated[idx].cpmInr = Number(e.target.value) || 0;
                          setPolicy({ ...policy, displayAdvertising: { ...policy.displayAdvertising, placements: updated } });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
