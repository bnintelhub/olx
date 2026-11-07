import React, { useMemo } from 'react';
import { Search, ChevronRight, ArrowLeft, Layers, Check, X } from 'lucide-react';
import { Category } from '@/types';

interface PostAdCategoryStepProps {
  categoriesTree: Category[];
  categorySearch: string;
  onSearchChange: (val: string) => void;
  selectedParentCategory: Category | null;
  onSelectParentCategory: (cat: Category | null) => void;
  onSelectLeafCategory: (cat: Category) => void;
  isLoadingTaxonomy: boolean;
  isLoadingAttributes: boolean;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  mobiles: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
  vehicles: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
  properties: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
  electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80',
  furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80',
  commercial: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80',
  books: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
  pets: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=600&q=80',
  services: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
  jobs: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
};

function resolveCategoryPhoto(cat: Category, parent?: Category | null): string {
  const direct =
    cat.image?.thumbnailUrl ||
    (cat.image?.variants as any)?.card ||
    cat.image?.displayUrl ||
    cat.image?.url ||
    (cat.iconUrl && (cat.iconUrl.startsWith('http') || cat.iconUrl.startsWith('/')) ? cat.iconUrl : null);

  if (direct) return direct;

  if (parent) {
    const parentDirect =
      parent.image?.thumbnailUrl ||
      (parent.image?.variants as any)?.card ||
      parent.image?.displayUrl ||
      parent.image?.url ||
      (parent.iconUrl && (parent.iconUrl.startsWith('http') || parent.iconUrl.startsWith('/')) ? parent.iconUrl : null);
    if (parentDirect) return parentDirect;
  }

  const key = `${cat.slug || ''} ${cat.name || ''} ${parent?.slug || ''} ${parent?.name || ''}`.toLowerCase();
  for (const [k, url] of Object.entries(CATEGORY_FALLBACK_IMAGES)) {
    if (key.includes(k)) return url;
  }

  return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80';
}

export const PostAdCategoryStep: React.FC<PostAdCategoryStepProps> = ({
  categoriesTree,
  categorySearch,
  onSearchChange,
  selectedParentCategory,
  onSelectParentCategory,
  onSelectLeafCategory,
  isLoadingTaxonomy,
  isLoadingAttributes,
}) => {
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoriesTree;
    const q = categorySearch.toLowerCase().trim();
    return categoriesTree.filter((cat) => {
      const matchParent = cat.name.toLowerCase().includes(q);
      const matchChild = (cat.subcategories || (cat as any).children || []).some(
        (sub: any) => sub.name.toLowerCase().includes(q)
      );
      return matchParent || matchChild;
    });
  }, [categoriesTree, categorySearch]);

  if (isLoadingTaxonomy) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-teal-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-medium">Loading categories...</p>
      </div>
    );
  }

  const subcategories: Category[] = selectedParentCategory
    ? selectedParentCategory.subcategories || (selectedParentCategory as any).children || []
    : [];

  return (
    <div className="space-y-5">
      {/* Search Input */}
      {!selectedParentCategory && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={categorySearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search categories (e.g. Cars, Mobile Phones, Flats, Bikes)..."
            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#002f34]/20 focus:border-[#002f34] bg-white shadow-2xs placeholder:text-slate-400"
          />
          {categorySearch && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Breadcrumb Navigation when Parent is Selected */}
      {selectedParentCategory && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100/80">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectParentCategory(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-100 text-teal-900 text-xs font-bold border border-teal-200 shadow-2xs transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Categories</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-extrabold text-[#002f34]">{selectedParentCategory.name}</span>
          </div>
          <span className="text-xs text-teal-800 font-medium">
            {subcategories.length} {subcategories.length === 1 ? 'subcategory' : 'subcategories'}
          </span>
        </div>
      )}

      {/* Categories Grid (Full Bleed Image, Dark Blur Bottom Overlay, No Border) */}
      {!selectedParentCategory ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
          {filteredCategories.map((cat) => {
            const imgUrl = resolveCategoryPhoto(cat);
            const subCount = (cat.subcategories || (cat as any).children || []).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (subCount > 0) {
                    onSelectParentCategory(cat);
                  } else {
                    onSelectLeafCategory(cat);
                  }
                }}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] w-full text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl focus:outline-none cursor-pointer bg-slate-900"
              >
                <img
                  src={imgUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                  loading="lazy"
                />

                <div className="absolute inset-x-0 bottom-0 pt-8 pb-3 px-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-md flex flex-col justify-end text-left transition-all">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-white font-bold text-xs sm:text-sm leading-snug tracking-tight drop-shadow-sm line-clamp-1">
                      {cat.name}
                    </span>
                    {subCount > 0 && (
                      <ChevronRight className="w-3 h-3 text-white/70 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                  <span className="text-white/75 text-[10px] font-medium mt-0.5">
                    {subCount > 0 ? `${subCount} options` : 'Select category'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Subcategories Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
          {subcategories.map((sub: Category) => {
            const subImgUrl = resolveCategoryPhoto(sub, selectedParentCategory);

            return (
              <button
                key={sub.id}
                type="button"
                disabled={isLoadingAttributes}
                onClick={() => onSelectLeafCategory(sub)}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] w-full text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl focus:outline-none cursor-pointer bg-slate-900"
              >
                <img
                  src={subImgUrl}
                  alt={sub.name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                  loading="lazy"
                />

                <div className="absolute inset-x-0 bottom-0 pt-8 pb-3 px-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-md flex flex-col justify-end text-left transition-all">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-white font-bold text-xs sm:text-sm leading-snug tracking-tight drop-shadow-sm line-clamp-1">
                      {sub.name}
                    </span>
                    <ChevronRight className="w-3 h-3 text-white/70 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-white/75 text-[10px] font-medium mt-0.5">
                    Select subcategory
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
