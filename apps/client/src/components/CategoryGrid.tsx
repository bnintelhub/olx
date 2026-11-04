import React from 'react';
import { Car, Smartphone, Bike, Home, Tv, Armchair, ArrowRight } from 'lucide-react';

interface CategoryGridProps {
  onSelectCategory?: (slug: string) => void;
}

interface CategoryCardItem {
  name: string;
  slug: string;
  description: string;
  icon: React.ReactNode;
  bgClass: string;
  iconColor: string;
}

const FEATURED_CATEGORIES: CategoryCardItem[] = [
  {
    name: 'Cars',
    slug: 'cars',
    description: 'Used cars, new cars and more',
    icon: <Car size={26} strokeWidth={2} />,
    bgClass: 'bg-[#EBF3FE]',
    iconColor: 'text-[#1D63ED]',
  },
  {
    name: 'Mobiles',
    slug: 'mobiles',
    description: 'Smartphones, accessories and more',
    icon: <Smartphone size={26} strokeWidth={2} />,
    bgClass: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]',
  },
  {
    name: 'Bikes',
    slug: 'bikes',
    description: 'Two-wheelers, spares and more',
    icon: <Bike size={26} strokeWidth={2} />,
    bgClass: 'bg-[#E6F8F5]',
    iconColor: 'text-[#0D9488]',
  },
  {
    name: 'Properties',
    slug: 'properties',
    description: 'Flats, houses, plots and more',
    icon: <Home size={26} strokeWidth={2} />,
    bgClass: 'bg-[#FEF7E6]',
    iconColor: 'text-[#D97706]',
  },
  {
    name: 'Electronics & Appliances',
    slug: 'electronics',
    description: 'TVs, laptops, home appliances and more',
    icon: <Tv size={26} strokeWidth={2} />,
    bgClass: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0284C7]',
  },
  {
    name: 'Furniture',
    slug: 'furniture',
    description: 'Sofas, beds, home decor and more',
    icon: <Armchair size={26} strokeWidth={2} />,
    bgClass: 'bg-[#FEEFEF]',
    iconColor: 'text-[#DC2626]',
  },
];

export const CategoryGrid: React.FC<CategoryGridProps> = ({ onSelectCategory }) => {
  return (
    <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 pt-8 pb-3">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#102A33]">
          Explore Categories
        </h2>
        <button
          type="button"
          onClick={() => onSelectCategory && onSelectCategory('')}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#003F46] hover:underline"
        >
          <span>View all</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* 6 Category Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {FEATURED_CATEGORIES.map((item) => (
          <div
            key={item.slug}
            onClick={() => onSelectCategory && onSelectCategory(item.slug)}
            className="flex items-center gap-3.5 rounded-2xl bg-white p-3.5 border border-[#E5EAED] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
          >
            {/* Soft colored circle icon container */}
            <div
              className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl ${item.bgClass} ${item.iconColor} transition-transform group-hover:scale-105`}
            >
              {item.icon}
            </div>

            {/* Title & Description */}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-[#102A33] group-hover:text-[#003F46] transition-colors truncate">
                {item.name}
              </span>
              <span className="text-[11px] text-[#667784] line-clamp-2 leading-snug">
                {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
