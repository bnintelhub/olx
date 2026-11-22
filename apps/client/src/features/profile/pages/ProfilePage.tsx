import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, User } from 'lucide-react';
import { TrustProfileCard } from '../components/TrustProfileCard';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>Home</span>
            <span>/</span>
            <span className="font-semibold text-slate-700">Seller Profile & Trust</span>
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
