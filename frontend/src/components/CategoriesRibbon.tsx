import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Category } from '../types';

interface CategoriesRibbonProps {
  onSelectCategory?: (slug: string) => void;
  categories?: Category[];
}

const DEFAULT_RIBBON_ITEMS = [
  { name: 'Cars', slug: 'cars' },
  { name: 'Mobiles', slug: 'mobiles' },
  { name: 'Bikes', slug: 'bikes' },
  { name: 'Properties', slug: 'properties' },
  { name: 'Electronics & Appliances', slug: 'electronics' },
  { name: 'Furniture', slug: 'furniture' },
  { name: 'Commercial Vehicles & Spares', slug: 'commercial-vehicles' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Books, Sports & Hobbies', slug: 'books-sports-hobbies' },
  { name: 'Pets', slug: 'pets' },
  { name: 'Services', slug: 'services' },
  { name: 'Jobs', slug: 'jobs' },
];

export const CategoriesRibbon: React.FC<CategoriesRibbonProps> = ({ onSelectCategory, categories: propCategories }) => {
  const [internalCategories, setInternalCategories] = useState<Category[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!propCategories || propCategories.length === 0) {
      fetch('/api/v1/categories')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data && data.data.length > 0) {
            setInternalCategories(data.data);
          }
        })
        .catch(() => {});
    }
  }, [propCategories]);

  // Use dynamic categories or fallback to standard categories
  const sourceList = propCategories && propCategories.length > 0 ? propCategories : internalCategories;
  const displayItems = sourceList.length > 0
    ? [...sourceList]
        .filter((c) => !c.parentId && c.isActive !== false)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    : DEFAULT_RIBBON_ITEMS;

  return (
    <div className="bg-white border-b border-[#E5EAED] relative z-30">
      <div className="mx-auto flex max-w-[1500px] items-center gap-6 px-4 sm:px-6 lg:px-8 py-2.5 overflow-x-auto no-scrollbar text-xs">
        {/* All Categories Dropdown Trigger */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#102A33] hover:text-[#003F46] transition focus:outline-none"
          >
            <span>ALL CATEGORIES</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-[#E5EAED] bg-white p-3 shadow-xl z-50">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  if (onSelectCategory) onSelectCategory('');
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-[#003F46] rounded-lg hover:bg-[#F5F7F8] transition"
              >
                All Listings (Browse Everything)
              </button>
              <div className="my-1 border-t border-gray-100" />
              <div className="max-h-72 overflow-y-auto">
                {displayItems.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      if (onSelectCategory) onSelectCategory(cat.slug);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-medium text-[#102A33] hover:text-[#003F46] hover:bg-[#F5F7F8] rounded-md transition"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Category Items */}
        <div className="flex items-center gap-6 sm:gap-7 flex-nowrap">
          {displayItems.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onSelectCategory && onSelectCategory(cat.slug)}
              className="flex-shrink-0 text-[#102A33] hover:text-[#003F46] transition font-medium text-xs whitespace-nowrap"
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
