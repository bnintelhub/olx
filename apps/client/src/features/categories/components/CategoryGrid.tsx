import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { useCategoriesTreeQuery } from '../hook/useCategoriesQuery';
import { Category } from '@/types';

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
    category.image?.displayUrl ||
    category.image?.url ||
    category.image?.thumbnailUrl ||
    (category.iconUrl && (category.iconUrl.startsWith('http') || category.iconUrl.startsWith('/'))
      ? category.iconUrl
      : null)
  );
}

export const CategoryGrid: React.FC = () => {
  const navigate = useNavigate();
  const { data: rawCategories = [], isLoading } = useCategoriesTreeQuery();

  // Extract only real parent categories from database (where parentId is null or undefined)
  const parentCategories = useMemo(() => {
    if (!Array.isArray(rawCategories)) return [];
    return rawCategories.filter((cat: Category) => !cat.parentId && cat.isActive !== false);
  }, [rawCategories]);

  const handleCategoryClick = (cat: Category) => {
    navigate(`/search?category=${encodeURIComponent(cat.slug || cat.id)}`);
  };

  if (isLoading) {
    return (
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-10">
        <div className="h-6 bg-slate-200 rounded w-48 mb-6 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200/70 h-56 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (parentCategories.length === 0) {
    return null;
  }

  return (
    <section id="browse-categories-section" className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Browse by category
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-body">
            Explore active categories from the marketplace
          </p>
        </div>

        <button
          onClick={() => navigate('/search')}
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#002F34] hover:text-teal-700 transition-colors cursor-pointer py-1"
        >
          <span>All categories</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1 duration-200" />
        </button>
      </div>

      {/* Grid: 2nd image card structure displaying only parent categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
        {parentCategories.map((cat) => {
          const totalRealAds = calculateTotalAds(cat);
          const imgUrl = getServerImageUrl(cat);

          return (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className="group bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px]"
            >
              {/* Top Bar: Real server icon if present, else blank */}
              <div className="flex items-center justify-between min-h-[36px]">
                {cat.iconUrl && (cat.iconUrl.startsWith('http') || cat.iconUrl.startsWith('/')) ? (
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center p-1.5">
                    <img src={cat.iconUrl} alt="" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div />
                )}
              </div>

              {/* Middle: Real Category Image from Server (blank if none) */}
              <div className="my-3 aspect-[4/3] w-full flex items-center justify-center overflow-hidden rounded-2xl bg-slate-50/50">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={cat.name}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>

              {/* Bottom: Name, Real Ad Count & Chevron */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#002F34] truncate transition-colors font-heading leading-tight">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5 font-body">
                    {formatAdCount(totalRealAds)}
                  </p>
                </div>

                <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100 group-hover:translate-x-0.5 transition-all shrink-0">
                  <ChevronRight size={15} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
