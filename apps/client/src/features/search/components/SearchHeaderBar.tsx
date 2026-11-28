import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';

interface SearchHeaderBarProps {
  activeCategoryName?: string;
  categoryParam?: string;
  queryParam?: string;
  localQuery: string;
  onQueryChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const SearchHeaderBar: React.FC<SearchHeaderBarProps> = ({
  activeCategoryName,
  categoryParam,
  queryParam,
  localQuery,
  onQueryChange,
  onSearchSubmit,
}) => {
  const navigate = useNavigate();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const categoryLabel = activeCategoryName
    ? `Category: ${activeCategoryName}`
    : categoryParam
    ? `Category: ${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)}`
    : queryParam
    ? `Search: "${queryParam}"`
    : 'All Categories';

  const handleClear = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="bg-white border-b border-[#E5EAED] sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Left: Home / Category breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-sm min-w-0 shrink-0 max-w-[260px] md:max-w-xs">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 font-bold text-[#002f34] hover:text-[#004f57] transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-[#002f34]" />
              <span>Home</span>
            </button>
            <span className="text-gray-300 font-normal select-none">/</span>
            <span className="text-[#002f34] font-medium truncate">{categoryLabel}</span>
          </div>

          {/* Right: Home-style Search Bar filling all remaining width */}
          <form onSubmit={onSearchSubmit} className="flex-1 min-w-0">
            <div
              className={`flex items-center rounded-lg border bg-white overflow-hidden transition-all ${
                isFocused
                  ? 'border-[#002f34] ring-2 ring-[#002f34]/15 shadow-sm'
                  : 'border-[#003F46] hover:border-[#002f34]'
              }`}
            >
              <div className="pl-3.5 pr-1 text-[#667784] shrink-0">
                <Search size={18} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={localQuery}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Find Cars, Mobile Phones, Flats, Jobs and more..."
                className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-[#102A33] placeholder:text-[#667784] focus:outline-none"
              />
              {localQuery && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleClear();
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition cursor-pointer mr-1 shrink-0"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="submit"
                className="flex items-center justify-center bg-[#002f34] hover:bg-[#00343A] px-5 py-2.5 text-white transition active:scale-95 cursor-pointer shrink-0"
                title="Search BLX Orbit"
              >
                <Search size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
