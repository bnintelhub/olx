import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  Building,
  User as UserIcon,
  Calendar,
  Edit3,
  Award,
  Sparkles,
  Star,
  Package,
  Heart,
  Save,
  X,
  ArrowRight,
  Lock,
  ExternalLink,
  Camera,
  Upload,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/useAuth';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { formatMediaUrl } from '@/lib/utils';
import { adsService } from '@/features/ads/service/ads.service';

interface TrustProfileCardProps {
  isModal?: boolean;
  onClose?: () => void;
  onOpenMyAds?: () => void;
  onOpenWishlist?: () => void;
}

function getCleanErrorMessage(err: any, fallback: string): string {
  if (!err) return fallback;

  const data = err.response?.data;
  let raw =
    data?.error?.message ||
    data?.message ||
    err.message ||
    fallback;

  if (typeof raw === 'string') {
    // If generic internal server error, check details or provide clean explanation
    if (
      raw.includes('unexpected internal server error') ||
      raw.includes('INTERNAL_SERVER_ERROR')
    ) {
      const details = String(data?.error?.details || '');
      if (details.includes('Unique constraint') || details.includes('storage_key')) {
        return 'Replacing existing photo. Please try uploading again.';
      }
      return 'Server is busy right now. Please try again in a few moments.';
    }

    // Strip raw HTTP status codes (e.g. 400, 401, 404, 500) and request code wrappers
    raw = raw
      .replace(/Request failed with status code \d+:?\s*/i, '')
      .replace(/\b(400|401|403|404|409|413|415|422|429|500|502|503)\b\s*[-:]?\s*/g, '')
      .replace(/^[A-Z_]+:\s*/, '')
      .trim();

    // Map common error codes to human-friendly text
    if (raw === 'UNAUTHORIZED' || raw.includes('Authentication is required')) {
      return 'Please log in to update your profile photo.';
    }
    if (raw === 'FILE_TOO_LARGE' || raw.includes('exceeds the maximum allowed')) {
      return 'Photo size exceeds 5MB limit. Please choose a smaller photo.';
    }
    if (raw === 'INVALID_FILE_TYPE' || raw.includes('permitted')) {
      return 'Please upload a valid image file (JPG, PNG, or WebP).';
    }
  }

  return raw || fallback;
}

