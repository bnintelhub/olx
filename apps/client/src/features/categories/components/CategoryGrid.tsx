import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCategoriesTreeQuery } from '../hook/useCategoriesQuery';
import { Category } from '@/types';
import { AllCategoriesModal } from './AllCategoriesModal';

// Compute real total ads count from parent and its subcategories
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

// Format real ad count
function formatAdCount(count: number): string {
  if (count <= 0) return '0 ads';
  if (count === 1) return '1 ad';
  return `${count} ads`;
}

// Resolve real image URL directly from server response (strictly no external or dummy fallback)
function getServerImageUrl(category: Category): string | null {
  return (
    category.image?.url ||
    (category.iconUrl && (category.iconUrl.startsWith('http') || category.iconUrl.startsWith('/'))
      ? category.iconUrl
      : null)
  );
}

export const CategoryGrid: React.FC = () => {
  const navigate = useNavigate();
  const [isAllCategoriesModalOpen, setIsAllCategoriesModalOpen] = useState(false);
  const { data: rawCategories = [], isLoading } = useCategoriesTreeQuery();

  // Extract only real parent categories from database (where parentId is null or undefined)
  const parentCategories = useMemo(() => {
    if (!Array.isArray(rawCategories)) return [];
    return rawCategories.filter((cat: Category) => !cat.parentId && cat.isActive !== false);
  }, [rawCategories]);

  // Keep category grid to max 2 rows (6 columns on lg screen = max 12 items)
  const visibleCategories = useMemo(() => {
    return parentCategories.slice(0, 12);
  }, [parentCategories]);

  const handleCategoryClick = (cat: Category) => {
    navigate(`/search?category=${encodeURIComponent(cat.slug || cat.id)}`);
  };

  if (isLoading) {
    return (
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-8">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 border border-slate-200/70 h-28 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (parentCategories.length === 0) {
    return null;
  }

  return (
    <section id="browse-categories-section" className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-8 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-heading">
            Browse by category
          </h2>
          <p className="text-xs text-slate-500 font-body">
            Explore active categories from the marketplace
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAllCategoriesModalOpen(true)}
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#002F34] hover:text-teal-700 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-slate-100/70"
        >
          <span>All categories</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1 duration-200" />
        </button>
      </div>

      {/* Grid: max 2 rows, compact cards with small images */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {visibleCategories.map((cat) => {
          const totalRealAds = calculateTotalAds(cat);
          const imgUrl = getServerImageUrl(cat);

          return (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className="group bg-white rounded-2xl p-3 border border-slate-200/80 hover:border-teal-600/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col items-center justify-between text-center min-h-[120px]"
            >
              {/* Category Image - Compact to fit screen without scrolling */}
              <div className="w-full h-16 sm:h-20 flex items-center justify-center p-1.5 rounded-xl bg-slate-50/70 group-hover:bg-slate-100/60 transition-colors overflow-hidden">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={cat.name}
                    loading="lazy"
                    className="max-h-12 sm:max-h-16 max-w-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300 drop-shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-200/60 flex items-center justify-center text-slate-400 text-xs font-bold">
                    {cat.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Category Name & Ad Count */}
              <div className="w-full mt-2">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#002F34] truncate transition-colors font-heading leading-tight">
                  {cat.name}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate mt-0.5 font-body">
                  {formatAdCount(totalRealAds)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* All Categories Modal */}
      <AllCategoriesModal
        isOpen={isAllCategoriesModalOpen}
        onClose={() => setIsAllCategoriesModalOpen(false)}
        categories={parentCategories}
      />
    </section>
  );
};
