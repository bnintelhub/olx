import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Filter,
  X,
  ChevronDown,
  RotateCcw,
  Search,
  MapPin,
  SlidersHorizontal,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAdsQuery } from '@/features/ads/hook/useAdsQuery';
import { useCategoriesTreeQuery } from '@/features/categories/hook/useCategoriesQuery';
import { AdCard } from '@/features/ads/components/AdCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const [localQ, setLocalQ] = useState(q);
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const { data: categories = [] } = useCategoriesTreeQuery();

  const queryParams = useMemo(
    () => ({
      q: q || undefined,
      category: category || undefined,
      city: city || undefined,
      sort: sort || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      limit: 24,
    }),
    [q, category, city, sort, minPrice, maxPrice]
  );

  const { data, isLoading, isFetching } = useAdsQuery(queryParams);
  const ads = data?.ads || [];
  const total = data?.total || ads.length;

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', localQ.trim());
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (localMin) next.set('minPrice', localMin);
    else next.delete('minPrice');
    if (localMax) next.set('maxPrice', localMax);
    else next.delete('maxPrice');
    setSearchParams(next);
  };

  const handleClearAll = () => {
    setLocalQ('');
    setLocalMin('');
    setLocalMax('');
    setSearchParams(new URLSearchParams());
  };

  const activeFiltersCount = [q, category, city, minPrice, maxPrice].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F5F7F8] pb-16">
      {/* Top Search Bar & Breadcrumbs */}
      <div className="bg-white border-b border-[#E5EAED] sticky top-0 z-20 shadow-xs">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-gray-500 w-full sm:w-auto">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1 font-bold text-[#002f34] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <span className="text-gray-300">/</span>
              <span className="text-gray-800 font-semibold truncate">
                {category ? `Category: ${category}` : q ? `Search: "${q}"` : 'Marketplace Listings'}
              </span>
            </div>

            {/* In-page search bar */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-96">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={localQ}
                  onChange={(e) => setLocalQ(e.target.value)}
                  placeholder="Search products, brands, cars..."
                  className="pl-9 h-10 text-xs rounded-xl"
                />
              </div>
              <Button type="submit" size="sm" className="h-10 px-4 text-xs font-bold rounded-xl">
                Search
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Desktop Filter Sidebar (3 cols) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <Card className="rounded-2xl border-[#E5EAED] shadow-sm">
              <CardContent className="p-5 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#002f34]">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-teal-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                {/* Categories Accordion */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Categories</span>
                  </h4>
                  <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    <button
                      onClick={() => updateParam('category', '')}
                      className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition font-medium ${
                        !category ? 'bg-teal-50 text-teal-900 font-bold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id || cat.slug}
                        onClick={() => updateParam('category', cat.slug)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition flex items-center justify-between ${
                          category === cat.slug
                            ? 'bg-teal-50 text-teal-900 font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        {cat.subcategories && cat.subcategories.length > 0 && (
                          <span className="text-[10px] text-gray-400">
                            {cat.subcategories.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Price Range (₹)
                  </h4>
                  <form onSubmit={handlePriceSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={localMin}
                        onChange={(e) => setLocalMin(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={localMax}
                        onChange={(e) => setLocalMax(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <Button type="submit" variant="outline" size="sm" className="w-full text-xs font-semibold">
                      Apply Price
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Column (9 cols) */}
          <div className="lg:col-span-9 space-y-5">
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E5EAED] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-[#002f34]">
                  {category ? `Listings in ${category}` : q ? `Results for "${q}"` : 'All Marketplace Listings'}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Showing {total} {total === 1 ? 'listing' : 'listings'}
                  {isFetching && !isLoading && ' (updating...)'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile Filter Trigger */}
                <Button
                  onClick={() => setShowMobileFilter(true)}
                  variant="outline"
                  size="sm"
                  className="lg:hidden text-xs gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters ({activeFiltersCount})</span>
                </Button>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 hidden sm:inline">Sort by:</span>
                  <select
                    value={sort}
                    onChange={(e) => updateParam('sort', e.target.value)}
                    className="bg-gray-50 border border-[#E5EAED] rounded-xl px-3 py-1.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-700 cursor-pointer"
                  >
                    <option value="newest">Newly Listed</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-[#E5EAED] overflow-hidden animate-pulse flex flex-col"
                  >
                    <div className="aspect-[16/10] bg-gray-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : ads.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5EAED] p-12 text-center max-w-md mx-auto my-8">
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800 text-base">No matching listings found</h3>
                <p className="text-xs text-gray-500 mt-1 mb-6">
                  Try adjusting your search keywords, clearing filters, or browsing other categories.
                </p>
                <Button onClick={handleClearAll} variant="outline" size="sm">
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

