import React, { useState } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  Layers,
  MapPin,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Category, LocationItem } from '@/types';
import { ActiveFilterItem } from './SearchActiveBadges';
import { LocationPickerModal } from '@/features/locations/components/LocationPickerModal';

export interface CategoryAttributeItem {
  id: string;
  name: string;
  key: string;
  type: string;
  options?: string[];
  isRequired?: boolean;
  isFilterable?: boolean;
  unit?: string;
  displayOrder?: number;
}

interface SearchFilterSidebarProps {
  categories: Category[];
  selectedCategorySlug: string;
  activeCategory: Category | null;
  cities: LocationItem[];
  selectedCitySlug: string;
  minPrice: string;
  maxPrice: string;
  localMin: string;
  localMax: string;
  onLocalMinChange: (val: string) => void;
  onLocalMaxChange: (val: string) => void;
  onPriceSubmit: (e: React.FormEvent) => void;
  onApplyBudget: (min: string, max: string) => void;
  dynamicAttributes: CategoryAttributeItem[];
  isLoadingAttributes: boolean;
  selectedLocationId?: string;
  selectedLocationName?: string;
  activeFilters: ActiveFilterItem[];
  onUpdateParam: (key: string, val: string) => void;
  onClearAll: () => void;
  getParamValue: (key: string) => string;
}

