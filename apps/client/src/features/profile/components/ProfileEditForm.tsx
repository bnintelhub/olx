import React, { useRef, useState, useEffect } from 'react';
import { Camera, Trash2, Upload, Loader2, Save } from 'lucide-react';
import { formatMediaUrl } from '@/lib/utils';

interface ProfileEditFormProps {
  name: string;
  setName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  businessName: string;
  setBusinessName: (v: string) => void;
  avatarUrl: string;
  isSaving: boolean;
  isUploadingAvatar: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  name,
  setName,
  bio,
  setBio,
  email,
  setEmail,
  businessName,
  setBusinessName,
  avatarUrl,
  isSaving,
  isUploadingAvatar,
  onFileSelect,
  onRemoveAvatar,
  onSubmit,
  onCancel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-[#E5EAED] p-6 shadow-2xs space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={onFileSelect}
      />

      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-base font-bold text-[#002f34]">Edit Profile Information</h2>
        <p className="text-xs text-gray-500 mt-0.5">Update your public identity and contact information</p>
      </div>

      {/* Avatar Changer Row */}
      <div className="p-4 bg-gray-50/70 rounded-lg border border-gray-100 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-18 h-18 rounded-xl bg-gray-200 border border-gray-300 overflow-hidden shrink-0 flex items-center justify-center">
          {isUploadingAvatar ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#002f34]" />
          ) : avatarUrl && !imgError ? (
            <img
              src={formatMediaUrl(avatarUrl)}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-xl font-bold text-gray-500">
              {(name.charAt(0) || 'U').toUpperCase()}
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#002f34] hover:bg-[#003f46] text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{avatarUrl ? 'Change photo' : 'Upload photo'}</span>
            </button>

            {avatarUrl && (
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={onRemoveAvatar}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500">Supports JPG, PNG, or WEBP up to 5MB.</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Full display name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34] text-sm text-gray-900 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Business or store name (optional)
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Prime Electronics, Rahul Motors"
            className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34] text-sm text-gray-900 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. rahul@example.com"
            className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34] text-sm text-gray-900 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            About the seller (description)
          </label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a brief introduction about your business, warranty, or items you frequently trade..."
            className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34] text-sm text-gray-900 transition resize-y"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 text-xs font-bold text-white bg-[#002f34] hover:bg-[#003f46] rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Saving...' : 'Save changes'}</span>
        </button>
      </div>
    </form>
  );
};
