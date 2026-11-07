import React, { useState } from 'react';
import {
  MapPin,
  Tag,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Send,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Category, LocationItem } from '@/types';
import { AttributeItem } from '@/features/ads/components/post-ad/PostAdDynamicFields';
import { SellImageItem } from './SellMediaStep';

interface SellPreviewStepProps {
  category: Category;
  title: string;
  description: string;
  price: number;
  isNegotiable: boolean;
  location: LocationItem | undefined;
  locality: string;
  categoryAttributes: AttributeItem[];
  attributeValues: Record<string, any>;
  images: SellImageItem[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  sellerName?: string;
}

export const SellPreviewStep: React.FC<SellPreviewStepProps> = ({
  category,
  title,
  description,
  price,
  isNegotiable,
  location,
  locality,
  categoryAttributes,
  attributeValues,
  images,
  onBack,
  onSubmit,
  isSubmitting,
  sellerName,
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Filter attributes that have values
  const filledAttributes = categoryAttributes.filter((attr) => {
    const val = attributeValues[attr.key];
    return val !== undefined && val !== null && val !== '' && val !== false;
  });

  const activePhoto = images[selectedPhotoIndex] || images.find((i) => i.isCover) || images[0];

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-teal-50/80 border border-teal-100 gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Listing Preview</span>
          </span>
          <h4 className="text-sm font-extrabold text-[#002f34] mt-0.5">
            Review your advertisement before publishing to the marketplace
          </h4>
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Step 4 of 4
        </div>
      </div>

      {/* Main Preview Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Photo Gallery Column (7 cols) */}
          <div className="md:col-span-7 p-4 sm:p-6 space-y-3 bg-gray-50/30">
            {/* Main Active Photo */}
            <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-black/5 border border-gray-200">
              {activePhoto ? (
                <img
                  src={activePhoto.previewUrl}
                  alt={title}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (activePhoto?.file && !target.dataset.fallback) {
                      target.dataset.fallback = 'true';
                      const reader = new FileReader();
                      reader.onload = () => { if (reader.result) target.src = reader.result as string; };
                      reader.readAsDataURL(activePhoto.file);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No image uploaded
                </div>
              )}
              {activePhoto?.isCover && (
                <span className="absolute top-3 left-3 bg-[#002f34] text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded shadow">
                  Cover Photo
                </span>
              )}
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                      selectedPhotoIndex === idx
                        ? 'border-teal-700 ring-2 ring-teal-700/20'
                        : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.previewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (img.file && !target.dataset.fallback) {
                          target.dataset.fallback = 'true';
                          const reader = new FileReader();
                          reader.onload = () => { if (reader.result) target.src = reader.result as string; };
                          reader.readAsDataURL(img.file);
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Column (5 cols) */}
          <div className="md:col-span-5 p-4 sm:p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Category & Verified Badge */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-100">
                  <Tag className="w-3 h-3 text-teal-700" />
                  <span>{category.name}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Ad</span>
                </span>
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg font-black text-[#002f34] leading-snug">
                {title || 'Untitled Classified Listing'}
              </h2>

              {/* Price & Negotiation */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#002f34]">
                  ₹ {price.toLocaleString('en-IN')}
                </span>
                {isNegotiable && (
                  <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded">
                    Negotiable
                  </span>
                )}
              </div>

              {/* Location Tag */}
              <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  Location: <strong>{locality ? `${locality}, ` : ''}{location?.name || 'India'}</strong>
                </span>
              </div>

              {/* Seller Information */}
              <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                <span>Seller: <strong>{sellerName || 'Classifieds Member'}</strong></span>
              </div>
            </div>

            {/* Moderation Pipeline Assurance */}
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>Automated Quality & Policy Check</span>
              </div>
              <p className="text-amber-800 text-[10px] leading-relaxed">
                Your listing will undergo automated risk scoring. Low-risk listings are approved immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Specifications & Description Section */}
        <div className="border-t border-gray-100 p-4 sm:p-6 space-y-6">
          {/* Specifications Table */}
          {filledAttributes.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Item Specifications
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {filledAttributes.map((attr) => {
                  const val = attributeValues[attr.key];
                  const displayVal =
                    typeof val === 'boolean'
                      ? 'Yes'
                      : Array.isArray(val)
                      ? val.join(', ')
                      : String(val);

                  return (
                    <div key={attr.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 space-y-0.5">
                      <div className="text-[10px] text-gray-400 font-medium truncate uppercase">
                        {attr.name}
                      </div>
                      <div className="text-xs font-bold text-gray-900 truncate">
                        {displayVal} {attr.unit || ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Seller Description
            </h4>
            <div className="text-xs text-gray-700 whitespace-pre-line bg-gray-50/60 p-4 rounded-xl border border-gray-100 leading-relaxed">
              {description}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="text-xs font-bold h-10 px-5 gap-1.5 cursor-pointer rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Edit Details</span>
        </Button>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-[#002f34] hover:bg-[#003d44] text-white text-xs font-extrabold h-10 px-8 gap-2 cursor-pointer rounded-xl shadow-md"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Publishing Listing...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Publish Listing Now</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

