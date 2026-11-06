import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car, Smartphone, Bike, Home, Tv, Armchair, ArrowRight, Layers } from 'lucide-react';
import { useCategoriesTreeQuery } from '../hook/useCategoriesQuery';

export const CategoryGrid: React.FC = () => {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategoriesTreeQuery();

  const getCategoryIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes('car') || s.includes('vehicle')) return <Car className="w-6 h-6 text-blue-600" />;
    if (s.includes('mobile') || s.includes('phone')) return <Smartphone className="w-6 h-6 text-indigo-600" />;
    if (s.includes('bike') || s.includes('cycle')) return <Bike className="w-6 h-6 text-teal-600" />;
    if (s.includes('propert') || s.includes('house')) return <Home className="w-6 h-6 text-amber-600" />;
    if (s.includes('electronic') || s.includes('appliance')) return <Tv className="w-6 h-6 text-sky-600" />;
    if (s.includes('furnitur')) return <Armchair className="w-6 h-6 text-rose-600" />;
    return <Layers className="w-6 h-6 text-emerald-600" />;
  };

  const displayCategories = categories.length > 0 ? categories.slice(0, 6) : [
    { id: 'cars', name: 'Cars', slug: 'cars', description: 'Used cars, new cars' },
    { id: 'mobiles', name: 'Mobiles', slug: 'mobiles', description: 'Phones & accessories' },
    { id: 'bikes', name: 'Bikes', slug: 'bikes', description: 'Motorcycles & scooters' },
    { id: 'properties', name: 'Properties', slug: 'properties', description: 'Flats, houses & plots' },
    { id: 'electronics', name: 'Electronics', slug: 'electronics', description: 'TVs, laptops & gadgets' },
    { id: 'furniture', name: 'Furniture', slug: 'furniture', description: 'Sofas, beds & decor' },
  ];

  return (
    <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-8 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#002f34]">
            Explore Categories
          </h2>
          <p className="text-xs text-gray-500">Popular marketplace categories to explore</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="inline-flex items-center gap-1 text-sm font-bold text-teal-800 hover:underline cursor-pointer"
        >
          <span>View all</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {displayCategories.map((cat) => (
          <motion.div
            key={cat.id || cat.slug}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={() => navigate(`/search?category=${cat.slug}`)}
            className="flex items-center gap-3.5 rounded-2xl bg-white p-3.5 border border-[#E5EAED] shadow-xs hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 group-hover:bg-teal-50 transition-colors">
              {getCategoryIcon(cat.slug)}
            </div>

            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-teal-900 truncate">
                {cat.name}
              </h3>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {cat.description || 'Explore listings'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

