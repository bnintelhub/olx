import React, { useState, useEffect } from 'react';
import {
  Filter,
  X,
  ChevronDown,
  RotateCcw,
  Search,
  MapPin,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { AdItem, Category, LocationItem } from '../types';
import { AdCard } from './AdCard';

interface SearchPageProps {
  initialQuery?: string;
  initialCategorySlug?: string;
  initialCitySlug?: string;
  categories: Category[];
  cities: LocationItem[];
  onSelectAd: (ad: AdItem) => void;
  onBackToHome: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  initialQuery = '',
  initialCategorySlug = '',
  initialCitySlug = '',
  categories,
  cities,
  onSelectAd,
  onBackToHome,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategorySlug);
  const [selectedCity, setSelectedCity] = useState(initialCitySlug);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');

  const [ads, setAds] = useState<AdItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Sync props changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedCategory(initialCategorySlug);
  }, [initialCategorySlug]);

  useEffect(() => {
    setSelectedCity(initialCitySlug);
  }, [initialCitySlug]);

  // Execute search API call
  const fetchAds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append('q', query.trim());
      if (selectedCategory) params.append('categorySlug', selectedCategory);
      if (selectedCity) params.append('citySlug', selectedCity);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (sort) params.append('sort', sort);

      const res = await fetch(`/api/v1/ads?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAds(data.data.ads || []);
        setTotal(data.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching search results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [selectedCategory, selectedCity, sort]);

  const handleApplyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAds();
  };

  const handleClearFilters = () => {
    setQuery('');
    setSelectedCategory('');
    setSelectedCity('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  };

  const hasActiveFilters = Boolean(
    query || selectedCategory || selectedCity || minPrice || maxPrice || sort !== 'newest'
  );

  return (
    <div className="min-h-screen bg-[#f2f4f5] pb-16">
      {/* Search Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search inputs */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-grow max-w-3xl">
              <div className="relative flex-grow">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAds()}
                  placeholder="Find Cars, Mobile Phones, Bikes and more..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34]"
                />
              </div>

              {/* City dropdown */}
              <div className="relative w-40 sm:w-48 flex-shrink-0">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#002f34] truncate appearance-none"
                >
                  <option value="">All India</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={fetchAds}
                className="bg-[#002f34] hover:bg-[#003d44] text-white px-5 py-2 rounded-md font-bold text-sm transition shadow-sm"
              >
                Search
              </button>
            </div>

            {/* Mobile Filter & Sort Bar */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={() => setShowMobileFilter(!showMobileFilter)}
                className="sm:hidden flex items-center gap-1.5 text-xs font-bold text-[#002f34] bg-gray-100 px-3 py-2 rounded-md"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium hidden md:inline">
                  Sort by:
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="text-xs font-bold text-[#002f34] bg-transparent border border-gray-300 rounded-md py-1.5 px-2.5 focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newly Listed</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-400 font-medium">Active filters:</span>
              {query && (
                <span className="bg-gray-100 text-[#002f34] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                  "{query}"
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => {
                      setQuery('');
                      setTimeout(fetchAds, 50);
                    }}
                  />
                </span>
              )}
              {selectedCategory && (
                <span className="bg-gray-100 text-[#002f34] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                  Category:{' '}
                  {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => setSelectedCategory('')}
                  />
                </span>
              )}
              {selectedCity && (
                <span className="bg-gray-100 text-[#002f34] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                  City: {cities.find((c) => c.slug === selectedCity)?.name || selectedCity}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => setSelectedCity('')}
                  />
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="bg-gray-100 text-[#002f34] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                  Price: ₹{minPrice || '0'} - ₹{maxPrice || 'Any'}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => {
                      setMinPrice('');
                      setMaxPrice('');
                      setTimeout(fetchAds, 50);
                    }}
                  />
                </span>
              )}
              <button
                onClick={handleClearFilters}
                className="text-red-600 hover:underline font-semibold ml-auto flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumb back to Home */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <button
            onClick={onBackToHome}
            className="hover:text-[#002f34] hover:underline flex items-center gap-1 font-medium"
          >
            Home
          </button>
          <span>&gt;</span>
          <span className="text-[#002f34] font-semibold">
            {selectedCategory
              ? categories.find((c) => c.slug === selectedCategory)?.name || 'Search Results'
              : 'All Categories'}
          </span>
          <span className="text-gray-400">({total} ads found)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left Filter Sidebar */}
          <div
            className={`md:block ${
              showMobileFilter
                ? 'fixed inset-0 z-40 bg-white p-6 overflow-y-auto'
                : 'hidden'
            } md:static md:bg-transparent md:p-0 space-y-6`}
          >
            {showMobileFilter && (
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 md:hidden">
                <h3 className="font-bold text-lg text-[#002f34]">Filter Ads</h3>
                <button
                  onClick={() => setShowMobileFilter(false)}
                  className="p-1 text-gray-500 hover:text-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Category Filter Widget */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Categories</span>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="text-[11px] text-[#00a49f] hover:underline lowercase font-normal"
                  >
                    view all
                  </button>
                )}
              </h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition flex items-center justify-between ${
                    !selectedCategory
                      ? 'bg-[#002f34] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>All Categories</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition flex items-center justify-between ${
                      selectedCategory === cat.slug
                        ? 'bg-[#002f34] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter Widget */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Price Range (₹)
              </h4>
              <form onSubmit={handleApplyPrice} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Min (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-[#002f34]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Max (₹)</label>
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-[#002f34]"
                    />
                  </div>
                </div>

                {/* Quick Price Range Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: '< ₹10k', min: '', max: '10000' },
                    { label: '₹10k - 50k', min: '10000', max: '50000' },
                    { label: '₹50k - 2L', min: '50000', max: '200000' },
                    { label: '> ₹2L', min: '200000', max: '' },
                  ].map((chip) => (
                    <button
                      type="button"
                      key={chip.label}
                      onClick={() => {
                        setMinPrice(chip.min);
                        setMaxPrice(chip.max);
                        setTimeout(fetchAds, 50);
                      }}
                      className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium transition"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#002f34] text-white py-1.5 rounded text-xs font-bold hover:bg-[#003d44] transition mt-2"
                >
                  Apply Price
                </button>
              </form>
            </div>

            {/* Quick Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All Filters
              </button>
            )}
          </div>

          {/* Right Results Grid */}
          <div className="md:col-span-3">
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-[#002f34] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 font-medium text-sm">Searching listings...</p>
              </div>
            ) : ads.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200 shadow-xs">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#002f34] mb-1">
                  No listings found
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                  We couldn't find any ads matching your search and filter criteria. Try broadening your search or resetting filters.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="bg-[#002f34] hover:bg-[#003d44] text-white px-6 py-2.5 rounded-md text-sm font-bold transition"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} onClick={onSelectAd} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
