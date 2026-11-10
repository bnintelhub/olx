import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Crosshair,
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  Check,
  Loader2,
  Building2,
} from 'lucide-react';
import { LocationItem } from '@/types';
import { locationsService } from '../service/locations.service';
import { toast } from 'sonner';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: LocationItem) => void;
  selectedLocationId?: string;
  title?: string;
  showAllOption?: boolean;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  selectedLocationId,
  title = 'Select Location',
  showAllOption = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Popular cities cache
  const [popularCities, setPopularCities] = useState<LocationItem[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // Hierarchy drill-down navigation state
  const [drillStack, setDrillStack] = useState<LocationItem[]>([]);
  const [currentLevelChildren, setCurrentLevelChildren] = useState<LocationItem[]>([]);
  const [isLoadingLevel, setIsLoadingLevel] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input and fetch cities on open
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingCities(true);
    locationsService
      .getCities()
      .then((cities) => setPopularCities(cities))
      .catch(() => {})
      .finally(() => setIsLoadingCities(false));

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, [isOpen]);

  // Handle debounced search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await locationsService.search(searchQuery);
        setSearchResults(results);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load children when drilling into a parent location
  const handleDrillInto = async (loc: LocationItem) => {
    setIsLoadingLevel(true);
    setDrillStack((prev) => [...prev, loc]);
    try {
      const children = await locationsService.getChildren(loc.id);
      setCurrentLevelChildren(children);
    } catch {
      setCurrentLevelChildren([]);
    } finally {
      setIsLoadingLevel(false);
    }
  };

  // Step back up one level in the hierarchy
  const handleDrillBack = async () => {
    const newStack = [...drillStack];
    newStack.pop();
    setDrillStack(newStack);

    if (newStack.length === 0) {
      setCurrentLevelChildren([]);
      return;
    }

    const parentNode = newStack[newStack.length - 1];
    setIsLoadingLevel(true);
    try {
      const children = await locationsService.getChildren(parentNode.id);
      setCurrentLevelChildren(children);
    } catch {
      setCurrentLevelChildren([]);
    } finally {
      setIsLoadingLevel(false);
    }
  };

  // Start drill-down from root countries
  const handleStartExplorer = async () => {
    setIsLoadingLevel(true);
    setDrillStack([]);
    try {
      const roots = await locationsService.getRoots();
      setCurrentLevelChildren(roots);
    } catch {
      setCurrentLevelChildren([]);
    } finally {
      setIsLoadingLevel(false);
    }
  };

  // Use browser GPS geolocation to find nearest active location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const nearby = await locationsService.nearby(lat, lng, 35);

          if (nearby && nearby.length > 0) {
            const nearest = nearby[0];
            const distLabel =
              nearest.distanceKm !== undefined
                ? ` (~${nearest.distanceKm.toFixed(1)} km away)`
                : '';
            toast.success(`Location detected: ${nearest.name}${distLabel}`);
            onSelectLocation(nearest);
            onClose();
          } else {
            toast.error('No service locations found near your current position.');
          }
        } catch {
          toast.error('Failed to resolve nearby location.');
        } finally {
          setIsDetectingGps(false);
        }
      },
      (error) => {
        setIsDetectingGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission was denied. Please search your city manually.');
        } else {
          toast.error('Could not determine your GPS position.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  if (!isOpen) return null;

  // Format parent breadcrumb label: "Patna, Bihar, India"
  const formatBreadcrumb = (loc: LocationItem): string => {
    const parts: string[] = [];
    let curr = loc.parent;
    while (curr) {
      parts.push(curr.name);
      curr = curr.parent;
    }
    return parts.join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[88vh] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500">Find ads in your exact locality or city</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, area or locality..."
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {/* GPS Auto-detect Button */}
          {!searchQuery && drillStack.length === 0 && (
            <div className="p-4 bg-teal-50/40">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingGps}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-teal-200 shadow-xs hover:border-teal-400 hover:shadow-sm transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0">
                    {isDetectingGps ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crosshair className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">
                      Use Current Location
                    </span>
                    <span className="text-xs text-gray-500">
                      {isDetectingGps
                        ? 'Detecting your GPS position...'
                        : 'Using GPS for accurate nearby listings'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-700 transition" />
              </button>

              {showAllOption && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectLocation({
                      id: '',
                      name: 'All India',
                      slug: '',
                      type: 'country',
                    });
                    onClose();
                  }}
                  className="w-full mt-2.5 flex items-center justify-between p-2.5 rounded-xl border border-dashed border-gray-300 hover:bg-white text-xs font-semibold text-gray-700 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🇮🇳</span> All India (Show All Listings)
                  </span>
                  {selectedLocationId === '' && <Check className="w-4 h-4 text-teal-600" />}
                </button>
              )}
            </div>
          )}

          {/* Search Results */}
          {searchQuery ? (
            <div className="p-2">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Search Results
              </div>
              {isSearching ? (
                <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-700" />
                  <span className="text-xs">Searching locations...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No locations found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((loc) => {
                    const breadcrumb = formatBreadcrumb(loc);
                    const isSelected = selectedLocationId === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          onSelectLocation(loc);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                          isSelected ? 'bg-teal-50 border border-teal-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{loc.name}</span>
                              <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                {loc.type}
                              </span>
                            </div>
                            {breadcrumb && (
                              <p className="text-xs text-gray-500 mt-0.5">{breadcrumb}</p>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : drillStack.length > 0 ? (
            /* Hierarchy Drill-Down View */
            <div className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleDrillBack}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-xs text-gray-600 truncate">
                  {drillStack.map((item, idx) => (
                    <span key={item.id}>
                      {idx > 0 && ' / '}
                      <span className={idx === drillStack.length - 1 ? 'font-bold text-gray-900' : ''}>
                        {item.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action to select current parent node */}
              <button
                type="button"
                onClick={() => {
                  onSelectLocation(drillStack[drillStack.length - 1]);
                  onClose();
                }}
                className="w-full mb-2 p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-left text-xs font-semibold text-teal-900 hover:bg-teal-100 transition cursor-pointer flex items-center justify-between"
              >
                <span>Select &ldquo;All of {drillStack[drillStack.length - 1].name}&rdquo;</span>
                <Check className="w-4 h-4 text-teal-700" />
              </button>

              {/* Children List */}
              {isLoadingLevel ? (
                <div className="py-6 flex items-center justify-center text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-700" />
                </div>
              ) : currentLevelChildren.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No child locations found.</p>
              ) : (
                <div className="space-y-1">
                  {currentLevelChildren.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLocation(child);
                          onClose();
                        }}
                        className="flex-1 text-left cursor-pointer"
                      >
                        <span className="text-sm font-medium text-gray-900 block">{child.name}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{child.type}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDrillInto(child)}
                        className="p-2 text-gray-400 hover:text-teal-700 transition cursor-pointer"
                        title="Explore areas"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Popular Cities & Hierarchy Explorer Entry */
            <div className="p-4 space-y-4">
              {/* Popular Cities Quick Selection */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  Popular Cities
                </div>
                {isLoadingCities ? (
                  <div className="py-4 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {popularCities.map((city) => {
                      const isSelected = selectedLocationId === city.id;
                      return (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => {
                            onSelectLocation(city);
                            onClose();
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'border-teal-700 bg-teal-50 text-teal-900'
                              : 'border-gray-200 hover:border-teal-600 hover:bg-gray-50 text-gray-800'
                          }`}
                        >
                          <span className="truncate">{city.name}</span>
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Explore All Regions */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleStartExplorer}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>🧭</span> Browse Full State & City Hierarchy
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

