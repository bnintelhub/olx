import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Eye, ShoppingBag, PlusCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SellSuccessStepProps {
  createdAd: any;
  onPostAnother: () => void;
}

export const SellSuccessStep: React.FC<SellSuccessStepProps> = ({
  createdAd,
  onPostAnother,
}) => {
  const navigate = useNavigate();
  const isPending = createdAd?.status === 'PENDING_REVIEW';

  return (
    <div className="py-12 px-4 max-w-xl mx-auto text-center space-y-6">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
        {isPending ? (
          <Clock className="w-8 h-8 text-amber-600" />
        ) : (
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        )}
      </div>

      {/* Headings */}
      <div className="space-y-2">
        <h3 className="text-xl font-black text-[#002f34]">
          {isPending
            ? 'Ad Submitted for Quality Review'
            : 'Congratulations! Your Ad is Live'}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
          {isPending
            ? 'Your classified ad has been submitted to our moderation queue. Our automated checks flag certain listings for review to protect our community. It will go live once verified.'
            : 'Your classified listing has passed automated verification and is now discoverable by thousands of interested buyers across India.'}
        </p>
      </div>

      {/* Ad Summary Card */}
      {createdAd && (
        <div className="p-4 rounded-2xl border border-gray-200 bg-white text-left shadow-2xs space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
            Listing Summary
          </div>
          <div className="text-sm font-extrabold text-gray-900 truncate">
            {createdAd.title}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
            <span>Price: <strong>₹ {Number(createdAd.price).toLocaleString('en-IN')}</strong></span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isPending ? 'Under Review' : 'Active'}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {createdAd?.id && !isPending && (
          <Button
            type="button"
            onClick={() => navigate(`/ad/${createdAd.id}`)}
            className="w-full sm:w-auto bg-[#002f34] hover:bg-[#003d44] text-white text-xs font-bold h-10 px-6 gap-2 rounded-xl cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Live Ad</span>
          </Button>
        )}

        <Button
          type="button"
          onClick={() => navigate('/my-ads')}
          className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold h-10 px-6 gap-2 rounded-xl cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>My Ads List</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onPostAnother}
          className="w-full sm:w-auto text-xs font-bold h-10 px-6 gap-2 rounded-xl cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Post Another Ad</span>
        </Button>
      </div>
    </div>
  );
};

