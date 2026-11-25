import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';
import { formatMediaUrl } from '@/lib/utils';

export interface SuggestionItem {
  id: string;
  title: string;
  categorySubtitle?: string;
  categorySlug?: string;
  adId?: string;
  imageUrl?: string | null;
  price?: number;
  type: 'CATEGORY' | 'PRODUCT';
}

interface NavbarSearchBarProps {
  keyword: string;
  onKeywordChange: (val: string) => void;
  onSubmit: (keyword: string) => void;
  onSelectSuggestion: (item: SuggestionItem) => void;
  suggestions: SuggestionItem[];
  isSuggestionsOpen: boolean;
  setIsSuggestionsOpen: (open: boolean) => void;
}

export const NavbarSearchBar: React.FC<NavbarSearchBarProps> = ({
  keyword,
  onKeywordChange,
  onSubmit,
  onSelectSuggestion,
  suggestions,
  isSuggestionsOpen,
  setIsSuggestionsOpen,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsSuggestionsOpen]);

  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.trim()})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase().trim() ? (
            <span key={i} className="font-bold text-[#002f34]">
              {part}
            </span>
          ) : (
            <span key={i} className="font-normal text-[#102A33]">
              {part}
            </span>
          )
        )}
      </span>
    );
  };

  return (
    <>
      {/* Background Dim & Blur Overlay when suggestions dropdown is active */}
      {isSuggestionsOpen && suggestions.length > 0 && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200"
          onClick={() => setIsSuggestionsOpen(false)}
        />
      )}

      <div
        ref={containerRef}
        className={`relative flex-1 max-w-2xl ${
          isSuggestionsOpen && suggestions.length > 0 ? 'z-50' : 'z-20'
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(keyword);
          }}
          className="relative"
        >
          <div
            className={`flex items-center rounded-lg border bg-white overflow-hidden transition-all ${
              isSearchFocused
                ? 'border-[#002f34] ring-2 ring-[#002f34]/15 shadow-sm'
                : 'border-[#003F46] hover:border-[#002f34]'
            }`}
          >
            <div className="pl-3.5 pr-1 text-[#667784]">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              onFocus={() => {
                setIsSearchFocused(true);
                if (suggestions.length > 0) setIsSuggestionsOpen(true);
              }}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Find Cars, Mobile Phones, Flats, Jobs and more..."
              className="w-full bg-transparent px-3 py-2 text-sm text-[#102A33] placeholder:text-[#667784] focus:outline-none"
            />

            {keyword && (
              <button
                type="button"
                onClick={() => onKeywordChange('')}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition cursor-pointer mr-1"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="submit"
              className="flex items-center justify-center bg-[#002f34] hover:bg-[#00343A] px-5 py-2.5 text-white transition active:scale-95 cursor-pointer"
              title="Search BLX Orbit"
            >
              <Search size={18} />
            </button>
          </div>
        </form>

        {/* Live Suggestions Dropdown */}
        {isSuggestionsOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 min-w-[280px] sm:min-w-[360px] mt-2 rounded-xl border border-gray-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 text-[11px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50/80 whitespace-nowrap">
              <span className="flex items-center gap-1.5">
                <Search size={12} className="text-[#002f34] shrink-0" />
                <span>Matching Suggestions</span>
              </span>
              <span className="shrink-0">{suggestions.length} results</span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {suggestions.map((item) => {
                const imgUrl = item.imageUrl ? formatMediaUrl(item.imageUrl) : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSuggestion(item)}
                    className="w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Fixed thumbnail: image for products, search icon for categories */}
                      {item.type === 'PRODUCT' && imgUrl ? (
                        <div className="w-12 h-12 min-w-[48px] max-w-[48px] h-[48px] max-h-[48px] rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-100 flex items-center justify-center shadow-xs">
                          <img
                            src={imgUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : item.type === 'CATEGORY' ? (
                        <div className="w-9 h-9 min-w-[36px] rounded-lg border border-teal-100 bg-teal-50 shrink-0 flex items-center justify-center text-[#002f34]">
                          <Search size={15} />
                        </div>
                      ) : null}

                      <div className="truncate flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-[#002f34] group-hover:text-teal-700 truncate">
                          {highlightMatch(item.title, keyword)}
                        </p>
                        {item.categorySubtitle && (
                          <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase tracking-wide truncate mt-0.5">
                            in {item.categorySubtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {item.price !== undefined && item.price > 0 && (
                        <span className="text-xs sm:text-sm font-bold text-[#002f34] bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-md whitespace-nowrap">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                      )}
                      <ChevronRight size={15} className="text-gray-300 group-hover:text-[#002f34] shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

