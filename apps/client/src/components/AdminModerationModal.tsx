import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Flag,
  Zap,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface PendingAdItem {
  id: string;
  title: string;
  price: number | string;
  rejectionReason?: string;
  category?: { name: string };
  location?: { name: string };
  images?: { displayUrl: string }[];
  user?: {
    phoneNumber: string;
    profile?: { name: string; ratingAverage: number | string };
  };
  reports?: { id: string; reason: string; details?: string }[];
}

interface ReportItem {
  id: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reporter?: {
    phoneNumber: string;
    profile?: { name: string };
  };
  ad?: {
    id: string;
    title: string;
    price: number | string;
    status: string;
    images?: { displayUrl: string }[];
  };
}

export const AdminModerationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'REPORTS' | 'BOOST'>('PENDING');

  const [pendingAds, setPendingAds] = useState<PendingAdItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [activeAds, setActiveAds] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectingAdId, setRejectingAdId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Violates community posting standards');

  const getToken = () => localStorage.getItem('olx_access_token') || localStorage.getItem('token');

  const fetchPendingAds = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/v1/moderation/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.ads) {
        setPendingAds(data.data.ads);
      }
    } catch (err) {
      console.error('Error fetching pending ads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/v1/moderation/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.reports) {
        setReports(data.data.reports);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveAds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/ads?limit=15');
      const data = await res.json();
      if (data.success && data.data?.ads) {
        setActiveAds(data.data.ads);
      }
    } catch (err) {
      console.error('Error fetching active ads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'PENDING') fetchPendingAds();
    else if (activeTab === 'REPORTS') fetchReports();
    else if (activeTab === 'BOOST') fetchActiveAds();
  }, [isOpen, activeTab]);

  const handleReview = async (adId: string, action: 'APPROVE' | 'REJECT') => {
    setActionInProgress(adId);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/moderation/ads/${adId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'REJECT' ? rejectReason : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPendingAds((prev) => prev.filter((a) => a.id !== adId));
        setRejectingAdId(null);
      }
    } catch (err) {
      console.error('Error reviewing ad:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResolveReport = async (reportId: string, takeDownAd: boolean) => {
    setActionInProgress(reportId);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/moderation/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: takeDownAd ? 'RESOLVED' : 'DISMISSED',
          adminNote: takeDownAd
            ? 'Ad removed by safety moderator due to policy violation'
            : 'Dismissed: No policy violation found',
          takeDownAd,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, status: takeDownAd ? 'RESOLVED' : 'DISMISSED' } : r
          )
        );
      }
    } catch (err) {
      console.error('Error resolving report:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBoostAd = async (adId: string) => {
    setActionInProgress(adId);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/moderation/ads/${adId}/boost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'FEATURED', days: 7 }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Ad successfully featured for 7 days!');
      }
    } catch (err) {
      console.error('Error boosting ad:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-[88vh] max-h-[750px] border border-gray-200">
        {/* Header */}
        <div className="bg-[#002f34] text-white px-5 py-4 flex items-center justify-between border-b border-[#003d44] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Admin Moderation & Anti-Fraud Center
              </h2>
              <p className="text-[11px] text-gray-300">
                Phase 6 • Automated Content Safety & Community Protection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-100 px-6 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'PENDING'
                  ? 'bg-white text-[#002f34] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Pending Queue ({pendingAds.length})
            </button>

            <button
              onClick={() => setActiveTab('REPORTS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'REPORTS'
                  ? 'bg-white text-[#002f34] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Flag className="w-3.5 h-3.5 text-red-500" />
              Reported Listings ({reports.filter((r) => r.status === 'PENDING').length})
            </button>

            <button
              onClick={() => setActiveTab('BOOST')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'BOOST'
                  ? 'bg-white text-[#002f34] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Featured Ad Promotions
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === 'PENDING') fetchPendingAds();
              else if (activeTab === 'REPORTS') fetchReports();
              else if (activeTab === 'BOOST') fetchActiveAds();
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-[#002f34] hover:bg-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-grow bg-gray-50">
          {/* TAB 1: PENDING ADS QUEUE */}
          {activeTab === 'PENDING' && (
            <div className="space-y-4">
              {loading ? (
                <div className="py-20 text-center text-xs text-gray-500">
                  <div className="w-8 h-8 border-3 border-[#002f34] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading pending queue...
                </div>
              ) : pendingAds.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <h3 className="font-bold text-gray-800 text-sm">All Clear!</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    There are no listings awaiting moderation review.
                  </p>
                </div>
              ) : (
                pendingAds.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <img
                          src={
                            ad.images?.[0]?.displayUrl ||
                            'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-[#002f34]">
                              ₹{Number(ad.price).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                              Needs Review
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-gray-900 mt-0.5">
                            {ad.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                            <span>{ad.category?.name || 'Category'}</span>
                            <span>•</span>
                            <span>{ad.location?.name || 'Location'}</span>
                            <span>•</span>
                            <span>Seller: {ad.user?.profile?.name || ad.user?.phoneNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          disabled={actionInProgress === ad.id}
                          onClick={() => handleReview(ad.id, 'APPROVE')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          disabled={actionInProgress === ad.id}
                          onClick={() => setRejectingAdId(ad.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* Rejection / Moderation Flag Reason */}
                    {ad.rejectionReason && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Automated Moderation Flag: </span>
                          <span>{ad.rejectionReason}</span>
                        </div>
                      </div>
                    )}

                    {/* Reject Dialog inline */}
                    {rejectingAdId === ad.id && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200 space-y-2">
                        <label className="text-xs font-bold text-red-900 block">
                          Reason for rejection:
                        </label>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full text-xs p-2 border border-red-300 rounded bg-white outline-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setRejectingAdId(null)}
                            className="px-3 py-1 text-xs text-gray-600 hover:bg-white rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReview(ad.id, 'REJECT')}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: USER REPORTS */}
          {activeTab === 'REPORTS' && (
            <div className="space-y-4">
              {loading ? (
                <div className="py-20 text-center text-xs text-gray-500">
                  <div className="w-8 h-8 border-3 border-[#002f34] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading reports...
                </div>
              ) : reports.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <h3 className="font-bold text-gray-800 text-sm">No Reports Filed</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    No community complaints have been submitted yet.
                  </p>
                </div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                            {rep.reason.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rep.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : rep.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            STATUS: {rep.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 mt-2">
                          Target Ad:{' '}
                          <span className="text-[#002f34] font-bold">
                            {rep.ad?.title || 'Classified Ad'} (₹
                            {Number(rep.ad?.price || 0).toLocaleString('en-IN')})
                          </span>
                        </p>
                        {rep.details && (
                          <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded mt-1.5 border border-gray-100">
                            "{rep.details}"
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          Reported by: {rep.reporter?.profile?.name || rep.reporter?.phoneNumber} •{' '}
                          {new Date(rep.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {rep.status === 'PENDING' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            disabled={actionInProgress === rep.id}
                            onClick={() => handleResolveReport(rep.id, true)}
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition shadow-xs"
                          >
                            Take Down Ad
                          </button>
                          <button
                            disabled={actionInProgress === rep.id}
                            onClick={() => handleResolveReport(rep.id, false)}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded text-xs font-medium transition"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: BOOST AD PROMOTIONS */}
          {activeTab === 'BOOST' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  Admin Promotion Engine: Instantly assign <strong>FEATURED (Gold Badge)</strong> status to high-value ads.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeAds.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <img
                        src={
                          ad.images?.[0]?.displayUrl ||
                          'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&auto=format&fit=crop&q=80'
                        }
                        alt=""
                        className="w-12 h-12 rounded object-cover flex-shrink-0 border"
                      />
                      <div className="truncate">
                        <span className="text-xs font-bold text-[#002f34]">
                          ₹{Number(ad.price).toLocaleString('en-IN')}
                        </span>
                        <p className="text-xs text-gray-800 font-semibold truncate">
                          {ad.title}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {ad.location?.name || 'All India'}
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={actionInProgress === ad.id}
                      onClick={() => handleBoostAd(ad.id)}
                      className="px-3 py-1.5 bg-[#ffce32] hover:bg-amber-400 text-[#002f34] rounded text-xs font-extrabold transition shadow-xs flex-shrink-0 flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      Feature
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
