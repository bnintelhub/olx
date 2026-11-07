import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Eye,
  Heart,
  Calendar,
  CheckCircle,
  RotateCcw,
  Trash2,
  Tag,
  MapPin,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adsService } from '../service/ads.service';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { ADS_QUERY_KEYS } from '../hook/useAdsQuery';

interface MyAdItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'SOLD' | 'EXPIRED' | 'REJECTED' | 'DRAFT';
  viewCount: number;
  favouriteCount: number;
  rejectionReason?: string;
  createdAt: string;
  category?: { name: string; slug: string };
  location?: { name: string };
  images?: Array<{
    id?: string;
    thumbnailUrl?: string;
    displayUrl?: string;
    originalUrl?: string;
    isCover?: boolean;
  }>;
}

export const MyAdsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useAuthStore();

  const [ads, setAds] = useState<MyAdItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    ACTIVE: 0,
    PENDING_REVIEW: 0,
    SOLD: 0,
    EXPIRED: 0,
  });
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'ACTIVE' | 'PENDING_REVIEW' | 'SOLD' | 'EXPIRED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAds = async () => {
    setIsLoading(true);
    try {
      const res = await adsService.getMyAds(selectedTab);
      setAds(res.ads || []);
      if (res.counts) setCounts(res.counts);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load your advertisements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAds();
    } else {
      setIsLoading(false);
    }
  }, [user, selectedTab]);

  const handleUpdateStatus = async (adId: string, newStatus: string) => {
    setUpdatingId(adId);
    try {
      await adsService.updateAdStatus(adId, newStatus);
      toast.success(newStatus === 'SOLD' ? 'Ad marked as sold!' : 'Ad status updated!');
      fetchAds();
      queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update ad status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm('Are you sure you want to delete this listing permanently?')) return;
    setUpdatingId(adId);
    try {
      await adsService.deleteAd(adId);
      toast.success('Listing deleted successfully');
      setAds((prev) => prev.filter((a) => a.id !== adId));
      fetchAds();
      queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete advertisement');
    } finally {
      setUpdatingId(null);
    }
  };

  // Status badge config
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Active & Live</span>
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Under Review</span>
          </span>
        );
      case 'SOLD':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle className="w-3 h-3 text-blue-600" />
            <span>Sold Out</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
            <span>{status}</span>
          </span>
        );
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto">
            <Tag className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-[#002f34]">Sign In to View Your Ads</h2>
          <p className="text-xs text-gray-500">
            Please log in with your verified account to track views, respond to buyers, and manage your classified advertisements.
          </p>
          <Button
            type="button"
            onClick={() => openAuthModal()}
            className="w-full bg-[#002f34] hover:bg-[#003d44] text-white font-bold text-xs h-10 rounded-xl cursor-pointer"
          >
            Log In or Register
          </Button>
        </div>
      </div>
    );
  }

  const tabs: Array<{ key: 'ALL' | 'ACTIVE' | 'PENDING_REVIEW' | 'SOLD' | 'EXPIRED'; label: string; count?: number }> = [
    { key: 'ALL', label: 'All Listings', count: (counts.ACTIVE || 0) + (counts.PENDING_REVIEW || 0) + (counts.SOLD || 0) + (counts.EXPIRED || 0) },
    { key: 'ACTIVE', label: 'Active', count: counts.ACTIVE || 0 },
    { key: 'PENDING_REVIEW', label: 'Pending Review', count: counts.PENDING_REVIEW || 0 },
    { key: 'SOLD', label: 'Sold', count: counts.SOLD || 0 },
    { key: 'EXPIRED', label: 'Expired', count: counts.EXPIRED || 0 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="hover:text-teal-700 font-bold transition cursor-pointer"
        >
          Home
        </button>
        <span>/</span>
        <span className="text-[#002f34] font-bold">My Classified Ads</span>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seller Dashboard</span>
          </span>
          <h1 className="text-2xl font-black text-[#002f34] mt-0.5">
            My Classified Advertisements
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track inquiries, manage live listings, and monitor moderation status in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={fetchAds}
            disabled={isLoading}
            className="h-10 px-3 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            onClick={() => navigate('/sell')}
            className="h-10 px-4 bg-[#002f34] hover:bg-[#003d44] text-white text-xs font-bold rounded-xl gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#ffce32]" />
            <span>Post New Ad</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
        {tabs.map((tab) => {
          const isActive = selectedTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-[#002f34] text-white shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex gap-4 animate-pulse">
              <div className="w-24 sm:w-32 h-24 sm:h-32 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-5 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ads List */}
      {!isLoading && ads.length > 0 && (
        <div className="space-y-4">
          {ads.map((ad) => {
            const coverImage =
              ad.images?.find((img) => img.isCover)?.thumbnailUrl ||
              ad.images?.find((img) => img.isCover)?.displayUrl ||
              ad.images?.[0]?.thumbnailUrl ||
              ad.images?.[0]?.displayUrl ||
              '/placeholder-ad.png';

            const isUpdating = updatingId === ad.id;

            return (
              <div
                key={ad.id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-all p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail & Meta */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100 relative">
                    <img
                      src={coverImage}
                      alt={ad.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    {ad.status === 'SOLD' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase text-white bg-blue-600 px-2 py-0.5 rounded shadow">
                          Sold
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Status & Category */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(ad.status)}
                      {ad.category?.name && (
                        <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {ad.category.name}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => navigate(`/ad/${ad.id}`)}
                      className="text-base font-bold text-[#002f34] truncate hover:text-teal-700 cursor-pointer"
                    >
                      {ad.title}
                    </h3>

                    {/* Price */}
                    <div className="text-lg font-black text-[#002f34]">
                      ₹ {Number(ad.price).toLocaleString('en-IN')}
                    </div>

                    {/* Location & Stats */}
                    <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500 pt-0.5 flex-wrap">
                      {ad.location?.name && (
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-teal-700" />
                          <span>{ad.location.name}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-medium">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        <span>{ad.viewCount || 0} views</span>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span>{ad.favouriteCount || 0} saves</span>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(ad.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                    </div>

                    {/* Moderation Note */}
                    {ad.status === 'PENDING_REVIEW' && (
                      <p className="text-[11px] text-amber-700 bg-amber-50/70 p-2 rounded-lg border border-amber-100 flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>This listing is queued for safety & policy review. It will become visible publicly once approved.</span>
                      </p>
                    )}
                    {ad.status === 'REJECTED' && ad.rejectionReason && (
                      <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>Rejection reason: {ad.rejectionReason}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/ad/${ad.id}`)}
                    className="text-xs font-bold h-9 px-3 gap-1.5 rounded-xl cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Ad</span>
                  </Button>

                  {ad.status === 'ACTIVE' && (
                    <Button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(ad.id, 'SOLD')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-3 gap-1.5 rounded-xl cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark as Sold</span>
                    </Button>
                  )}

                  {ad.status === 'SOLD' && (
                    <Button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(ad.id, 'ACTIVE')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-3 gap-1.5 rounded-xl cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-activate</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isUpdating}
                    onClick={() => handleDeleteAd(ad.id)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold h-9 px-3 gap-1.5 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && ads.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto">
            <Tag className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#002f34]">
              {selectedTab === 'ALL'
                ? 'You haven’t posted any advertisements yet'
                : `No ${selectedTab.replace('_', ' ').toLowerCase()} listings found`}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Post an advertisement in under 2 minutes to reach verified buyers across your city.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => navigate('/sell')}
            className="bg-[#002f34] hover:bg-[#003d44] text-white text-xs font-bold h-10 px-6 rounded-xl gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#ffce32]" />
            <span>Post an Advertisement</span>
          </Button>
        </div>
      )}
    </div>
  );
};
