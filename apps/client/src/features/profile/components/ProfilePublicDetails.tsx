import React from 'react';
import { User, Building2, Mail, Phone, FileText } from 'lucide-react';

interface ProfilePublicDetailsProps {
  name: string;
  businessName?: string;
  email?: string;
  phoneNumber?: string;
  bio?: string;
  onEditClick: () => void;
}

export const ProfilePublicDetails: React.FC<ProfilePublicDetailsProps> = ({
  name,
  businessName,
  email,
  phoneNumber,
  bio,
  onEditClick,
}) => {
  return (
    <div className="bg-white rounded-xl border border-[#E5EAED] p-6 shadow-2xs space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#002f34]">Public Seller Information</h2>
          <p className="text-xs text-gray-500 mt-0.5">Information visible to buyers on your listings</p>
        </div>
        <button
          type="button"
          onClick={onEditClick}
          className="text-xs font-semibold text-[#002f34] hover:underline cursor-pointer"
        >
          Edit details
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3.5 bg-gray-50/70 rounded-lg border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span>Full display name</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{name || 'Not provided'}</p>
        </div>

        <div className="p-3.5 bg-gray-50/70 rounded-lg border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            <span>Business or store name</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {businessName || 'Individual seller'}
          </p>
        </div>

        <div className="p-3.5 bg-gray-50/70 rounded-lg border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span>Registered email</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate" title={email}>
            {email || 'No email associated'}
          </p>
        </div>

        <div className="p-3.5 bg-gray-50/70 rounded-lg border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>Primary contact</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {phoneNumber || 'No phone attached'}
          </p>
        </div>
      </div>

      <div className="p-4 bg-gray-50/70 rounded-lg border border-gray-100 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span>About the seller</span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {bio || (
            <span className="text-gray-400 italic">
              No description added yet. Add a short bio describing your items, warranty, or dealership to build trust.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
