import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { LocationItem } from '@/types';

interface NavbarCityDropdownProps {
  cities: LocationItem[];
  selectedCity: string;
  onSelectCity: (name: string, slug: string) => void;
}

export const NavbarCityDropdown: React.FC<NavbarCityDropdownProps> = ({
  cities,
  selectedCity,
  onSelectCity,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative hidden md:block w-56 lg:w-64">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-[#003F46] bg-white px-3 py-2 text-sm font-semibold text-[#102A33] hover:border-[#00343A] transition focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <MapPin size={17} className="text-[#102A33] flex-shrink-0" />
          <span className="truncate">{selectedCity}</span>
        </div>
        <ChevronDown
          size={17}
          className={`text-[#102A33] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-full rounded-xl border border-[#E5EAED] bg-white p-2 shadow-xl z-50 animate-fade-in">
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onSelectCity('All India', '');
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[#F5F7F8] cursor-pointer ${
                selectedCity === 'All India' ? 'bg-[#e6f7f6] text-[#008581] font-bold' : 'text-[#102A33]'
              }`}
            >
              <span>All India</span>
            </button>
            {cities.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => {
                  onSelectCity(city.name, city.slug);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[#F5F7F8] cursor-pointer ${
                  selectedCity === city.name ? 'bg-[#e6f7f6] text-[#008581] font-bold' : 'text-[#102A33]'
                }`}
              >
                <span>{city.name}</span>
                <MapPin size={14} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

