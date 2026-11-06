import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useCategoriesTreeQuery } from '../hook/useCategoriesQuery';

export const CategoriesRibbon: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentCategory = searchParams.get('category') || '';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: categories = [] } = useCategoriesTreeQuery();

  const handleSelectCategory = (slug: string) => {
    setIsDropdownOpen(false);
    if (!slug) {
      navigate('/search');
    } else {
      navigate(`/search?category=${slug}`);
    }
  };

  return (
    <div className="bg-white border-b border-[#E5EAED] relative z-30 select-none shadow-xs">
      <div className="mx-auto flex max-w-[1500px] items-center gap-6 px-4 sm:px-6 lg:px-8 py-2.5 overflow-x-auto scrollbar-none text-xs">
        {/* All Categories Dropdown Trigger */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#002f34] hover:text-teal-700 transition cursor-pointer"
          >
            <span>ALL CATEGORIES</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-[#E5EAED] bg-white p-3 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleSelectCategory('')}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-[#002f34] rounded-xl hover:bg-teal-50 transition flex items-center justify-between"
                >
                  <span>All Marketplace Listings</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </button>
                <div className="my-1.5 border-t border-gray-100" />
                <div className="max-h-80 overflow-y-auto space-y-0.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id || cat.slug}
                      type="button"
                      onClick={() => handleSelectCategory(cat.slug)}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-700 hover:text-[#002f34] hover:bg-gray-50 rounded-lg transition truncate"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Horizontal Category Items */}
        <div className="flex items-center gap-6 sm:gap-7 flex-nowrap shrink-0">
          {categories.slice(0, 10).map((cat) => {
            const isActive = currentCategory === cat.slug;
            return (
              <button
                key={cat.id || cat.slug}
                type="button"
                onClick={() => handleSelectCategory(cat.slug)}
                className={`whitespace-nowrap transition-colors font-medium cursor-pointer ${
                  isActive
                    ? 'text-[#002f34] font-bold border-b-2 border-[#002f34] pb-0.5'
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

