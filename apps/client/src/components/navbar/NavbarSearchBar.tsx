import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';

export interface SuggestionItem {
  id: string;
  title: string;
  categorySubtitle?: string;
  categorySlug?: string;
  adId?: string;
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
    <div ref={containerRef} className="relative flex-1 max-w-2xl">
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
            title="Search OLX"
          >
            <Search size={18} />
          </button>
        </div>
      </form>

      {/* Live Suggestions Dropdown */}
      {isSuggestionsOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-[#E5EAED] bg-white shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase tracking-wider">
            <span>Suggestions</span>
            <span>{suggestions.length} results</span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSuggestion(item)}
                className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-teal-50/50 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Search size={14} className="text-gray-400 group-hover:text-teal-700 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs truncate">{highlightMatch(item.title, keyword)}</p>
                    {item.categorySubtitle && (
                      <p className="text-[10px] text-gray-400 truncate">{item.categorySubtitle}</p>
                    )}
                  </div>
                </div>
                <ChevronRight size={13} className="text-gray-300 group-hover:text-teal-700 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

