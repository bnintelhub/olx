import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X,
  Camera,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Upload,
  ShieldCheck,
  MapPin,
  Tag,
  Phone,
  AlertCircle,
  Sparkles,
  Layers,
  Car,
  Home,
  Smartphone,
  Briefcase,
  Bike,
  Tv,
  Truck,
  Armchair,
  Shirt,
  BookOpen,
  Dog,
  Wrench,
  Search,
  IndianRupee,
} from 'lucide-react';
import { Category, LocationItem } from '../types';
import { categoriesService } from '../features/categories/service/categories.service';
import { locationsService } from '../features/locations/service/locations.service';
import { adsService } from '../features/ads/service/ads.service';
import { useAuthStore } from '../features/auth/stores/useAuthStore';
import { ADS_QUERY_KEYS } from '../features/ads/hook/useAdsQuery';

// Dynamic icon mapping for categories
const getCategoryIcon = (name: string, slug?: string) => {
  const text = (name + ' ' + (slug || '')).toLowerCase();
  if (text.includes('car') || text.includes('vehicle') || text.includes('auto')) return Car;
  if (
    text.includes('propert') ||
    text.includes('house') ||
    text.includes('flat') ||
    text.includes('plot') ||
    text.includes('rent') ||
    text.includes('real estate')
  )
    return Home;
  if (text.includes('mobile') || text.includes('phone') || text.includes('tablet')) return Smartphone;
  if (text.includes('job')) return Briefcase;
  if (
    text.includes('bike') ||
    text.includes('motorcycle') ||
    text.includes('scooter') ||
    text.includes('two wheeler')
  )
    return Bike;
  if (
    text.includes('electronic') ||
    text.includes('appliance') ||
    text.includes('tv') ||
    text.includes('laptop') ||
    text.includes('camera')
  )
    return Tv;
  if (
    text.includes('commercial') ||
    text.includes('truck') ||
    text.includes('spares')
  )
    return Truck;
  if (
    text.includes('furnitur') ||
    text.includes('sofa') ||
    text.includes('bed') ||
    text.includes('chair')
  )
    return Armchair;
  if (
    text.includes('fashion') ||
    text.includes('cloth') ||
    text.includes('dress') ||
    text.includes('shoes')
  )
    return Shirt;
  if (
    text.includes('book') ||
    text.includes('sport') ||
    text.includes('hobb') ||
    text.includes('game')
  )
    return BookOpen;
  if (
    text.includes('pet') ||
    text.includes('animal') ||
    text.includes('dog') ||
    text.includes('cat')
  )
    return Dog;
  if (text.includes('service') || text.includes('repair')) return Wrench;
  return Layers;
};

// Formats numbers to Indian numbering system (e.g. 1,50,000)
function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

