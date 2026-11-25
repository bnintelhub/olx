import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          {/* Left: Home / Category breadcrumb */}
          <div
            className={`hidden sm:flex items-center gap-2 text-sm min-w-0 transition-opacity duration-300 ${
              isFocused ? 'opacity-70 max-w-[200px] md:max-w-xs' : 'opacity-100'
            }`}
          >
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

          {/* Right: Pill Search Bar with smooth animated expansion on click/focus */}
          <form
            onSubmit={onSearchSubmit}
            className="flex w-full sm:w-auto items-center justify-end gap-2 transition-all duration-300"
          >
            <div
              className={`relative flex-1 transition-all duration-300 ease-out ${
                isFocused
                  ? 'sm:w-[420px] md:w-[540px] lg:w-[680px]'
                  : 'sm:w-72 md:w-80 lg:w-96'
              }`}
            >
              <Search
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${
                  isFocused ? 'text-[#002f34]' : 'text-gray-400'
                }`}
              />
              <Input
                ref={inputRef}
                value={localQuery}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search products, cars, flats, mobiles..."
                className={`pl-9 pr-9 h-9 text-xs sm:text-sm rounded-full bg-white text-[#002f34] placeholder:text-gray-400 shadow-none transition-all duration-300 ${
                  isFocused
                    ? 'border-[#002f34] ring-2 ring-[#002f34]/15 shadow-sm'
                    : 'border-[#D8DFE2] hover:border-gray-400 focus-visible:ring-0 focus-visible:border-[#002f34]'
                }`}
              />
              {localQuery && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleClear();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#002f34] transition p-1 cursor-pointer rounded-full hover:bg-gray-100"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              className="h-9 px-3 sm:px-5 text-xs sm:text-sm font-bold rounded-full bg-[#002f34] hover:bg-[#003f46] text-white shrink-0 cursor-pointer shadow-none transition active:scale-95"
            >
              Search
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
