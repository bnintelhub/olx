import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  Heart,
  Calendar,
  CheckCircle,
  RotateCcw,
  Trash2,
  Tag,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface MyAdItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'SOLD' | 'EXPIRED' | 'ARCHIVED';
  viewCount: number;
  favouriteCount: number;
  createdAt: string;
  category: { name: string; slug: string };
  location: { name: string };
  images: { thumbnailUrl: string; isCover: boolean }[];
}

export const MyAdsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenPostAd: () => void;
}> = ({ isOpen, onClose, onOpenPostAd }) => {
  const [ads, setAds] = useState<MyAdItem[]>([]);
  const [counts, setCounts] = useState({
    ACTIVE: 0,
    PENDING_REVIEW: 0,
    SOLD: 0,
    EXPIRED: 0,
    ARCHIVED: 0,
  });
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'ACTIVE' | 'SOLD' | 'EXPIRED'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMyAds = async () => {
    const token = localStorage.getItem('olx_access_token');
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/user/my-ads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAds(data.data.ads || []);
        if (data.data.counts) setCounts(data.data.counts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMyAds();
    }
  }, [isOpen]);

  const handleUpdateStatus = async (adId: string, newStatus: string) => {
    const token = localStorage.getItem('olx_access_token');
    if (!token) return;

    setUpdatingId(adId);
    try {
      const res = await fetch(`/api/v1/ads/${adId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchMyAds();
      } else {
        const data = await res.json();
        alert(data.error?.message || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOpen) return null;

  const filteredAds =
    selectedTab === 'ALL' ? ads : ads.filter((ad) => ad.status === selectedTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex h-[88vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-primary px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">My Ads Dashboard</h2>
              <p className="text-xs text-gray-300">
                Manage your listings, track views, mark items as sold, or renew
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenPostAd();
              }}
              className="flex items-center gap-1.5 rounded-full bg-sell px-4 py-1.5 text-xs font-extrabold text-primary shadow hover:bg-sell-hover transition"
            >
              <Plus size={16} /> + Post New Ad
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-300 hover:bg-white/10 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Filter Navigation */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-2 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedTab('ALL')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              selectedTab === 'ALL'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Listings ({ads.length})
          </button>
          <button
            onClick={() => setSelectedTab('ACTIVE')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              selectedTab === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Active ({counts.ACTIVE})
          </button>
          <button
            onClick={() => setSelectedTab('SOLD')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              selectedTab === 'SOLD'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sold ({counts.SOLD})
          </button>
          <button
            onClick={() => setSelectedTab('EXPIRED')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              selectedTab === 'EXPIRED'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Expired ({counts.EXPIRED})
          </button>
        </div>

        {/* Ads List Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <RefreshCw className="animate-spin mb-2" size={32} />
              <p className="text-sm font-semibold">Loading your listings...</p>
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <AlertCircle size={44} className="mx-auto mb-3 opacity-40" />
              <p className="text-base font-bold text-gray-700">No ads found in this tab</p>
              <p className="text-xs text-gray-500 mt-1">
                You haven't posted any items matching this status yet.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenPostAd();
                }}
                className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-primary-dark transition"
              >
                Post Your First Ad
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAds.map((ad) => {
                const coverImage =
                  ad.images?.[0]?.thumbnailUrl ||
                  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&auto=format&fit=crop&q=80';
                const isItemUpdating = updatingId === ad.id;

                return (
                  <div
                    key={ad.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-accent transition"
                  >
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                        <img src={coverImage} alt={ad.title} className="h-full w-full object-cover" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              ad.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ad.status === 'SOLD'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ad.status}
                          </span>
                          <span className="text-xs text-gray-400">• {ad.category?.name}</span>
                          <span className="text-xs text-gray-400">• {ad.location?.name}</span>
                        </div>

                        <h4 className="mt-1 font-bold text-sm text-primary line-clamp-1">{ad.title}</h4>
                        <p className="text-base font-black text-accent mt-0.5">
                          ₹ {Number(ad.price).toLocaleString('en-IN')}
                        </p>

                        <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye size={14} className="text-gray-400" /> {ad.viewCount} Views
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart size={14} className="text-gray-400" /> {ad.favouriteCount} Likes
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} className="text-gray-400" />{' '}
                            {new Date(ad.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                      {ad.status === 'ACTIVE' && (
                        <button
                          disabled={isItemUpdating}
                          onClick={() => handleUpdateStatus(ad.id, 'SOLD')}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition disabled:opacity-50"
                        >
                          <CheckCircle size={14} />
                          <span>Mark as Sold</span>
                        </button>
                      )}

                      {ad.status === 'SOLD' && (
                        <button
                          disabled={isItemUpdating}
                          onClick={() => handleUpdateStatus(ad.id, 'ACTIVE')}
                          className="flex items-center gap-1.5 rounded-lg border border-blue-500 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition disabled:opacity-50"
                        >
                          <RotateCcw size={14} />
                          <span>Relist Ad</span>
                        </button>
                      )}

                      <button
                        disabled={isItemUpdating}
                        onClick={() => handleUpdateStatus(ad.id, 'ARCHIVED')}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Delete / Archive"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