// Converts numeric amount to friendly Indian words (e.g. 50 Thousand, 2.5 Lakh)
function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return '';
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '');
    return `${cr} Crore`;
  }
  if (num >= 100000) {
    const lakh = (num / 100000).toFixed(2).replace(/\.00$/, '');
    return `${lakh} Lakh`;
  }
  if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${k} Thousand`;
  }
  return `${num}`;
}

interface AttributeItem {
  id: string;
  name: string;
  key: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'DATE';
  options?: string[];
  isRequired: boolean;
  isFilterable: boolean;
  unit?: string;
}

interface ImageUploadItem {
  file: File;
  previewUrl: string;
  isCover: boolean;
}

export const PostAdModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdCreated?: (newAd: any) => void;
}> = ({ isOpen, onClose, onAdCreated }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-step form state: 1 = Choose Category, 2 = Form Details, 3 = Success confirmation
  const [step, setStep] = useState<number>(1);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(false);

  // Category selection state
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryAttributes, setCategoryAttributes] = useState<AttributeItem[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);

  // Ad fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [contactPreference, setContactPreference] = useState<'CHAT_AND_CALL' | 'CHAT_ONLY' | 'CALL_ONLY'>('CHAT_AND_CALL');

  // Images state
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [createdAd, setCreatedAd] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Category Tree and Cities upon opening
  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setFormError(null);
    setCreatedAd(null);
    setSelectedParentCategory(null);
    setSelectedCategory(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setIsNegotiable(true);
    setImages([]);
    setAttributeValues({});
    setCategoryAttributes([]);

    let isMounted = true;
    setIsLoadingTaxonomy(true);

    Promise.all([
      categoriesService.getCategoriesTree().catch(() => []),
      locationsService.getCities().catch(() => []),
    ])
      .then(([tree, cities]) => {
        if (!isMounted) return;
        setCategoriesTree(tree);
        setLocations(cities);
        if (cities.length > 0 && !selectedLocationId) {
          setSelectedLocationId(cities[0].id);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingTaxonomy(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Clean up object URLs when modal unmounts or images change
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [images]);

  // Filter root categories by search term
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoriesTree;
    const q = categorySearch.toLowerCase().trim();
    return categoriesTree.filter((cat) => {
      const matchParent = cat.name.toLowerCase().includes(q);
      const matchChild = (cat.subcategories || (cat as any).children || []).some((sub: any) =>
        sub.name.toLowerCase().includes(q)
      );
      return matchParent || matchChild;
    });
  }, [categoriesTree, categorySearch]);

  // Select leaf category and fetch its specification attributes
  const handleSelectLeafCategory = async (cat: Category) => {
    setSelectedCategory(cat);
    setFormError(null);
    setIsLoadingAttributes(true);

    try {
      const attributes = await categoriesService.getCategoryAttributes(cat.id);
      setCategoryAttributes(attributes);

      // Pre-populate default values
      const defaults: Record<string, any> = {};
      attributes.forEach((attr: AttributeItem) => {
        if (attr.type === 'BOOLEAN') {
          defaults[attr.key] = true;
        } else if (attr.type === 'SELECT' && attr.options?.length) {
          defaults[attr.key] = attr.options[0];
        } else {
          defaults[attr.key] = '';
        }
      });
      setAttributeValues(defaults);
    } catch {
      setCategoryAttributes([]);
    } finally {
      setIsLoadingAttributes(false);
      setStep(2);
    }
  };

  // Image Selection Handler (Max 8 photos, <10MB each)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 8) {
      setFormError('You can upload a maximum of 8 photos per ad.');
      toast.error('Maximum 8 photos allowed');
      return;
    }

    const newItems: ImageUploadItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        setFormError(`Image "${file.name}" exceeds the 10MB size limit.`);
        toast.error(`Image exceeds 10MB: ${file.name}`);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        file,
        previewUrl,
        isCover: images.length === 0 && i === 0,
      });
    }

    setImages((prev) => [...prev, ...newItems]);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove photo
  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index];
      if (target?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  // Set cover photo
  const handleSetCover = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isCover: i === index,
      }))
    );
  };

  // Form Submission
  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      openAuthModal();
      return;
    }

    if (!selectedCategory) {
      setFormError('Please choose a valid category for your listing.');
      setStep(1);
      return;
    }

    if (title.trim().length < 10) {
      setFormError('Ad title must be at least 10 characters long.');
      return;
    }

    if (description.trim().length < 20) {
      setFormError('Please provide a detailed description of at least 20 characters.');
      return;
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Please enter a valid selling price greater than zero.');
      return;
    }

    if (images.length === 0) {
      setFormError('Please upload at least 1 photo of your item to attract buyers.');
      return;
    }

    if (!selectedLocationId) {
      setFormError('Please select a valid city/location for your ad.');
      return;
    }

    // Verify required dynamic specification attributes
    for (const attr of categoryAttributes) {
      if (attr.isRequired) {
        const val = attributeValues[attr.key];
        if (val === undefined || val === null || val === '') {
          setFormError(`Please enter a value for the required specification "${attr.name}".`);
          return;
        }
      }
    }

    setIsUploading(true);
    setUploadProgressText('Uploading photos...');

    try {
      // 1. Upload photos via secure backend multipart endpoint
      const rawFiles = images.map((img) => img.file);
      const uploadedMedia = await adsService.uploadImages(rawFiles);

      if (!uploadedMedia || uploadedMedia.length === 0) {
        throw new Error('Failed to upload photos. Please try again.');
      }

      setUploadProgressText('Publishing listing to OLX...');

      // 2. Build ad payload with both mediaId and fallback URLs
      const adImagesPayload = uploadedMedia.map((m, idx) => ({
        mediaId: m.mediaId,
        url: m.url || m.displayUrl,
        sortOrder: idx,
        isCover: images[idx]?.isCover ?? idx === 0,
      }));

      const adPayload = {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        isNegotiable,
        categoryId: selectedCategory.id,
        locationId: selectedLocationId,
        contactPreference,
        attributes: attributeValues,
        images: adImagesPayload,
      };

      // 3. Create the listing
      const newAd = await adsService.createAd(adPayload);

      setCreatedAd(newAd);
      toast.success('Your ad is now LIVE!');
      queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.myAds() });

      if (onAdCreated) {
        onAdCreated(newAd);
      }

      setStep(3); // Success Screen
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to publish ad';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F2F4F5] animate-fade-in flex flex-col min-h-screen">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#D8DFE2] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={() => {
            if (step === 2) {
              setStep(1);
            } else if (step === 1 && selectedParentCategory) {
              setSelectedParentCategory(null);
            } else {
              onClose();
            }
          }}
          className="p-1.5 text-[#002f34] hover:bg-[#F2F4F5] rounded-full transition cursor-pointer"
          title="Back"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-[#002f34]">
            {step === 3 ? 'Ad Published' : 'Post Your Ad'}
          </h1>
          {step < 3 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EBF1F3] text-[#002f34]">
              Step {step} of 2
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-[#667784] hover:text-[#002f34] hover:bg-[#F2F4F5] rounded-full transition cursor-pointer"
          title="Close"
        >
          <X size={22} />
        </button>
      </header>

      {/* Error Banner */}
      {formError && (
        <div className="sticky top-[57px] z-10 bg-red-50 border-b border-red-200 px-6 py-3 text-xs sm:text-sm font-semibold text-red-700 flex items-center justify-center gap-2 shadow-xs">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center">
        {/* =========================================================================
            STEP 1: CHOOSE A CATEGORY & SUBCATEGORY
            ========================================================================= */}
        {step === 1 && (
          <div className="w-full max-w-2xl bg-white rounded-xl border border-[#D8DFE2] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#EBF1F3] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#002f34]">
                  {selectedParentCategory ? selectedParentCategory.name : 'Choose a category'}
                </h2>
                <p className="text-xs text-[#70808C] mt-0.5">
                  {selectedParentCategory
                    ? 'Select the exact subcategory for your listing'
                    : 'Select a primary category to start posting'}
                </p>
              </div>

              {/* Search Category filter */}
              {!selectedParentCategory && (
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-2.5 text-[#70808C]" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full rounded-lg border border-[#D8DFE2] bg-[#F7F8F9] pl-9 pr-3 py-1.5 text-xs font-medium text-[#002f34] placeholder:text-[#70808C] outline-none focus:border-[#002f34] focus:bg-white transition"
                  />
                  {categorySearch && (
                    <button
                      type="button"
                      onClick={() => setCategorySearch('')}
                      className="absolute right-2.5 top-2 text-[#70808C] hover:text-[#002f34]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {isLoadingTaxonomy ? (
              <div className="py-16 text-center text-[#70808C] flex flex-col items-center justify-center gap-2">
                <RefreshCw size={24} className="animate-spin text-[#008581]" />
                <span className="text-xs font-medium">Loading categories...</span>
              </div>
            ) : !selectedParentCategory ? (
              /* Root Categories List */
              <div className="divide-y divide-[#EBF1F3] max-h-[65vh] overflow-y-auto">
                {filteredCategories.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#70808C]">
                    No categories found matching &quot;{categorySearch}&quot;
                  </div>
                ) : (
                  filteredCategories.map((cat) => {
                    const IconComp = getCategoryIcon(cat.name, cat.slug);
                    const subList = cat.subcategories || (cat as any).children || [];
                    const hasSubs = subList.length > 0;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          if (hasSubs) {
                            setSelectedParentCategory(cat);
                          } else {
                            handleSelectLeafCategory(cat);
                          }
                        }}
                        className="flex items-center justify-between px-6 py-4 hover:bg-[#F5F7F8] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-[#EBF1F3] group-hover:bg-[#002f34] group-hover:text-white text-[#002f34] flex items-center justify-center transition-colors">
                            <IconComp size={20} strokeWidth={1.8} />
                          </div>
                          <div>
                            <span className="text-sm sm:text-[15px] font-bold text-[#002f34] group-hover:text-[#008581] transition-colors">
                              {cat.name}
                            </span>
                            {cat.description && (
                              <p className="text-[11px] text-[#70808C] line-clamp-1">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[#70808C] group-hover:text-[#002f34]">
                          {hasSubs && (
                            <span className="text-[11px] font-semibold text-[#70808C] hidden sm:inline">
                              {subList.length} subcategories
                            </span>
                          )}
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Subcategories List */
              <div>
                <div className="px-6 py-3 border-b border-[#EBF1F3] bg-[#F7F8F9] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedParentCategory(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#008581] hover:underline cursor-pointer"
                  >
                    <ArrowLeft size={16} /> All Categories
                  </button>
                  <span className="text-xs font-extrabold text-[#002f34] uppercase tracking-wider">
                    {selectedParentCategory.name}
                  </span>
                </div>

                <div className="divide-y divide-[#EBF1F3] max-h-[60vh] overflow-y-auto">
                  {(selectedParentCategory.subcategories || (selectedParentCategory as any).children || []).map(
                    (sub: Category) => (
                      <div
                        key={sub.id}
                        onClick={() => handleSelectLeafCategory(sub)}
                        className="flex items-center justify-between px-6 py-4 hover:bg-[#F5F7F8] transition-colors cursor-pointer group"
                      >
                        <span className="text-sm sm:text-[15px] font-medium text-[#002f34] group-hover:text-[#008581] transition-colors">
                          {sub.name}
                        </span>
                        <ChevronRight
                          size={18}
                          className="text-[#70808C] group-hover:text-[#002f34] transition-colors"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STEP 2: COMPLETE AD DETAILS (OLX FORM)
            ========================================================================= */}
        {step === 2 && (
          <form
            onSubmit={handleSubmitAd}
            className="w-full max-w-3xl space-y-6"
          >
            {/* 1. Selected Category Card */}
            <div className="bg-white rounded-xl border border-[#D8DFE2] p-4 sm:p-5 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#EBF1F3] text-[#002f34] flex items-center justify-center font-bold">
                  <Tag size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#70808C] tracking-wider block">
                    Selected Category
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#002f34]">
                    {selectedParentCategory ? `${selectedParentCategory.name} > ` : ''}
                    {selectedCategory?.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-[#008581] hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* 2. Include Some Details (Dynamic Specifications & Title/Description) */}
            <div className="bg-white rounded-xl border border-[#D8DFE2] p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-[#EBF1F3] pb-3">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#002f34]">
                  Include Some Details
                </h3>
                <p className="text-xs text-[#70808C] mt-0.5">
                  Provide accurate information to help buyers find your item quickly
                </p>
              </div>

              {/* Dynamic Specifications */}
              {isLoadingAttributes ? (
                <div className="py-6 text-center text-xs text-[#70808C] flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-[#008581]" />
                  <span>Loading category specifications...</span>
                </div>
              ) : (
                categoryAttributes.length > 0 && (
                  <div className="space-y-4 pt-1">
                    <h4 className="text-xs font-extrabold text-[#70808C] uppercase tracking-wider">
                      Specifications
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {categoryAttributes.map((attr) => (
                        <div key={attr.id} className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#002f34]">
                            {attr.name} {attr.isRequired && <span className="text-red-500">*</span>}
                            {attr.unit && (
                              <span className="text-[#70808C] font-normal ml-1">({attr.unit})</span>
                            )}
                          </label>

                          {attr.type === 'SELECT' ? (
                            <select
                              value={attributeValues[attr.key] || ''}
                              onChange={(e) =>
                                setAttributeValues((prev) => ({ ...prev, [attr.key]: e.target.value }))
                              }
                              required={attr.isRequired}
                              className="w-full rounded-lg border border-[#D8DFE2] bg-white p-2.5 text-xs font-medium text-[#002f34] outline-none focus:border-[#002f34] transition"
                            >
                              <option value="">Select {attr.name}</option>
                              {attr.options?.map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : attr.type === 'BOOLEAN' ? (
                            <div className="flex items-center gap-4 pt-1">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-[#002f34] cursor-pointer">
                                <input
                                  type="radio"
                                  name={attr.key}
                                  checked={attributeValues[attr.key] === true}
                                  onChange={() =>
                                    setAttributeValues((prev) => ({ ...prev, [attr.key]: true }))
                                  }
                                  className="accent-[#002f34]"
                                />
                                Yes
                              </label>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-[#002f34] cursor-pointer">
                                <input
                                  type="radio"
                                  name={attr.key}
                                  checked={attributeValues[attr.key] === false}
                                  onChange={() =>
                                    setAttributeValues((prev) => ({ ...prev, [attr.key]: false }))
                                  }
                                  className="accent-[#002f34]"
                                />
                                No
                              </label>
                            </div>
                          ) : attr.type === 'NUMBER' ? (
                            <div className="relative">
                              <input
                                type="number"
                                required={attr.isRequired}
                                placeholder={`Enter ${attr.name.toLowerCase()}`}
                                value={attributeValues[attr.key] ?? ''}
                                onChange={(e) =>
                                  setAttributeValues((prev) => ({
                                    ...prev,
                                    [attr.key]: e.target.value === '' ? '' : Number(e.target.value),
                                  }))
                                }
                                className="w-full rounded-lg border border-[#D8DFE2] bg-white p-2.5 text-xs font-medium text-[#002f34] outline-none focus:border-[#002f34] transition"
                              />
                              {attr.unit && (
                                <span className="absolute right-3 top-2.5 text-xs font-bold text-[#70808C]">
                                  {attr.unit}
                                </span>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              required={attr.isRequired}
                              placeholder={`Enter ${attr.name.toLowerCase()}`}
                              value={attributeValues[attr.key] || ''}
                              onChange={(e) =>
                                setAttributeValues((prev) => ({ ...prev, [attr.key]: e.target.value }))
                              }
                              className="w-full rounded-lg border border-[#D8DFE2] bg-white p-2.5 text-xs font-medium text-[#002f34] outline-none focus:border-[#002f34] transition"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* Title & Description */}
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#002f34]">
                      Ad Title <span className="text-red-500">*</span>
                    </label>
                    <span
                      className={`text-[11px] font-semibold ${
                        title.length < 10 ? 'text-[#70808C]' : 'text-emerald-600'
                      }`}
                    >
                      {title.length} / 100 (min 10)
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Apple iPhone 14 Pro Max 256GB Deep Purple with bill & box"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-[#D8DFE2] bg-white p-3 text-sm font-medium text-[#002f34] outline-none focus:border-[#002f34] transition"
                  />
                  <p className="text-[11px] text-[#70808C] mt-1">
                    Mention key highlights of your item (brand, model, age, condition).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#002f34]">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <span
                      className={`text-[11px] font-semibold ${
                        description.length < 20 ? 'text-[#70808C]' : 'text-emerald-600'
                      }`}
                    >
                      {description.length} / 4000 (min 20)
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    maxLength={4000}
                    placeholder="Describe condition, reason for selling, accessories included, warranty details, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-[#D8DFE2] bg-white p-3 text-sm font-medium text-[#002f34] outline-none focus:border-[#002f34] transition"
                  />
                  <p className="text-[11px] text-[#70808C] mt-1">
                    Include condition, features, warranty, and reason for selling.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Set a Price Card */}
            <div className="bg-white rounded-xl border border-[#D8DFE2] p-6 sm:p-8 shadow-xs space-y-4">
              <div className="border-b border-[#EBF1F3] pb-3">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#002f34]">
                  Set a Price
                </h3>
                <p className="text-xs text-[#70808C] mt-0.5">
                  Set a competitive price to attract serious buyers
                </p>
              </div>

              <div className="max-w-sm">
                <label className="block text-xs font-bold text-[#002f34] mb-1.5">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-base font-extrabold text-[#002f34]">
                    ₹
                  </div>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="50,000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-lg border border-[#D8DFE2] bg-white pl-9 pr-3 py-2.5 text-lg font-black text-[#002f34] outline-none focus:border-[#002f34] transition"
                  />
                </div>

                {/* Price in words preview */}
                {Number(price) > 0 && (
                  <p className="text-xs font-bold text-[#008581] mt-1.5">
                    ₹ {formatIndianNumber(Number(price))} • {numberToIndianWords(Number(price))}
                  </p>
                )}

                <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#002f34]"
                  />
                  <span className="text-xs font-semibold text-[#002f34]">
                    Price is Negotiable
                  </span>
                </label>
              </div>
            </div>

            {/* 4. Upload Photos Card (Up to 8 photos) */}
            <div className="bg-white rounded-xl border border-[#D8DFE2] p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EBF1F3] pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#002f34]">
                    Upload Up to 8 Photos
                  </h3>
                  <p className="text-xs text-[#70808C] mt-0.5">
                    First photo is your cover image. Ads with clear photos get 5x more responses!
                  </p>
                </div>
                <span className="text-xs font-bold text-[#002f34] px-2.5 py-1 rounded-full bg-[#EBF1F3]">
                  {images.length} / 8 Photos
                </span>
              </div>

              {/* Photo Upload Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 group transition-all ${
                      img.isCover
                        ? 'border-[#008581] ring-2 ring-[#008581]/30 shadow-sm'
                        : 'border-[#D8DFE2] hover:border-[#002f34]'
                    }`}
                  >
                    <img
                      src={img.previewUrl}
                      alt={`Upload ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-red-600/90 hover:bg-red-700 p-1.5 text-white transition shadow cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 size={13} />
                    </button>

                    {/* Cover badge / Set cover action */}
                    {img.isCover ? (
                      <span className="absolute bottom-2 left-2 rounded-md bg-[#008581] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                        COVER PHOTO
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCover(idx)}
                        className="absolute bottom-2 left-2 rounded-md bg-black/75 hover:bg-black px-2 py-0.5 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        Set as Cover
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Photo Slot */}
                {images.length < 8 && (
                  <label className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D8DFE2] bg-[#F7F8F9] hover:border-[#002f34] hover:bg-white transition cursor-pointer group">
                    <Camera size={26} className="text-[#70808C] group-hover:text-[#002f34] transition" />
                    <span className="mt-2 text-xs font-bold text-[#002f34]">+ Add Photo</span>
                    <span className="text-[10px] text-[#70808C] mt-0.5">JPEG, PNG, WebP</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* 5. Confirm Your Location Card */}
            <div className="bg-white rounded-xl border border-[#D8DFE2] p-6 sm:p-8 shadow-xs space-y-4">
              <div className="border-b border-[#EBF1F3] pb-3">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#002f34]">
                  Confirm Your Location
                </h3>
                <p className="text-xs text-[#70808C] mt-0.5">
                  Select the city where buyers can meet or pick up the item
                </p>
              </div>

              <div className="max-w-md">
                <label className="block text-xs font-bold text-[#002f34] mb-1.5">
                  City / State <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-3 text-[#70808C]" />
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[#D8DFE2] bg-white pl-9 pr-3 py-2.5 text-sm font-medium text-[#002f34] outline-none focus:border-[#002f34] transition"
                  >
                    <option value="">Select City</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 6. Review Your Details Card */}
            <div className="bg-white rounded-xl border border-[#D8DFE2] p-6 sm:p-8 shadow-xs space-y-4">
              <div className="border-b border-[#EBF1F3] pb-3">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#002f34]">
                  Review Your Details
                </h3>
                <p className="text-xs text-[#70808C] mt-0.5">
                  This information will be associated with your listing
                </p>
              </div>

              {user ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F7F8F9] border border-[#EBF1F3]">
                  <div className="h-12 w-12 rounded-full border-2 border-emerald-400 bg-[#e6f7f6] flex items-center justify-center text-[#008581] font-bold text-base shadow-xs">
                    {user.profile?.name?.[0]?.toUpperCase() || user.phoneNumber?.[0] || 'U'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#002f34]">
                      {user.profile?.name || 'OLX Seller'}
                    </h4>
                    <p className="text-xs text-[#70808C]">{user.phoneNumber || user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-800">
                    You are not logged in. Please sign in to post your ad.
                  </span>
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="text-xs font-bold text-[#008581] hover:underline"
                  >
                    Log in
                  </button>
                </div>
              )}

              <div className="max-w-md pt-2">
                <label className="block text-xs font-bold text-[#002f34] mb-1.5">
                  Buyer Contact Method
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-3 text-[#70808C]" />
                  <select
                    value={contactPreference}
                    onChange={(e) => setContactPreference(e.target.value as any)}
                    className="w-full rounded-lg border border-[#D8DFE2] bg-white pl-9 pr-3 py-2.5 text-xs font-medium text-[#002f34] outline-none focus:border-[#002f34] transition"
                  >
                    <option value="CHAT_AND_CALL">Both In-App Chat & Call (Recommended)</option>
                    <option value="CHAT_ONLY">In-App Chat Only (Keep Phone Hidden)</option>
                    <option value="CALL_ONLY">Phone Call Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md rounded-xl border border-[#D8DFE2] p-4 sm:p-5 shadow-lg flex items-center justify-between z-20">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-[#002f34] hover:bg-[#F2F4F5] rounded-lg transition cursor-pointer"
              >
                ← Back
              </button>

              <button
                type="submit"
                disabled={isUploading || images.length === 0 || !title.trim() || !price}
                className="flex items-center gap-2 rounded-xl bg-[#FFD54A] hover:bg-[#f5c62d] px-8 sm:px-10 py-3 text-sm sm:text-base font-black text-[#002f34] shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>{uploadProgressText || 'Publishing...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Post Now</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            STEP 3: SUCCESS CONFIRMATION SCREEN
            ========================================================================= */}
        {step === 3 && createdAd && (
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#D8DFE2] shadow-xl p-6 sm:p-8 text-center space-y-6 animate-fade-in my-auto">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 size={48} strokeWidth={2.2} />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#002f34]">
                Congratulations! Your Ad is LIVE
              </h2>
              <p className="text-xs sm:text-sm text-[#70808C] mt-1.5">
                Buyers in <strong>{createdAd.location?.name || 'your area'}</strong> can now discover your listing and reach out to you directly.
              </p>
            </div>

            {/* Ad Preview Card */}
            <div className="rounded-xl border border-[#D8DFE2] bg-[#F7F8F9] p-4 text-left flex gap-4 items-center">
              {createdAd.images?.[0] ? (
                <img
                  src={
                    createdAd.images[0].thumbnailUrl ||
                    createdAd.images[0].displayUrl ||
                    createdAd.images[0].originalUrl
                  }
                  alt={createdAd.title}
                  className="h-20 w-20 rounded-lg object-cover border border-[#D8DFE2] flex-shrink-0"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-[#EBF1F3] flex items-center justify-center text-[#70808C] flex-shrink-0">
                  <Tag size={24} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    {createdAd.status || 'ACTIVE'}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#002f34] truncate mt-0.5">
                  {createdAd.title}
                </h4>
                <p className="text-base font-black text-[#008581] mt-0.5">
                  ₹ {formatIndianNumber(Number(createdAd.price))}
                </p>
                <p className="text-[11px] text-[#70808C] truncate mt-0.5">
                  {createdAd.location?.name}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/ad/${createdAd.id}`);
                }}
                className="w-full sm:w-auto rounded-xl bg-[#002f34] hover:bg-[#003F46] px-6 py-3 text-xs sm:text-sm font-bold text-white transition shadow-sm cursor-pointer"
              >
                View Your Ad
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCreatedAd(null);
                  setTitle('');
                  setDescription('');
                  setPrice('');
                  setImages([]);
                  setSelectedCategory(null);
                  setSelectedParentCategory(null);
                }}
                className="w-full sm:w-auto rounded-xl border border-[#D8DFE2] hover:bg-[#F2F4F5] px-6 py-3 text-xs sm:text-sm font-bold text-[#002f34] transition cursor-pointer"
              >
                Sell Another Item
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl px-5 py-3 text-xs sm:text-sm font-semibold text-[#70808C] hover:text-[#002f34] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
