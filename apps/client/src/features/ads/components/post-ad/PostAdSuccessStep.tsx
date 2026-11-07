import React from 'react';
import { CheckCircle2, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostAdSuccessStepProps {
  createdAd: any;
  onViewAd: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export const PostAdSuccessStep: React.FC<PostAdSuccessStepProps> = ({
  createdAd,
  onViewAd,
  onReset,
  onClose,
}) => {
  return (
    <div className="py-12 px-6 text-center space-y-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-black text-[#002f34]">
          Congratulations! Your Ad is Live
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
          Your classified listing has been posted successfully and is now discoverable by thousands of verified buyers across India.
        </p>
      </div>

      {createdAd && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 max-w-sm mx-auto text-left flex items-center gap-3">
          {createdAd.images?.[0]?.displayUrl && (
            <img
              src={createdAd.images[0].displayUrl}
              alt=""
              className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-gray-900 truncate">{createdAd.title}</h4>
            <p className="text-sm font-black text-teal-800 mt-0.5">
              ₹{Number(createdAd.price || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {createdAd?.id && (
          <Button
            onClick={() => {
              onClose();
              onViewAd(createdAd.id);
            }}
            variant="default"
            className="w-full sm:w-auto gap-2 text-xs font-bold"
          >
            <span>View Published Ad</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          onClick={onReset}
          variant="outline"
          className="w-full sm:w-auto text-xs font-bold gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Post Another Ad</span>
        </Button>
      </div>
    </div>
  );
};

