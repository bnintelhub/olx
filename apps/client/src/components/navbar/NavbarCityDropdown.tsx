import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Crosshair, Search, Loader2 } from 'lucide-react';
import { LocationItem } from '@/types';
import { locationsService } from '@/features/locations/service/locations.service';
import { LocationPickerModal } from '@/features/locations/components/LocationPickerModal';
import { toast } from 'sonner';

interface NavbarCityDropdownProps {
  cities: LocationItem[];
  selectedCity: string;
  onSelectCity: (name: string, slug: string, locationId?: string) => void;
}

export const NavbarCityDropdown: React.FC<NavbarCityDropdownProps> = ({
  cities,
  selectedCity,
  onSelectCity,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<LocationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

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

  // Debounced search when typing inside dropdown
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await locationsService.search(searchTerm, 8);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // GPS auto-detection from navbar
  const handleDetectGps = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await locationsService.nearby(pos.coords.latitude, pos.coords.longitude, 25);
          if (results.length > 0) {
            const nearest = results[0];
            onSelectCity(nearest.name, nearest.slug, nearest.id);
            setIsOpen(false);
            toast.success(`Location set to ${nearest.name}`);
          } else {
            toast.error('No service location found near your current position.');
          }
        } catch {
          toast.error('Could not detect location.');
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission was denied.');
        } else {
          toast.error('Unable to retrieve location.');
        }
      },
      { timeout: 8000 }
    );
  };

  const handleSelect = (loc: LocationItem) => {
    onSelectCity(loc.name, loc.slug, loc.id);
    setIsOpen(false);
  };

  return (
    <>
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
          <div className="absolute left-0 mt-1.5 w-80 rounded-xl border border-[#E5EAED] bg-white p-2 shadow-2xl z-50 animate-fade-in divide-y divide-gray-100">
            {/* Quick GPS button */}
            <div className="pb-2">
              <button
                type="button"
                onClick={handleDetectGps}
                disabled={isDetectingGps}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-teal-50/70 hover:bg-teal-100/70 text-xs font-bold text-teal-900 transition cursor-pointer"
              >
                {isDetectingGps ? (
                  <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                ) : (
                  <Crosshair className="w-4 h-4 text-teal-700" />
                )}
                <span>{isDetectingGps ? 'Detecting your GPS...' : 'Use Current Location'}</span>
              </button>
            </div>

            {/* Inline Search input */}
            <div className="py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search city or locality..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-700 focus:bg-white transition"
                  autoFocus
                />
              </div>
            </div>

            {/* List options */}
            <div className="pt-2 max-h-56 overflow-y-auto space-y-0.5">
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCity('All India', '', '');
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition hover:bg-[#F5F7F8] cursor-pointer ${
                    selectedCity === 'All India' ? 'bg-[#e6f7f6] text-[#008581] font-bold' : 'text-[#102A33]'
                  }`}
                >
                  <span>🇮🇳 All India</span>
                </button>
              )}

              {/* Show Search results if user typed */}
              {searchTerm ? (
                isSearching ? (
                  <div className="py-4 text-center text-xs text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin inline-block mr-1 text-teal-700" />
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-500">
                    No results for &ldquo;{searchTerm}&rdquo;
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition hover:bg-[#F5F7F8] cursor-pointer text-left"
                    >
                      <div>
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        {item.parent && (
                          <div className="text-[10px] text-gray-400">
                            {item.parent.name} ({item.type})
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {item.type}
                      </span>
                    </button>
                  ))
                )
              ) : (
                /* Default popular cities */
                cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition hover:bg-[#F5F7F8] cursor-pointer ${
                      selectedCity === city.name ? 'bg-[#e6f7f6] text-[#008581] font-bold' : 'text-[#102A33]'
                    }`}
                  >
                    <span>{city.name}</span>
                    <MapPin size={13} className="text-gray-400" />
                  </button>
                ))
              )}
            </div>

            {/* Bottom link to open full modal */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full text-center py-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition cursor-pointer"
              >
                Explore Full Directory →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Modal Picker */}
      <LocationPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectLocation={(loc) => {
          onSelectCity(loc.name, loc.slug, loc.id);
        }}
        showAllOption={true}
      />
    </>
  );
};
