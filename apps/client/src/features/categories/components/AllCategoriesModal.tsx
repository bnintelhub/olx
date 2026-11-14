import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, ChevronRight, Layers, ArrowRight } from 'lucide-react';
import { Category } from '@/types';

interface AllCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

function calculateTotalAds(category: Category): number {
  let count = category.adsCount ?? (category as any)._count?.ads ?? 0;
  const children = category.children || category.subcategories || [];
  if (Array.isArray(children)) {
    for (const child of children) {
      count += child.adsCount ?? (child as any)._count?.ads ?? 0;
    }
  }
  return count;
}

function formatAdCount(count: number): string {
  if (count <= 0) return '0 ads';
  if (count === 1) return '1 ad';
  return `${count} ads`;
}

function getServerImageUrl(category: Category): string | null {
  return (
    category.image?.url ||
    (category.iconUrl && (category.iconUrl.startsWith('http') || category.iconUrl.startsWith('/'))
      ? category.iconUrl
      : null)
  );
}

export const AllCategoriesModal: React.FC<AllCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSearchQuery('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter categories and subcategories by query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();

    return categories
      .map((cat) => {
        const matchesParent = cat.name.toLowerCase().includes(query);
        const subList = cat.subcategories || cat.children || [];
        const matchingSubs = subList.filter((sub) =>
          sub.name.toLowerCase().includes(query)
        );

        if (matchesParent) {
          return cat;
        }
        if (matchingSubs.length > 0) {
          return {
            ...cat,
            subcategories: matchingSubs,
            children: matchingSubs,
          };
        }
        return null;
      })
      .filter(Boolean) as Category[];
  }, [categories, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (cat: Category) => {
    onClose();
    navigate(`/search?category=${encodeURIComponent(cat.slug || cat.id)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#002F34] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                All Categories
              </h3>
              <p className="text-xs text-slate-500">
                Explore all {categories.length} categories and classified listings
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in all categories and subcategories..."
              className="w-full h-10 pl-10 pr-4 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#002F34] focus:bg-white transition"
              autoFocus
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No categories found matching "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCategories.map((cat) => {
                const imgUrl = getServerImageUrl(cat);
                const subList = cat.subcategories || cat.children || [];
                const totalAds = calculateTotalAds(cat);

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition bg-white flex flex-col justify-between"
                  >
                    {/* Parent Category Header */}
                    <div
                      onClick={() => handleSelect(cat)}
                      className="flex items-center justify-between gap-3 cursor-pointer group pb-2.5 border-b border-slate-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {imgUrl ? (
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 p-1 flex items-center justify-center shrink-0">
                            <img src={imgUrl} alt={cat.name} className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                            {cat.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#002F34] transition-colors truncate">
                            {cat.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatAdCount(totalAds)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
                    </div>

                    {/* Subcategories Chips */}
                    {subList.length > 0 && (
                      <div className="pt-2.5 flex flex-wrap gap-1.5">
                        {subList.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSelect(sub)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-200 rounded-lg border border-slate-200/70 transition cursor-pointer"
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Click any category to browse active listings
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/search');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#002F34] hover:underline cursor-pointer"
          >
            <span>View all in search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