export const TrustProfileCard: React.FC<TrustProfileCardProps> = ({
  isModal = false,
  onClose,
  onOpenMyAds,
  onOpenWishlist,
}) => {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View / Edit Mode Toggle (Immutable by default)
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Profile & Verification Data from API
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Fetch full profile from API on mount
  const fetchProfile = () => {
    setIsLoading(true);
    apiClient
      .get('/user/profile')
      .then((res) => {
        if (res.data?.success && res.data.data) {
          const u = res.data.data;
          setProfileData(u);
          setName(u.profile?.name || '');
          setBio(u.profile?.bio || '');
          setEmail(u.email || '');
          setBusinessName(u.profile?.businessName || '');
          setAvatarUrl(u.profile?.avatarUrl || '');
        }
      })
      .catch((err) => {
        console.error('Failed to load profile details:', err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user?.id]);

  // Derived Profile Values (Fallback to context user if API response pending)
  const activeUser = profileData || user;
  const profile = activeUser?.profile || {};
  const currentAvatar = avatarUrl || profile?.avatarUrl || '';
  const isPhoneVerified = Boolean(activeUser?.isPhoneVerified);
  const isEmailVerified = Boolean(activeUser?.isEmailVerified);
  const isIdentityVerified = Boolean(profile?.isIdentityVerified);
  const adsCount = activeUser?._count?.ads ?? 0;
  const favCount = activeUser?._count?.favourites ?? 0;
  const ratingAverage = Number(profile?.ratingAverage || 0);

  // Profile Completion Calculation (All 5 mandatory items before verified badge)
  const hasAvatar = Boolean(currentAvatar?.trim());
  const hasName = Boolean(name?.trim());
  const hasBio = Boolean(bio?.trim());
  const hasEmail = Boolean(email?.trim());
  const hasPhone = Boolean(activeUser?.phoneNumber);

  const criteria = [
    { label: 'Profile Photo Uploaded', met: hasAvatar, weight: 20 },
    { label: 'Phone Number Verified', met: isPhoneVerified, weight: 25 },
    { label: 'Full Display Name', met: hasName, weight: 20 },
    { label: 'Seller Bio / Description', met: hasBio, weight: 20 },
    { label: 'Email Address Linked', met: hasEmail, weight: 15 },
  ];

  const completionPercent = criteria.reduce(
    (acc, c) => (c.met ? acc + c.weight : acc),
    0
  );

  const canUnlockVerifiedTag =
    isPhoneVerified && hasName && hasBio && hasEmail && hasAvatar;

  // Handle native file upload from device filesystem (No URL links)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, or WEBP)');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('images', file);

      // Upload explicitly scoped under users profile avatar (NOT ads/listing drafts)
      const uploadRes = await apiClient.post('/uploads?resource=users&mediaType=avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploaded = uploadRes.data?.success && Array.isArray(uploadRes.data.data) ? uploadRes.data.data : [];
      if (uploaded && uploaded.length > 0) {
        const newUrl = uploaded[0].url || uploaded[0].displayUrl || '';
        setAvatarUrl(newUrl);

        // Instantly save to profile backend
        const res = await apiClient.put('/user/profile', {
          avatarUrl: newUrl,
        });

        if (res.data?.success && res.data.data) {
          setProfileData(res.data.data);
          setUser(res.data.data);
          toast.success('Profile photo uploaded and saved successfully!');
        }
      }
    } catch (err: any) {
      console.error('Failed to upload profile photo:', err);
      toast.error(getCleanErrorMessage(err, 'Failed to upload photo. Please try again.'));
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove profile photo
  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const res = await apiClient.put('/user/profile', {
        avatarUrl: null,
      });

      if (res.data?.success && res.data.data) {
        setProfileData(res.data.data);
        setUser(res.data.data);
        setAvatarUrl('');
        toast.success('Profile photo removed');
      }
    } catch (err: any) {
      console.error('Failed to remove avatar:', err);
      toast.error(getCleanErrorMessage(err, 'Failed to remove photo. Please try again.'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle Save Profile (Calls PUT /api/v1/user/profile)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        bio: bio.trim() || undefined,
        email: email.trim() || undefined,
        businessName: businessName.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      };

      const res = await apiClient.put('/user/profile', payload);
      if (res.data?.success && res.data.data) {
        setProfileData(res.data.data);
        setUser(res.data.data);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      }
    } catch (err: any) {
      toast.error(getCleanErrorMessage(err, 'Failed to update profile. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edits & revert to existing profile data
  const handleCancelEdit = () => {
    setName(profile?.name || '');
    setBio(profile?.bio || '');
    setEmail(activeUser?.email || '');
    setBusinessName(profile?.businessName || '');
    setAvatarUrl(profile?.avatarUrl || '');
    setIsEditing(false);
  };

  // Request Official Identity / Seller Verification Tag (Calls POST /api/v1/user/verify-identity)
  const handleApplyVerifiedBadge = async () => {
    if (!canUnlockVerifiedTag) {
      toast.error('Please complete all 5 profile requirements including photo to unlock verified badge.');
      setIsEditing(true);
      return;
    }

    setIsVerifying(true);
    try {
      const res = await apiClient.post('/user/verify-identity');
      if (res.data?.success) {
        toast.success('Congratulations! Your Official Verified Seller Badge is now ACTIVE.');
        fetchProfile();
      }
    } catch (err: any) {
      toast.error(getCleanErrorMessage(err, 'Verification request failed. Please try again.'));
    } finally {
      setIsVerifying(false);
    }
  };

  const memberSince = activeUser?.createdAt
    ? new Date(activeUser.createdAt).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recent Member';

  return (
    <div className="w-full space-y-6">
      {/* Hidden File Input for Device/System Native File Chooser */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 1. Executive Trustworthy Seller Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002f34] via-[#00383e] to-[#014249] text-white p-6 sm:p-8 shadow-xl border border-teal-900/40">
        {/* Background Ambient Glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Avatar & Core Credentials */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0 group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] sm:min-w-[96px] sm:min-h-[96px] sm:max-w-[96px] sm:max-h-[96px] aspect-square rounded-2xl bg-gradient-to-tr from-[#00a49f] to-[#2ce0d4] text-[#002f34] font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-white/20 overflow-hidden relative shrink-0">
                {isUploadingAvatar ? (
                  <div className="flex flex-col items-center justify-center text-white bg-black/60 absolute inset-0">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-300" />
                    <span className="text-[10px] font-bold mt-1">Uploading</span>
                  </div>
                ) : currentAvatar ? (
                  <img
                    src={formatMediaUrl(currentAvatar)}
                    alt={profile.name || 'User'}
                    className="w-full h-full object-cover block rounded-2xl"
                  />
                ) : (
                  <span>{(profile?.name || activeUser?.phoneNumber || 'U').charAt(0).toUpperCase()}</span>
                )}

                {/* Hover overlay to trigger photo upload from system */}
                {!isUploadingAvatar && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-150 cursor-pointer"
                    title="Upload photo from device"
                  >
                    <Camera className="w-5 h-5 text-teal-300 mb-0.5" />
                    <span className="text-[10px] font-bold">Change</span>
                  </button>
                )}
              </div>

              {/* Camera Icon Trigger Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 bg-[#002f34] hover:bg-teal-700 active:scale-95 text-white p-1.5 rounded-xl shadow-md border-2 border-white/40 transition-all cursor-pointer"
                title="Upload Profile Photo from System"
              >
                <Camera className="w-3.5 h-3.5 text-teal-300" />
              </button>

              {/* Verified Shield Pill Badge on Avatar */}
              {isIdentityVerified && (
                <div
                  className="absolute -top-1.5 -right-1.5 bg-amber-400 text-[#002f34] p-1 rounded-full shadow-md border-2 border-[#002f34]"
                  title="Official Verified Seller"
                >
                  <ShieldCheck className="w-4 h-4 fill-amber-400 text-[#002f34]" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {profile?.name || activeUser?.phoneNumber || 'Verified Seller'}
                </h1>

                {/* Verified Tag Pill */}
                {isIdentityVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 border border-amber-300 text-amber-300 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 fill-amber-400 text-[#002f34]" />
                    <span>Verified Seller</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-gray-300 border border-white/10">
                    <span>Standard Member</span>
                  </span>
                )}
              </div>

              {/* Business Name Badge */}
              {profile?.businessName && (
                <div className="flex items-center gap-1.5 text-xs text-teal-200 font-semibold">
                  <Building className="w-3.5 h-3.5 text-teal-300" />
                  <span>{profile.businessName}</span>
                </div>
              )}

              {/* Member Since & Account Type */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Member since {memberSince}</span>
                </span>
                <span>•</span>
                <span className="capitalize">{profile?.accountType?.toLowerCase() || 'Individual'} Account</span>
              </div>
            </div>
          </div>

          {/* Edit Profile Trigger Button */}
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/15 hover:bg-white/25 active:scale-95 text-white transition flex items-center gap-2 cursor-pointer border border-white/20 backdrop-blur-md shadow-xs shrink-0 self-end sm:self-center"
              title="Click to edit profile fields"
            >
              <Edit3 className="w-4 h-4 text-teal-300" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-gray-200 transition flex items-center gap-1.5 cursor-pointer border border-white/10 shrink-0 self-end sm:self-center"
            >
              <X className="w-4 h-4" />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Verification Badges & Trustworthiness Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Phone Verification Badge Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-700" />
              <span>Phone Verified</span>
            </span>
            {isPhoneVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>Unverified</span>
              </span>
            )}
          </div>
          <p className="text-sm font-extrabold text-slate-800">
            {activeUser?.phoneNumber || 'No phone attached'}
          </p>
          <p className="text-[11px] text-slate-400">
            Used for authentic buyer inquiries & OTP security.
          </p>
        </div>

        {/* Email Verification Badge Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-teal-700" />
              <span>Email Address</span>
            </span>
            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            ) : hasEmail ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <span>Linked</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-500">
                <span>Missing</span>
              </span>
            )}
          </div>
          <p className="text-sm font-extrabold text-slate-800 truncate" title={activeUser?.email}>
            {activeUser?.email || 'Add email in edit mode'}
          </p>
          <p className="text-[11px] text-slate-400">
            Official channel for order invoices and security alerts.
          </p>
        </div>

        {/* Identity & Seller Trust Shield Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Trust Status</span>
            </span>
            {isIdentityVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                <ShieldCheck className="w-3 h-3 text-amber-600 fill-amber-400" />
                <span>Shield Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
                <span>Pending</span>
              </span>
            )}
          </div>
          <p className="text-sm font-extrabold text-slate-800">
            {isIdentityVerified ? 'Verified Trust Shield' : 'Complete to Verify'}
          </p>
          <p className="text-[11px] text-slate-400">
            {isIdentityVerified
              ? 'Carries official BLX Orbit verification badge.'
              : 'Complete profile requirements to unlock shield.'}
          </p>
        </div>
      </div>

      {/* 3. Profile Completion Meter & Verification Unlocker (Only shown if not fully verified) */}
      {!isIdentityVerified && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-50/80 via-white to-amber-50/50 border border-teal-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Complete Profile to Earn Verified Seller Tag
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload a real photo, verify contact details, and write a bio to earn the official trust badge.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-teal-900">
                {completionPercent}% Complete
              </span>
              {canUnlockVerifiedTag && (
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={handleApplyVerifiedBadge}
                  className="px-3.5 py-1.5 text-xs font-extrabold text-[#002f34] bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 fill-amber-400 text-[#002f34]" />
                  <span>{isVerifying ? 'Activating...' : 'Activate Verified Badge'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-amber-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>

          {/* Criteria Checklist Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
            {criteria.map((c, i) => (
              <div
                key={i}
                className={`p-2 rounded-xl border flex items-center gap-2 ${
                  c.met
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                {c.met ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className="text-[11px] font-semibold truncate">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Seller Stats & Activity Row */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onOpenMyAds}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-500/50 hover:bg-teal-50/20 transition-all text-left shadow-2xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-teal-700">
            <Package className="w-4 h-4" />
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{adsCount}</p>
          <p className="text-xs font-semibold text-slate-500">Active Classifieds</p>
        </button>

        <button
          type="button"
          onClick={onOpenWishlist}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50/20 transition-all text-left shadow-2xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-red-600">
            <Heart className="w-4 h-4" />
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{favCount}</p>
          <p className="text-xs font-semibold text-slate-500">Saved Ads</p>
        </button>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-left">
          <div className="flex items-center justify-between text-amber-500">
            <Star className="w-4 h-4 fill-amber-400" />
            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded">
              High Trust
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {ratingAverage > 0 ? ratingAverage.toFixed(1) : '5.0'}
          </p>
          <p className="text-xs font-semibold text-slate-500">Community Score</p>
        </div>
      </div>

      {/* 5. Main Profile Content: Immutable View Mode vs Edit Mode */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-teal-700" />
            <span>{isEditing ? 'Edit Profile Details' : 'Public Seller Information'}</span>
          </h2>
          <span className="text-xs text-slate-400">
            {isEditing ? 'Fill in details below' : 'Visible to buyers on your listings'}
          </span>
        </div>

        {/* View Mode (Immutable by default) */}
        {!isEditing ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Full Display Name
                </span>
                <p className="text-sm font-bold text-slate-800">{name || 'Not provided'}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Business / Store Name
                </span>
                <p className="text-sm font-bold text-slate-800">
                  {businessName || 'Individual Seller (No Store)'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Registered Email
                </span>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {email || 'No email associated'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Primary Mobile
                </span>
                <p className="text-sm font-bold text-slate-800">
                  {activeUser?.phoneNumber || 'No phone attached'}
                </p>
              </div>
            </div>

            {/* About / Bio Card */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Seller About / Bio Description
              </span>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed font-medium">
                {bio || (
                  <span className="italic text-slate-400">
                    No bio description written yet. Click "Edit Profile" above to tell buyers about your experience and build confidence.
                  </span>
                )}
              </p>
            </div>
          </div>
        ) : (
          /* Edit Mode (Form Inputs - only visible when clicking edit icon) */
          <form onSubmit={handleSaveProfile} className="space-y-5 animate-in fade-in duration-150">
            {/* Native Device File Upload for Profile Photo (No URL links) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Profile Photo (Upload from Device)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] sm:min-w-[96px] sm:min-h-[96px] sm:max-w-[96px] sm:max-h-[96px] aspect-square rounded-2xl bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {isUploadingAvatar ? (
                    <div className="flex flex-col items-center justify-center text-teal-700">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-[10px] font-bold mt-1">Uploading</span>
                    </div>
                  ) : currentAvatar ? (
                    <img
                      src={formatMediaUrl(currentAvatar)}
                      alt="Preview"
                      className="w-full h-full object-cover block rounded-2xl"
                    />
                  ) : (
                    <UserIcon className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#002f34] text-white hover:bg-teal-900 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-teal-300" />
                      <span>{currentAvatar ? 'Change Photo' : 'Upload from Device'}</span>
                    </button>

                    {currentAvatar && (
                      <button
                        type="button"
                        disabled={isUploadingAvatar}
                        onClick={handleRemoveAvatar}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 active:scale-95 border border-red-200 transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    Supports JPG, PNG, or WEBP up to 5MB. Previous photo is automatically cleaned up from storage.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002f34] text-sm text-slate-800 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002f34] text-sm text-slate-800 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Used for transaction invoices and safety notifications.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Business / Store Name (Optional)
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Atore Store, Prime Electronics"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002f34] text-sm text-slate-800 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                About / Bio Description
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your dealership, trustworthiness, or items you frequently trade..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002f34] text-sm text-slate-800 transition resize-y"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                A good description builds trust and helps buyers feel confident when making offers.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-[#002f34] hover:bg-teal-900 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-teal-300" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
