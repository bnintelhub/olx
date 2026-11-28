import React, { useRef, useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Edit3,
  X,
  Camera,
  Loader2,
  Package,
  Heart,
  Star,
} from 'lucide-react';
import { formatMediaUrl } from '@/lib/utils';

interface ProfileHeaderProps {
  name: string;
  phoneNumber?: string;
  businessName?: string;
  avatarUrl?: string;
  memberSince: string;
  accountType?: string;
  isIdentityVerified: boolean;
  adsCount: number;
  favCount: number;
  ratingAverage: number;
  isEditing: boolean;
  isUploadingAvatar: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenMyAds?: () => void;
  onOpenWishlist?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  phoneNumber,
  businessName,
  avatarUrl,
  memberSince,
  accountType = 'Individual',
  isIdentityVerified,
  adsCount,
  favCount,
  ratingAverage,
  isEditing,
  isUploadingAvatar,
  onStartEdit,
  onCancelEdit,
  onFileSelect,
  onOpenMyAds,
  onOpenWishlist,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayName = name || phoneNumber || 'Marketplace Seller';
  const initial = (displayName.charAt(0) || 'U').toUpperCase();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  return (
    <div className="bg-white rounded-xl border border-[#E5EAED] p-6 shadow-2xs">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={onFileSelect}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Avatar & Identity details */}
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <div className="relative shrink-0 group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#F4F6F8] border border-[#E5EAED] overflow-hidden flex items-center justify-center relative">
              {isUploadingAvatar ? (
                <div className="flex flex-col items-center justify-center bg-white/80 absolute inset-0">
                  <Loader2 className="w-5 h-5 animate-spin text-[#002f34]" />
                  <span className="text-[10px] font-semibold text-gray-500 mt-1">Uploading</span>
                </div>
              ) : avatarUrl && !imgError ? (
                <img
                  src={formatMediaUrl(avatarUrl)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-2xl font-bold text-[#002f34]">{initial}</span>
              )}

              {/* Hover overlay for changing photo */}
              {!isUploadingAvatar && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-[#002f34]/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-150 cursor-pointer"
                  title="Change profile photo"
                >
                  <Camera className="w-4 h-4 text-white mb-0.5" />
                  <span className="text-[10px] font-medium">Change</span>
                </button>
              )}
            </div>

            {/* Quick camera trigger icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-1 -right-1 bg-white hover:bg-gray-50 text-gray-700 p-1.5 rounded-lg border border-[#D8DFE2] shadow-2xs transition cursor-pointer"
              title="Upload photo"
            >
              <Camera className="w-3.5 h-3.5 text-[#002f34]" />
            </button>
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-[#002f34] truncate">
                {displayName}
              </h1>

              {isIdentityVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Seller</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  Standard Member
                </span>
              )}
            </div>

            {businessName && (
              <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium truncate">
                <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="truncate">{businessName}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>Member since {memberSince}</span>
              </span>
              <span>•</span>
              <span className="capitalize">{accountType.toLowerCase()} account</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Stats & Edit Trigger */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onOpenMyAds}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-left transition cursor-pointer"
              title="View my active classifieds"
            >
              <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                <Package className="w-3 h-3 text-gray-400" />
                <span>Classifieds</span>
              </div>
              <p className="text-sm font-bold text-[#002f34] tabular-nums mt-0.5">{adsCount}</p>
            </button>

            <button
              type="button"
              onClick={onOpenWishlist}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-left transition cursor-pointer"
              title="View saved favorites"
            >
              <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                <Heart className="w-3 h-3 text-gray-400" />
                <span>Favorites</span>
              </div>
              <p className="text-sm font-bold text-[#002f34] tabular-nums mt-0.5">{favCount}</p>
            </button>

            <div className="px-3 py-1.5 rounded-lg border border-gray-200 text-left">
              <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Rating</span>
              </div>
              <p className="text-sm font-bold text-[#002f34] tabular-nums mt-0.5">
                {ratingAverage > 0 ? ratingAverage.toFixed(1) : '5.0'}
              </p>
            </div>
          </div>

          <div>
            {!isEditing ? (
              <button
                type="button"
                onClick={onStartEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-[#002f34] hover:bg-[#003f46] text-white transition cursor-pointer shadow-none active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
