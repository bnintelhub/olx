import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdsQuery } from '@/features/ads/hook/useAdsQuery';
import { AdCard } from '@/features/ads/components/AdCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { categoriesService } from '@/features/categories/service/categories.service';
import { Category, LocationItem } from '@/types';
import { SearchHeaderBar } from '../components/SearchHeaderBar';
import { SearchActiveBadges, ActiveFilterItem } from '../components/SearchActiveBadges';
import { SearchFilterSidebar, CategoryAttributeItem } from '../components/SearchFilterSidebar';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary URL Query Params
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page = Number(searchParams.get('page') || '1');

  // Local Form Buffers
  const [localQ, setLocalQ] = useState(q);
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Metadata State
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<LocationItem[]>([]);
  const [dynamicAttributes, setDynamicAttributes] = useState<CategoryAttributeItem[]>([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);

  // Sync inputs with URL params
  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
  }, [minPrice, maxPrice]);

  // Load Categories & Cities taxonomy metadata
  useEffect(() => {
    categoriesService
      .getCategoriesTree()
      .then((tree: any) => {
        if (Array.isArray(tree) && tree.length > 0) setCategories(tree);
        else categoriesService.getCategories().then((flat: any) => setCategories(flat));
      })
      .catch(() => {
        categoriesService.getCategories().then((flat: any) => setCategories(flat)).catch(() => {});
      });

    fetch('/api/v1/locations/cities')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.data)) setCities(d.data);
      })
      .catch(() => {});
  }, []);

  // Resolve currently active category
  const activeCategory = useMemo(() => {
    if (!category || !categories.length) return null;
    const target = category.toLowerCase().trim();

    const findInTree = (nodes: Category[]): Category | null => {
      for (const node of nodes) {
        const s = (node.slug || '').toLowerCase();
        const id = (node.id || '').toLowerCase();
        const name = (node.name || '').toLowerCase();

        // Exact match by slug, id, or name
        if (s === target || id === target || name === target) return node;
        // Singular / plural flexibility (e.g. "cars" matches "car", "vehicles" matches "vehicle")
        if (target.endsWith('s') && s === target.slice(0, -1)) return node;
        if (!target.endsWith('s') && s === `${target}s`) return node;

        const sub = (node as any).children || node.subcategories;
        if (sub?.length) {
          const match = findInTree(sub);
          if (match) return match;
        }
      }
      return null;
    };
    return findInTree(categories);
  }, [category, categories]);

  // Load dynamic attributes when active category changes
  useEffect(() => {
    if (!activeCategory?.id) {
      setDynamicAttributes([]);
      return;
    }

    let isCurrent = true;
    setIsLoadingAttributes(true);

    // Immediate fallback from embedded tree attributes if present
    const directAttrs = activeCategory.attributes || [];
    const childAttrs: any[] = [];
    const children = (activeCategory as any).children || activeCategory.subcategories || [];
    for (const ch of children) {
      if (Array.isArray(ch.attributes)) childAttrs.push(...ch.attributes);
    }
    const initialAttrs = [...directAttrs, ...childAttrs].filter((a) => a && a.isFilterable !== false);
    if (initialAttrs.length > 0) {
      setDynamicAttributes(initialAttrs);
    }

    categoriesService
      .getCategoryAttributes(activeCategory.id)
      .then((attrs: any) => {
        if (!isCurrent) return;
        if (Array.isArray(attrs) && attrs.length > 0) {
          const filterable = attrs
            .filter((a: any) => a.isFilterable !== false)
            .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
          setDynamicAttributes(filterable);
        } else if (initialAttrs.length === 0) {
          setDynamicAttributes([]);
        }
      })
      .catch(() => {
        if (isCurrent && initialAttrs.length === 0) setDynamicAttributes([]);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingAttributes(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeCategory]);

  // Construct query parameters payload dynamically from searchParams
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      q: q || undefined,
      category: category || undefined,
      city: city || undefined,
      sort: sort || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      limit: 24,
    };

    searchParams.forEach((val, key) => {
      if (
        !['q', 'category', 'city', 'sort', 'minPrice', 'maxPrice', 'limit', 'page'].includes(key) &&
        val
      ) {
        params[key] = val;
      }
    });

    return params;
  }, [q, category, city, sort, minPrice, maxPrice, searchParams]);

  const { data: adsResult, isLoading, isFetching } = useAdsQuery(queryParams);

  const ads = useMemo(() => {
    if (!adsResult) return [];
    if (Array.isArray(adsResult)) return adsResult;
    return adsResult.ads || (adsResult as any).data || [];
  }, [adsResult]);

  const total = useMemo(() => {
    if (!adsResult) return 0;
    if (Array.isArray(adsResult)) return adsResult.length;
    return adsResult.total ?? (adsResult as any).meta?.total ?? ads.length;
  }, [adsResult, ads.length]);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleApplyBudget = (min: string, max: string) => {
    const next = new URLSearchParams(searchParams);
    if (min) next.set('minPrice', min);
    else next.delete('minPrice');
    if (max) next.set('maxPrice', max);
    else next.delete('maxPrice');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', localQ.trim());
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleApplyBudget(localMin, localMax);
  };

  const handleClearAll = () => {
    setLocalQ('');
    setLocalMin('');
    setLocalMax('');
    setSearchParams(new URLSearchParams());
  };

  const activeFilters = useMemo(() => {
    const list: ActiveFilterItem[] = [];
    if (q) list.push({ key: 'q', label: 'Keyword', value: `"${q}"` });
    if (category) {
      list.push({ key: 'category', label: 'Category', value: activeCategory?.name || category });
    }
    if (city) {
      const c = cities.find((ci) => ci.slug === city);
      list.push({ key: 'city', label: 'Location', value: c?.name || city });
    }
    if (minPrice || maxPrice) {
      const minText = minPrice ? `₹${Number(minPrice).toLocaleString('en-IN')}` : '₹0';
      const maxText = maxPrice ? `₹${Number(maxPrice).toLocaleString('en-IN')}` : 'Any';
      list.push({ key: 'price', label: 'Price', value: `${minText} - ${maxText}` });
    }

    searchParams.forEach((val, k) => {
      if (
        !['q', 'category', 'city', 'sort', 'minPrice', 'maxPrice', 'limit', 'page'].includes(k) &&
        val
      ) {
        const attrDef = dynamicAttributes.find((a) => a.key === k);
        const label = attrDef?.name || k.replace(/_/g, ' ').toUpperCase();
        list.push({ key: k, label, value: val });
      }
    });

    return list;
  }, [q, category, activeCategory, city, minPrice, maxPrice, searchParams, cities, dynamicAttributes]);

  const removeFilter = (key: string) => {
    if (key === 'price') {
      const next = new URLSearchParams(searchParams);
      next.delete('minPrice');
      next.delete('maxPrice');
      setLocalMin('');
      setLocalMax('');
      setSearchParams(next);
    } else {
      updateParam(key, '');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F8] pb-16">
      {/* Top Search Header Bar (Matches screenshot: Home / Category: <Name> on left, Capsule Search on right) */}
      <SearchHeaderBar
        activeCategoryName={activeCategory?.name}
        categoryParam={category}
        queryParam={q}
        localQuery={localQ}
        onQueryChange={setLocalQ}
        onSearchSubmit={handleSearchSubmit}
      />

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Desktop Filter Sidebar (3 cols) */}
          <div className="hidden lg:block lg:col-span-3">
            <Card className="rounded-2xl border-[#E5EAED] shadow-sm sticky top-16">
              <CardContent className="p-5 max-h-[calc(100vh-5rem)] overflow-y-auto">
                <SearchFilterSidebar
                  categories={categories}
                  selectedCategorySlug={category}
                  activeCategory={activeCategory}
                  cities={cities}
                  selectedCitySlug={city}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  localMin={localMin}
                  localMax={localMax}
                  onLocalMinChange={setLocalMin}
                  onLocalMaxChange={setLocalMax}
                  onPriceSubmit={handlePriceSubmit}
                  onApplyBudget={handleApplyBudget}
                  dynamicAttributes={dynamicAttributes}
                  isLoadingAttributes={isLoadingAttributes}
                  activeFilters={activeFilters}
                  onUpdateParam={updateParam}
                  onClearAll={handleClearAll}
                  getParamValue={(k) => searchParams.get(k) || ''}
                />
              </CardContent>
            </Card>
          </div>

          {/* Results Column (9 cols) */}
          <div className="lg:col-span-9 space-y-4">
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E5EAED] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-[#002f34]">
                  {activeCategory
                    ? `Listings in ${activeCategory.name}`
                    : q
                    ? `Results for "${q}"`
                    : 'All Classified Ads'}
                  {city && <span className="text-gray-500 font-normal"> in {city.toUpperCase()}</span>}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Showing {total} {total === 1 ? 'listing' : 'listings'}
                  {isFetching && !isLoading && ' (updating...)'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile Filter Button */}
                <Button
                  onClick={() => setShowMobileFilter(true)}
                  variant="outline"
                  size="sm"
                  className="lg:hidden text-xs gap-1.5 border-teal-700 text-teal-800 font-bold"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters ({activeFilters.length})</span>
                </Button>

                {/* Sort selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 hidden sm:inline font-medium">Sort by:</span>
                  <select
                    value={sort}
                    onChange={(e) => updateParam('sort', e.target.value)}
                    className="h-9 text-xs bg-white border border-[#D8DFE2] rounded-xl px-3 font-semibold text-[#002f34] focus:outline-none focus:border-teal-700 cursor-pointer shadow-xs"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active Filters Pill Bar */}
            <SearchActiveBadges
              activeFilters={activeFilters}
              onRemoveFilter={removeFilter}
              onClearAll={handleClearAll}
            />

            {/* Listings Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-[#E5EAED] overflow-hidden animate-pulse flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-gray-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-6 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : ads.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E5EAED] p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto text-2xl font-bold">
                  🔍
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#002f34]">No matching listings found</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                    Try adjusting your filters, searching for broader terms, or exploring other categories.
                  </p>
                </div>
                <Button onClick={handleClearAll} variant="default" size="sm" className="font-bold">
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {ads.map((item: any) => (
                  <AdCard key={item.id} ad={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Slide-over / Modal */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowMobileFilter(false)}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-sm text-[#002f34]">Filter Classifieds</span>
              <button
                onClick={() => setShowMobileFilter(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <SearchFilterSidebar
                categories={categories}
                selectedCategorySlug={category}
                activeCategory={activeCategory}
                cities={cities}
                selectedCitySlug={city}
                minPrice={minPrice}
                maxPrice={maxPrice}
                localMin={localMin}
                localMax={localMax}
                onLocalMinChange={setLocalMin}
                onLocalMaxChange={setLocalMax}
                onPriceSubmit={(e) => {
                  handlePriceSubmit(e);
                  setShowMobileFilter(false);
                }}
                onApplyBudget={(min, max) => {
                  handleApplyBudget(min, max);
                  setShowMobileFilter(false);
                }}
                dynamicAttributes={dynamicAttributes}
                isLoadingAttributes={isLoadingAttributes}
                activeFilters={activeFilters}
                onUpdateParam={(k, v) => {
                  updateParam(k, v);
                  setShowMobileFilter(false);
                }}
                onClearAll={() => {
                  handleClearAll();
                  setShowMobileFilter(false);
                }}
                getParamValue={(k) => searchParams.get(k) || ''}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