export const SearchFilterSidebar: React.FC<SearchFilterSidebarProps> = ({
  categories,
  selectedCategorySlug,
  activeCategory,
  cities,
  selectedCitySlug,
  selectedLocationId,
  selectedLocationName,
  minPrice,
  maxPrice,
  localMin,
  localMax,
  onLocalMinChange,
  onLocalMaxChange,
  onPriceSubmit,
  onApplyBudget,
  dynamicAttributes,
  isLoadingAttributes,
  activeFilters,
  onUpdateParam,
  onClearAll,
  getParamValue,
}) => {
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const priceRanges = [
    { label: 'Under ₹5,000', min: '0', max: '5000' },
    { label: '₹5,000 - ₹20,000', min: '5000', max: '20000' },
    { label: '₹20,000 - ₹50,000', min: '20000', max: '50000' },
    { label: '₹50,000 - ₹1,00,000', min: '50000', max: '100000' },
    { label: 'Above ₹1,00,000', min: '100000', max: '' },
  ];

  const renderDynamicAttributeFilter = (attr: CategoryAttributeItem) => {
    const currentVal = getParamValue(attr.key);
    const options = attr.options || [];

    // 1. SELECT / MULTI_SELECT / DROPDOWN
    if (attr.type === 'SELECT' || attr.type === 'MULTI_SELECT') {
      return (
        <div key={attr.id} className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
            <span>{attr.name}</span>
            {attr.unit && <span className="text-gray-400 font-normal lowercase">({attr.unit})</span>}
          </label>
          <div className="relative">
            <select
              value={currentVal}
              onChange={(e) => onUpdateParam(attr.key, e.target.value)}
              className="w-full h-8 text-xs bg-white border border-gray-200 rounded-lg px-2.5 pr-8 appearance-none focus:outline-none focus:border-teal-700"
            >
              <option value="">All {attr.name}</option>
              {options.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      );
    }

    // 2. BOOLEAN
    if (attr.type === 'BOOLEAN') {
      return (
        <div key={attr.id} className="flex items-center justify-between py-1">
          <span className="text-xs text-gray-700 font-medium">{attr.name}</span>
          <button
            type="button"
            onClick={() => onUpdateParam(attr.key, currentVal === 'true' ? '' : 'true')}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
              currentVal === 'true' ? 'bg-[#002f34]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                currentVal === 'true' ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      );
    }

    // 3. DATE / YEAR Input
    if (attr.type === 'DATE') {
      const isYear = attr.key.includes('year') || attr.name.toLowerCase().includes('year');
      return (
        <div key={attr.id} className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
            <span>{attr.name}</span>
            <span className="text-gray-400 font-normal lowercase">{isYear ? '(Year)' : '(Date)'}</span>
          </label>
          <Input
            type={isYear ? 'number' : 'date'}
            placeholder={isYear ? 'e.g. 2022' : 'Select date'}
            min={isYear ? 1980 : undefined}
            max={isYear ? 2030 : undefined}
            value={currentVal}
            onChange={(e) => onUpdateParam(attr.key, e.target.value)}
            className="h-8 text-xs rounded-lg"
          />
        </div>
      );
    }

    // 4. NUMBER / RANGE Input
    if (attr.type === 'NUMBER') {
      return (
        <div key={attr.id} className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
            <span>{attr.name}</span>
            {attr.unit && <span className="text-gray-400 font-normal lowercase">({attr.unit})</span>}
          </label>
          <div className="relative">
            <Input
              type="number"
              placeholder={`Filter by ${attr.name}`}
              value={currentVal}
              onChange={(e) => onUpdateParam(attr.key, e.target.value)}
              className="h-8 text-xs rounded-lg pr-12"
            />
            {attr.unit && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase">
                {attr.unit}
              </span>
            )}
          </div>
        </div>
      );
    }

    // 5. Fallback Generic TEXT Input
    return (
      <div key={attr.id} className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
          {attr.name}
        </label>
        <Input
          type="text"
          placeholder={`Search ${attr.name}`}
          value={currentVal}
          onChange={(e) => onUpdateParam(attr.key, e.target.value)}
          className="h-8 text-xs rounded-lg"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2 font-bold text-sm text-[#002f34]">
          <SlidersHorizontal className="w-4 h-4 text-[#002f34]" />
          <span>Filters</span>
          {activeFilters.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 bg-teal-100 text-teal-800 font-bold">
              {activeFilters.length}
            </Badge>
          )}
        </div>
        {activeFilters.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-teal-800 hover:underline flex items-center gap-1 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* 1. Category Tree Navigation */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-500" />
          <span>Categories</span>
        </h4>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          <button
            onClick={() => onUpdateParam('category', '')}
            className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition font-medium flex items-center justify-between ${
              !selectedCategorySlug
                ? 'bg-teal-50 text-teal-900 font-bold border-l-4 border-teal-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>All Categories</span>
            {!selectedCategorySlug && <Check className="w-3.5 h-3.5 text-teal-700" />}
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategorySlug === cat.slug;
            return (
              <div key={cat.id} className="space-y-0.5">
                <button
                  onClick={() => onUpdateParam('category', cat.slug)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition font-medium flex items-center justify-between ${
                    isSelected
                      ? 'bg-teal-50 text-teal-900 font-bold border-l-4 border-teal-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-teal-700" />}
                </button>
                {/* Child subcategories if current category or its child is selected */}
                {(() => {
                  const children = cat.children || cat.subcategories || [];
                  const isChildSelected = children.some(
                    (c: any) => c.slug === selectedCategorySlug || c.id === selectedCategorySlug
                  );
                  const isExpanded = isSelected || isChildSelected;

                  if (!isExpanded || children.length === 0) return null;

                  return (
                    <div className="pl-4 space-y-0.5 border-l border-gray-100 ml-2">
                      {children.map((sub: any) => (
                        <button
                          key={sub.id}
                          onClick={() => onUpdateParam('category', sub.slug)}
                          className={`w-full text-left text-[11px] px-2 py-1 rounded transition flex items-center justify-between ${
                            selectedCategorySlug === sub.slug || selectedCategorySlug === sub.id
                              ? 'text-teal-900 font-bold bg-teal-50/70 border-l-2 border-teal-700'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <span>{sub.name}</span>
                          {(selectedCategorySlug === sub.slug || selectedCategorySlug === sub.id) && (
                            <Check className="w-3 h-3 text-teal-700" />
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Location / City Filter */}
      <div className="space-y-2.5 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
            <span>Location</span>
          </h4>
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
          >
            Locality Search
          </button>
        </div>
        <div className="relative">
          <select
            value={selectedLocationId ? '' : selectedCitySlug}
            onChange={(e) => {
              onUpdateParam('locationId', '');
              onUpdateParam('city', e.target.value);
            }}
            className="w-full text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-2 pr-8 appearance-none focus:outline-none focus:border-teal-700"
          >
            <option value="">{selectedLocationName ? `📍 ${selectedLocationName}` : 'All India'}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSelectLocation={(loc) => {
            if (loc.id) {
              onUpdateParam('locationId', loc.id);
              onUpdateParam('city', loc.slug);
            } else {
              onUpdateParam('locationId', '');
              onUpdateParam('city', '');
            }
          }}
          selectedLocationId={selectedLocationId}
          showAllOption={true}
        />
      </div>

      {/* 3. Price Filter */}
      <div className="space-y-2.5 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Budget</h4>
          {(minPrice || maxPrice) && (
            <button
              onClick={() => onApplyBudget('', '')}
              className="text-[11px] text-teal-800 hover:underline font-bold"
            >
              Reset
            </button>
          )}
        </div>

        <div className="space-y-1">
          {priceRanges.map((rng, i) => {
            const isSelected = minPrice === rng.min && (rng.max ? maxPrice === rng.max : !maxPrice);
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (isSelected) onApplyBudget('', '');
                  else onApplyBudget(rng.min, rng.max);
                }}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition font-medium flex items-center justify-between ${
                  isSelected
                    ? 'bg-teal-50 text-teal-900 font-bold border-l-4 border-teal-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{rng.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-teal-700" />}
              </button>
            );
          })}
        </div>

        {/* Custom Min / Max input */}
        <form onSubmit={onPriceSubmit} className="space-y-2 pt-2">
          <span className="text-[11px] text-gray-500 font-semibold block">Or custom price (₹):</span>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min ₹"
              value={localMin}
              onChange={(e) => onLocalMinChange(e.target.value)}
              className="h-8 text-xs rounded-lg"
            />
            <Input
              type="number"
              placeholder="Max ₹"
              value={localMax}
              onChange={(e) => onLocalMaxChange(e.target.value)}
              className="h-8 text-xs rounded-lg"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full text-xs font-bold h-8 rounded-lg hover:bg-teal-50 hover:text-teal-900"
          >
            Apply Price
          </Button>
        </form>
      </div>

      {/* 4. Dynamic Specification Filters */}
      {isLoadingAttributes ? (
        <div className="pt-3 border-t border-gray-100 text-center py-4 text-xs text-gray-400 animate-pulse">
          Loading specifications...
        </div>
      ) : dynamicAttributes.length > 0 ? (
        <div className="space-y-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#002f34]">
              {activeCategory?.name || 'Category'} Specifications
            </h4>
            <span className="text-[10px] text-gray-400 font-mono">
              {dynamicAttributes.length} fields
            </span>
          </div>

          {dynamicAttributes.map((attr) => renderDynamicAttributeFilter(attr))}
        </div>
      ) : null}
    </div>
  );
};
