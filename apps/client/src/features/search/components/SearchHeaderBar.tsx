import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
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

  const categoryLabel = activeCategoryName
    ? `Category: ${activeCategoryName}`
    : categoryParam
    ? `Category: ${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)}`
    : queryParam
    ? `Search: "${queryParam}"`
    : 'All Categories';

  return (
    <div className="bg-white border-b border-[#E5EAED] sticky top-0 z-30 shadow-xs">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4 sm:gap-6">
          {/* Left: Home / Category breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0">
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

          {/* Right: Pill Search Bar matching OLX style */}
          <form onSubmit={onSearchSubmit} className="flex items-center gap-2 shrink-0">
            <div className="relative w-48 xs:w-60 sm:w-72 md:w-80 lg:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={localQuery}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search products, cars, flats, mobiles..."
                className="pl-9 pr-4 h-9 text-xs sm:text-sm rounded-full border-[#D8DFE2] bg-white focus-visible:border-[#002f34] focus-visible:ring-0 shadow-none text-[#002f34] placeholder:text-gray-400"
              />
            </div>
            <Button
              type="submit"
              className="h-9 px-5 text-xs sm:text-sm font-bold rounded-full bg-[#002f34] hover:bg-[#003f46] text-white shrink-0 cursor-pointer shadow-none transition"
            >
              Search
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
