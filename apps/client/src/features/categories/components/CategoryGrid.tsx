import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Tag } from 'lucide-react';
import { useCategoriesTreeQuery } from '../hook/useCategoriesQuery';
import { Category } from '@/types';

// Safe image renderer using exclusively real uploaded media from database
const CategoryImage: React.FC<{ category: Category }> = ({ category }) => {
  const [hasError, setHasError] = useState(false);
  const imageUrl =
    category.image?.displayUrl ||
    category.image?.url ||
    category.image?.thumbnailUrl ||
    category.iconUrl;

  if (!imageUrl || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg">
        <Tag size={18} className="text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={category.name}
      loading="lazy"
      onError={() => setHasError(true)}
      className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
    />
  );
};

export const CategoryGrid: React.FC = () => {
  const navigate = useNavigate();
  const { data: rawCategories = [], isLoading } = useCategoriesTreeQuery();

  // Extract top-level categories and active subcategories directly from real backend tree
  const realCategories = React.useMemo(() => {
    if (!Array.isArray(rawCategories) || rawCategories.length === 0) return [];

    const parents = rawCategories.filter((cat: Category) => !cat.parentId && cat.isActive !== false);

    // If there are few parent categories, also include their direct active subcategories
    const list: Category[] = [];
    parents.forEach((parent) => {
      list.push(parent);
      const children = parent.children || parent.subcategories || [];
      if (Array.isArray(children)) {
        children.forEach((child) => {
          if (!list.some((item) => item.id === child.id)) {
            list.push(child);
          }
        });
      }
    });

    return list;
  }, [rawCategories]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-slate-200 rounded w-44 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-slate-200/80 animate-pulse h-24" />
          ))}
        </div>
      </section>
    );
  }

  // If database has no categories yet, do not render dummy data
  if (realCategories.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Browse by category
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Explore active categories from the marketplace</p>
        </div>

        <button
          onClick={() => navigate('/search')}
          className="group inline-flex items-center gap-1 text-xs font-semibold text-[#002F34] hover:text-teal-700 transition-colors cursor-pointer"
        >
          <span>All categories</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {realCategories.map((cat, index) => {
          const adsCount = cat.adsCount ?? 0;
          return (
            <motion.div
              key={cat.id || cat.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.02 }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              onClick={() => navigate(`/search?category=${cat.slug}`)}
              className="group bg-white rounded-xl p-3 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between h-24"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/60 shrink-0">
                  <CategoryImage category={cat} />
                </div>
                <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  {adsCount > 0 ? `${adsCount} ${adsCount === 1 ? 'ad' : 'ads'}` : 'Browse'}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-800 group-hover:text-[#002F34] line-clamp-1 transition-colors">
                  {cat.name}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
