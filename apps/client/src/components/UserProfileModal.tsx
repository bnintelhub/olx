import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Tag,
  Heart,
  Save,
  RefreshCw,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '@/lib/api-client';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMyAds?: () => void;
  onOpenWishlist?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenMyAds,
  onOpenWishlist,
}) => {
  const { user, setUser } = useAuth();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [adsCount, setAdsCount] = useState(0);
  const [favCount, setFavCount] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.profile?.name || '');
      setBio(user.profile?.bio || '');
      setEmail(user.email || '');
      setBusinessName(user.profile?.businessName || '');
      setIsIdentityVerified(Boolean(user.profile?.isIdentityVerified));
      setMessage(null);

      // Fetch latest profile & stats from API
      setIsLoading(true);
      apiClient.get('/user/profile')
        .then((res) => {
          if (res.data?.success && res.data.data) {
            const u = res.data.data;
            setName(u.profile?.name || '');
            setBio(u.profile?.bio || '');
            setEmail(u.email || '');
            setBusinessName(u.profile?.businessName || '');
            setIsIdentityVerified(Boolean(u.profile?.isIdentityVerified));
            setAdsCount(u._count?.ads || 0);
            setFavCount(u._count?.favourites || 0);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      const res = await apiClient.put('/user/profile', {
        name: name.trim(),
        bio: bio.trim(),
        email: email.trim() || undefined,
        businessName: businessName.trim() || undefined,
      });

      if (res.data?.data) {
        setUser(res.data.data);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Something went wrong.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetVerified = async () => {
    setIsVerifying(true);
    setMessage(null);

    try {
      const res = await apiClient.post('/user/verify-identity');
      if (res.data?.success) {
        setIsIdentityVerified(true);
        setMessage({
          type: 'success',
          text: 'Congratulations! Your profile identity verification badge is now ACTIVE.',
        });

        if (user.profile) {
          const updated = {
            ...user,
            profile: { ...user.profile, isIdentityVerified: true },
          };
          setUser(updated);
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Verification failed.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsVerifying(false);
    }
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : 'Oct 2026';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-[#D8DFE2] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAED] bg-[#002f34] px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <UserIcon size={20} className="text-[#FFD54A]" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              User Profile & Account Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-2 text-xs text-gray-500 gap-2">
              <RefreshCw size={14} className="animate-spin text-[#008581]" />
              <span>Refreshing latest profile data...</span>
            </div>
          )}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* User Card Overview */}
          <div className="rounded-2xl bg-gradient-to-br from-[#F5F8F9] to-white border border-[#E5EAED] p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-2 border-[#00a49f] bg-[#e6f7f6] flex items-center justify-center text-2xl font-black text-[#008581] shadow-xs">
                {name?.[0]?.toUpperCase() || user.phoneNumber?.[0] || 'U'}
              </div>
              {isIdentityVerified && (
                <div
                  className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1 shadow-md border-2 border-white"
                  title="Verified User Badge"
                >
                  <ShieldCheck size={16} />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl font-bold text-[#002f34]">{name || 'BLX Orbit Member'}</h3>
                {isIdentityVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    <ShieldCheck size={12} className="text-blue-600" /> VERIFIED BADGE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    PHONE VERIFIED
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-gray-400" />
                  +91 {user.phoneNumber || '9876543210'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-gray-400" />
                  Member since {memberSince}
                </span>
              </div>

              {/* Stats badges */}
              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenMyAds) onOpenMyAds();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-[#D8DFE2] bg-white px-3 py-1.5 text-xs font-semibold text-[#002f34] hover:bg-gray-50 transition shadow-xs"
                >
                  <Tag size={13} className="text-[#008581]" />
                  <span>My Listings:</span>
                  <strong className="text-[#002f34]">{adsCount}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenWishlist) onOpenWishlist();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-[#D8DFE2] bg-white px-3 py-1.5 text-xs font-semibold text-[#002f34] hover:bg-gray-50 transition shadow-xs"
                >
                  <Heart size={13} className="text-red-500" />
                  <span>Saved Ads:</span>
                  <strong className="text-[#002f34]">{favCount}</strong>
                </button>
              </div>
            </div>
          </div>

          {/* Verification Badge Banner */}
          {!isIdentityVerified ? (
            <div className="rounded-xl bg-[#FFF9E6] border border-[#FFE082] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#002f34]">
                    Add your BLX Orbit Verification Badge
                  </h4>
                  <p className="text-[11px] text-gray-600">
                    Verified profiles receive 3x more buyer inquiries and higher trust ranking.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetVerified}
                disabled={isVerifying}
                className="rounded-lg bg-[#002f34] hover:bg-[#003d45] text-white px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Award size={14} className="text-[#FFD54A]" />
                    <span>Get Verified</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50/60 border border-blue-200 p-3.5 flex items-center gap-3 text-xs text-blue-900">
              <ShieldCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span>
                <strong>Verification Badge Active:</strong> Your public seller profile carries the official BLX Orbit verified trust shield.
              </span>
            </div>
          )}

          {/* Edit Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
              Edit Profile Details
            </h4>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Md Arif"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-medium outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-medium outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Business / Store Name (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Arif Automobile Motors"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-medium outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">About / Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a short intro about yourself, what you buy or sell..."
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-medium outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="flex items-center gap-2 rounded-lg bg-[#002f34] hover:bg-[#003d45] px-6 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
