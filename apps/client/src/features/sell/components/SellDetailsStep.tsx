import React from 'react';
import { IndianRupee, MapPin, FileText, Tag, Check, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Category, LocationItem } from '@/types';
import {
  PostAdDynamicFields,
  AttributeItem,
} from '@/features/ads/components/post-ad/PostAdDynamicFields';

interface SellDetailsStepProps {
  category: Category;
  title: string;
  onTitleChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  price: string;
  onPriceChange: (val: string) => void;
  isNegotiable: boolean;
  onNegotiableChange: (val: boolean) => void;
  locations: LocationItem[];
  selectedLocationId: string;
  onLocationChange: (val: string) => void;
  locality: string;
  onLocalityChange: (val: string) => void;
  categoryAttributes: AttributeItem[];
  attributeValues: Record<string, any>;
  onAttributeChange: (key: string, val: any) => void;
  isLoadingAttributes: boolean;
}

function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return '';
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '');
    return `${cr} Crore`;
  }
  if (num >= 100000) {
    const lakh = (num / 100000).toFixed(2).replace(/\.00$/, '');
    return `${lakh} Lakh`;
  }
  if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${k} Thousand`;
  }
  return `${num}`;
}

export const SellDetailsStep: React.FC<SellDetailsStepProps> = ({
  category,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  price,
  onPriceChange,
  isNegotiable,
  onNegotiableChange,
  locations,
  selectedLocationId,
  onLocationChange,
  locality,
  onLocalityChange,
  categoryAttributes,
  attributeValues,
  onAttributeChange,
  isLoadingAttributes,
}) => {
  const numPrice = Number(price);
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  return (
    <div className="space-y-6">
      {/* Category Lineage Info */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-teal-50/70 border border-teal-100">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-teal-700" />
          <span className="text-xs text-gray-600 font-medium">Selected Category:</span>
          <span className="text-xs font-bold text-teal-900">{category.name}</span>
        </div>
      </div>

      {/* 1. Title */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-teal-700" />
            <span>Ad Title <span className="text-rose-500">*</span></span>
          </label>
          <span className={`text-[10px] font-mono ${title.length >= 10 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
            {title.length} / 150 chars {title.length < 10 && '(min 10)'}
          </span>
        </div>
        <Input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Brand New iPhone 15 128GB Blue / Maruti Suzuki Swift 2021 VXI"
          maxLength={150}
          className="text-xs rounded-xl h-10 border-gray-200 focus:border-teal-700"
        />
        <p className="text-[11px] text-gray-400">
          Mention key features (brand, model, age, condition) to attract genuine buyers.
        </p>
      </div>

      {/* 2. Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-800">
            Description <span className="text-rose-500">*</span>
          </label>
          <span className={`text-[10px] font-mono ${description.length >= 20 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
            {description.length} / 4000 chars {description.length < 20 && '(min 20)'}
          </span>
        </div>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe condition, specifications, warranty status, accessories included, and reason for selling..."
          className="w-full p-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 bg-white"
        />
      </div>

      {/* 3. Price */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-teal-700" />
            <span>Set a Price (₹) <span className="text-rose-500">*</span></span>
          </span>
          {numPrice > 0 && (
            <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>₹ {numPrice.toLocaleString('en-IN')} ({numberToIndianWords(numPrice)})</span>
            </span>
          )}
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₹</span>
          <Input
            type="number"
            min="1"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="e.g. 52000"
            className="pl-8 text-xs font-bold text-gray-800 rounded-xl h-10 border-gray-200 focus:border-teal-700"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={isNegotiable}
              onChange={(e) => onNegotiableChange(e.target.checked)}
              className="w-3.5 h-3.5 text-teal-700 rounded border-gray-300"
            />
            <span>Price is negotiable</span>
          </label>
        </div>
      </div>

      {/* 4. Location Section */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
            <MapPin className="w-4 h-4 text-teal-700" />
            <span>Confirm Your Location <span className="text-rose-500">*</span></span>
          </div>
          {selectedLocation && (
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              Location: {selectedLocation.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* City Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-600">City / State</label>
            <select
              value={selectedLocationId}
              onChange={(e) => onLocationChange(e.target.value)}
              className="w-full h-10 text-xs border border-gray-200 rounded-xl px-3 bg-white focus:outline-none focus:border-teal-700 font-medium"
            >
              <option value="">Select City</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Locality / Neighborhood */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-600">Neighborhood / Locality (Optional)</label>
            <Input
              type="text"
              value={locality}
              onChange={(e) => onLocalityChange(e.target.value)}
              placeholder="e.g. Boring Road, Kankarbagh, Indiranagar"
              className="text-xs rounded-xl h-10 border-gray-200 focus:border-teal-700"
            />
          </div>
        </div>
      </div>

      {/* 5. Dynamic Category Specifications */}
      <PostAdDynamicFields
        categoryAttributes={categoryAttributes}
        attributeValues={attributeValues}
        onAttributeChange={onAttributeChange}
        isLoading={isLoadingAttributes}
      />
    </div>
  );
};

