import React from 'react';
import { Search, ChevronRight, ArrowLeft } from 'lucide-react';
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

function getCategoryImageUrl(cat: Category): string | null {
  return (
    cat.image?.thumbnailUrl ||
    (cat.image?.variants as any)?.card ||
    cat.image?.displayUrl ||
    cat.image?.url ||
    (cat.iconUrl &&
    (cat.iconUrl.startsWith('http://') ||
      cat.iconUrl.startsWith('https://') ||
      cat.iconUrl.startsWith('/'))
      ? cat.iconUrl
      : null) ||
    null
  );
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
  // Filter categories by search
  const filteredCategories = React.useMemo(() => {
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

  return (
    <div className="space-y-4">
      {/* Search Input */}
      {!selectedParentCategory && (
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={categorySearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search categories (e.g. Cars, Mobile Phones, Flats, Bikes)..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 bg-gray-50/50"
          />
        </div>
      )}

      {/* Subcategory View (When parent selected) */}
      {selectedParentCategory ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <button
              onClick={() => onSelectParentCategory(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Categories</span>
            </button>
            <span className="text-xs text-gray-500 font-medium">
              Category: <strong>{selectedParentCategory.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
            {(selectedParentCategory.subcategories || (selectedParentCategory as any).children || []).map(
              (sub: Category) => (
                <button
                  key={sub.id}
                  disabled={isLoadingAttributes}
                  onClick={() => onSelectLeafCategory(sub)}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-teal-700 hover:bg-teal-50/40 text-left transition cursor-pointer group"
                >
                  <span className="text-xs font-bold text-gray-800 group-hover:text-teal-900">
                    {sub.name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-700" />
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        /* Root Categories List */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filteredCategories.map((cat) => {
            const imgUrl = getCategoryImageUrl(cat);
            const subCount = (cat.subcategories || (cat as any).children || []).length;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (subCount > 0) {
                    onSelectParentCategory(cat);
                  } else {
                    onSelectLeafCategory(cat);
                  }
                }}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-teal-700 hover:bg-teal-50/30 text-left transition cursor-pointer group"
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {cat.name[0]}
                  </div>
                )}
                <div className="truncate flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 group-hover:text-teal-900 truncate">
                    {cat.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {subCount > 0 ? `${subCount} subcategories` : 'Select category'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-700 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

