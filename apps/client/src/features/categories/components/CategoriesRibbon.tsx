import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { useCategoriesTreeQuery } from '../hook/useCategoriesQuery';

export const CategoriesRibbon: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentCategory = searchParams.get('category') || '';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: categories = [] } = useCategoriesTreeQuery();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleSelectCategory = (slug: string) => {
    setIsDropdownOpen(false);
    if (!slug) {
      navigate('/search');
    } else {
      navigate(`/search?category=${slug}`);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200/80 select-none text-xs relative">
      <div className="mx-auto flex max-w-[1500px] items-center px-4 sm:px-6 lg:px-8 py-2">
        {/* All Categories Dropdown Trigger */}
        <div className="relative shrink-0 pr-4 sm:pr-6 border-r border-slate-200" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 font-semibold text-slate-800 hover:text-[#002F34] transition-colors cursor-pointer"
          >
            <LayoutGrid size={13} className="text-slate-500" />
            <span>All categories</span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 text-slate-400 ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isDropdownOpen && (
            <>
              {/* Invisible backdrop */}
              <div
                className="fixed inset-0 z-50 bg-black/5"
                onClick={() => setIsDropdownOpen(false)}
              />

              {/* High z-index dropdown */}
              <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl z-[60] text-slate-800">
                <button
                  type="button"
                  onClick={() => handleSelectCategory('')}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-900 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
                    <span>All marketplace listings</span>
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">Browse all</span>
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
                  {categories.map((cat) => {
                    const subList = cat.subcategories || (cat as any).children || [];
                    const imgUrl =
                      cat.image?.thumbnailUrl ||
                      (cat.image?.variants as any)?.card ||
                      cat.image?.url ||
                      cat.image?.displayUrl ||
                      (cat.iconUrl && (cat.iconUrl.startsWith('http') || cat.iconUrl.startsWith('/')) ? cat.iconUrl : null);

                    return (
                      <button
                        key={cat.id || cat.slug}
                        type="button"
                        onClick={() => handleSelectCategory(cat.slug)}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-[#002f34] hover:bg-[#F5F7F8] hover:text-[#008581] rounded-xl transition flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-[#EBF1F3] border border-[#D8DFE2] overflow-hidden flex items-center justify-center shrink-0">
                            {imgUrl ? (
                              <img src={imgUrl} alt={cat.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-[#002f34] uppercase">
                                {cat.name.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <span className="truncate">{cat.name}</span>
                        </div>

                        {subList.length > 0 && (
                          <span className="text-[10px] font-semibold text-[#70808C] group-hover:text-[#008581] shrink-0 pl-2">
                            {subList.length} subs
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Horizontal Category Items (with horizontal scrolling) */}
        <div className="flex-1 flex items-center gap-6 sm:gap-7 px-4 sm:px-6 overflow-x-auto scrollbar-none flex-nowrap shrink-0">
          {categories.slice(0, 12).map((cat) => {
            const isActive = currentCategory === cat.slug;
            return (
              <button
                key={cat.id || cat.slug}
                type="button"
                onClick={() => handleSelectCategory(cat.slug)}
                className={`whitespace-nowrap transition-colors font-medium cursor-pointer py-0.5 ${
                  isActive
                    ? 'text-[#002f34] font-bold border-b-2 border-[#002f34]'
                    : 'text-gray-600 hover:text-[#002f34]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
