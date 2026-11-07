import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import { useCategoriesTreeQuery } from '../hook/useCategoriesQuery';
import { Category } from '@/types';

// Curated high-resolution fallback photos for standard marketplace categories
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  cars: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80',
  properties: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80',
  mobiles: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
  bikes: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80',
  electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80',
  'commercial-vehicles': 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=400&q=80',
  furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80',
  books: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=400&q=80',
  pets: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80',
  services: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80',
  jobs: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=400&q=80',
};

// Resolves category image from database with fallback matching
const resolveCategoryImageUrl = (cat: Category): string => {
  const dbUrl = cat.image?.displayUrl || cat.image?.url || cat.image?.thumbnailUrl;
  if (dbUrl && (dbUrl.startsWith('http://') || dbUrl.startsWith('https://') || dbUrl.startsWith('/'))) {
    return dbUrl;
  }
  if (cat.iconUrl && (cat.iconUrl.startsWith('http://') || cat.iconUrl.startsWith('https://') || cat.iconUrl.startsWith('/'))) {
    return cat.iconUrl;
  }

  const slug = (cat.slug || '').toLowerCase();
  const name = (cat.name || '').toLowerCase();
  const combined = `${slug} ${name}`;

  if (combined.includes('car') || combined.includes('auto') || combined.includes('vehicle')) return CATEGORY_FALLBACK_IMAGES.cars;
  if (combined.includes('propert') || combined.includes('house') || combined.includes('flat')) return CATEGORY_FALLBACK_IMAGES.properties;
  if (combined.includes('mobil') || combined.includes('phone') || combined.includes('tablet')) return CATEGORY_FALLBACK_IMAGES.mobiles;
  if (combined.includes('bike') || combined.includes('motorcycle') || combined.includes('scooter')) return CATEGORY_FALLBACK_IMAGES.bikes;
  if (combined.includes('electronic') || combined.includes('appliance') || combined.includes('tv')) return CATEGORY_FALLBACK_IMAGES.electronics;
  if (combined.includes('truck') || combined.includes('commercial')) return CATEGORY_FALLBACK_IMAGES['commercial-vehicles'];
  if (combined.includes('furnitur') || combined.includes('decor') || combined.includes('sofa')) return CATEGORY_FALLBACK_IMAGES.furniture;
  if (combined.includes('fashion') || combined.includes('cloth') || combined.includes('wear')) return CATEGORY_FALLBACK_IMAGES.fashion;
  if (combined.includes('pet') || combined.includes('dog') || combined.includes('cat') || combined.includes('animal')) return CATEGORY_FALLBACK_IMAGES.pets;
  if (combined.includes('book') || combined.includes('sport') || combined.includes('hobbi')) return CATEGORY_FALLBACK_IMAGES.books;
  if (combined.includes('service')) return CATEGORY_FALLBACK_IMAGES.services;
  if (combined.includes('job')) return CATEGORY_FALLBACK_IMAGES.jobs;

  return 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80';
};

// Safe image component with error fallback
const CategoryCardImage: React.FC<{ cat: Category }> = ({ cat }) => {
  const [hasError, setHasError] = useState(false);
  const imageUrl = resolveCategoryImageUrl(cat);

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-800">
        <ImageIcon className="w-7 h-7 text-teal-700/60" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={cat.name}
      loading="lazy"
      onError={() => setHasError(true)}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
};

// Standard parent categories when database is empty or loading
const DEFAULT_PARENT_CATEGORIES: Category[] = [
  { id: 'cars', name: 'Cars', slug: 'cars', description: 'Used cars & vehicles' },
  { id: 'properties', name: 'Properties', slug: 'properties', description: 'Flats, houses & plots' },
  { id: 'mobiles', name: 'Mobiles', slug: 'mobiles', description: 'Phones & tablets' },
  { id: 'bikes', name: 'Bikes', slug: 'bikes', description: 'Motorcycles & scooters' },
  { id: 'electronics', name: 'Electronics', slug: 'electronics', description: 'TVs & appliances' },
  { id: 'commercial-vehicles', name: 'Commercial Vehicles', slug: 'commercial-vehicles', description: 'Trucks & vans' },
  { id: 'furniture', name: 'Furniture', slug: 'furniture', description: 'Sofas, beds & decor' },
  { id: 'fashion', name: 'Fashion', slug: 'fashion', description: 'Men, women & kids' },
  { id: 'books', name: 'Books, Sports & Hobbies', slug: 'books-sports-hobbies', description: 'Gym & hobbies' },
  { id: 'pets', name: 'Pets', slug: 'pets', description: 'Dogs, birds & cats' },
  { id: 'services', name: 'Services', slug: 'services', description: 'Repairs & drivers' },
  { id: 'jobs', name: 'Jobs', slug: 'jobs', description: 'Sales, IT & delivery' },
];

export const CategoryGrid: React.FC = () => {
  const navigate = useNavigate();
  const { data: rawCategories = [] } = useCategoriesTreeQuery();

  // Filter strictly top-level parent categories only (parentId must be null or undefined)
  const parentCategories = (Array.isArray(rawCategories) ? rawCategories : [])
    .filter((cat: Category) => !cat.parentId);

  const displayCategories = parentCategories.length > 0 ? parentCategories : DEFAULT_PARENT_CATEGORIES;

  return (
    <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-8 pb-4">
      <div className="flex items-center justify-between mb-5">
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

      {/* Grid showing only parent categories with photos instead of icons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {displayCategories.map((cat) => (
          <motion.div
            key={cat.id || cat.slug}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={() => navigate(`/search?category=${cat.slug}`)}
            className="flex flex-col items-center text-center rounded-2xl bg-white p-3.5 sm:p-4 border border-[#E5EAED] shadow-xs hover:shadow-md hover:border-[#002f34]/30 transition cursor-pointer group"
          >
            {/* Category Photo Container */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-2.5 shrink-0">
              <CategoryCardImage cat={cat} />
            </div>

            {/* Category Name & Info */}
            <div className="w-full">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#002f34] truncate">
                {cat.name}
              </h3>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {cat.adsCount ? `${cat.adsCount} ads` : cat.description || 'Explore listings'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
