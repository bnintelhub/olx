import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Shield,
  Loader2,
} from 'lucide-react';

interface ProfileSecurityCardProps {
  isPhoneVerified: boolean;
  phoneNumber?: string;
  isEmailVerified: boolean;
  email?: string;
  isIdentityVerified: boolean;
  completionPercent: number;
  canUnlockVerifiedTag: boolean;
  isVerifying: boolean;
  criteria: Array<{ label: string; met: boolean }>;
  onApplyVerifiedBadge: () => void;
  onEditEmail?: () => void;
}

export const ProfileSecurityCard: React.FC<ProfileSecurityCardProps> = ({
  isPhoneVerified,
  phoneNumber,
  isEmailVerified,
  email,
  isIdentityVerified,
  completionPercent,
  canUnlockVerifiedTag,
  isVerifying,
  criteria,
  onApplyVerifiedBadge,
  onEditEmail,
}) => {
  return (
    <div className="bg-white rounded-xl border border-[#E5EAED] p-6 shadow-2xs space-y-5">
      <div>
        <h2 className="text-base font-bold text-[#002f34]">Verification & Trust</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Verified details build buyer confidence and grant priority listing badges
        </p>
      </div>

      {/* Verification Rows */}
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {/* Phone row */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 bg-white hover:bg-gray-50/50 transition">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 shrink-0">
              <Phone className="w-4 h-4 text-[#002f34]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">Phone number</p>
              <p className="text-sm font-semibold text-gray-800 truncate">
                {phoneNumber || 'No phone linked'}
              </p>
            </div>
          </div>

          <div>
            {isPhoneVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Unverified</span>
              </span>
            )}
          </div>
        </div>

        {/* Email row */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 bg-white hover:bg-gray-50/50 transition">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 shrink-0">
              <Mail className="w-4 h-4 text-[#002f34]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">Email address</p>
              <p className="text-sm font-semibold text-gray-800 truncate" title={email}>
                {email || 'No email associated'}
              </p>
            </div>
          </div>

          <div>
            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            ) : email ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                Linked
              </span>
            ) : (
              <button
                type="button"
                onClick={onEditEmail}
                className="text-xs font-semibold text-[#002f34] hover:underline cursor-pointer"
              >
                + Add email
              </button>
            )}
          </div>
        </div>

        {/* Seller Trust Shield row */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4 bg-white hover:bg-gray-50/50 transition">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 shrink-0">
              <Shield className="w-4 h-4 text-[#002f34]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">Trust status</p>
              <p className="text-sm font-semibold text-gray-800">
                {isIdentityVerified ? 'Verified Trust Shield Active' : 'Standard Verification'}
              </p>
            </div>
          </div>

          <div>
            {isIdentityVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Shield Active</span>
              </span>
            ) : (
              <span className="text-xs text-gray-400 font-medium">Requirements pending</span>
            )}
          </div>
        </div>
      </div>

      {/* Profile Completion Checklist (Only shown when not yet verified) */}
      {!isIdentityVerified && (
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-gray-900">
                Complete profile requirements to earn Verified Seller badge
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Upload a photo, verify contact information, and provide a short bio.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-[#002f34] tabular-nums">
                {completionPercent}% completed
              </span>
              {canUnlockVerifiedTag && (
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={onApplyVerifiedBadge}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#002f34] hover:bg-[#003f46] rounded-md transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{isVerifying ? 'Activating...' : 'Activate Badge'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Calm progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#002f34] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>

          {/* Checklist chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
            {criteria.map((c, i) => (
              <div
                key={i}
                className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 ${
                  c.met
                    ? 'bg-white border-gray-200 text-gray-800'
                    : 'bg-white/50 border-gray-200 text-gray-400'
                }`}
              >
                {c.met ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                )}
                <span className="truncate font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
