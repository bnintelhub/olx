import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, User } from 'lucide-react';
import { TrustProfileCard } from '../components/TrustProfileCard';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#002f34] hover:text-[#004f57] transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>Home</span>
            <span>/</span>
            <span className="font-medium text-gray-700">Seller Profile & Trust</span>
          </div>
        </div>

        {/* Profile Card */}
        <TrustProfileCard
          onOpenMyAds={() => navigate('/my-ads')}
          onOpenWishlist={() => navigate('/my-ads')}
        />
      </div>
    </div>
  );
};
