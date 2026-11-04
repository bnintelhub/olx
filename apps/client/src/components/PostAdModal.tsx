import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
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
} from 'lucide-react';
import { Category, LocationItem } from '../types';

const getCategoryIcon = (name: string, slug?: string) => {
  const text = (name + ' ' + (slug || '')).toLowerCase();
  if (text.includes('car')) return Car;
  if (
    text.includes('propert') ||
    text.includes('house') ||
    text.includes('flat') ||
    text.includes('plot') ||
    text.includes('rent')
  )
    return Home;
  if (text.includes('mobile') || text.includes('phone')) return Smartphone;
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
    text.includes('laptop')
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
    text.includes('dress')
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
  file?: File;
  previewUrl: string;
  serverUrl?: string;
  isCover: boolean;
}

export const PostAdModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdCreated?: (newAd: any) => void;
}> = ({ isOpen, onClose, onAdCreated }) => {
  const [step, setStep] = useState<number>(1);
  const [categoriesTree, setCategoriesTree] = useState<any[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);

  // Selection state
  const [selectedParentCategory, setSelectedParentCategory] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryAttributes, setCategoryAttributes] = useState<AttributeItem[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});

  // Listing fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [contactPreference, setContactPreference] = useState<'CHAT_AND_CALL' | 'CHAT_ONLY' | 'CALL_ONLY'>('CHAT_AND_CALL');

  // Media
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [createdAd, setCreatedAd] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories tree and locations
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setCreatedAd(null);

      fetch('/api/v1/categories/tree')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) setCategoriesTree(data.data);
        })
        .catch(() => {});

      fetch('/api/v1/locations/cities')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setLocations(data.data);
            if (data.data.length > 0) setSelectedLocationId(data.data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // When a leaf category is chosen, fetch dynamic attributes
  const handleSelectLeafCategory = async (cat: Category) => {
    setSelectedCategory(cat);
    setError(null);
    try {
      const res = await fetch(`/api/v1/categories/${cat.id}/attributes`);
      const data = await res.json();
      if (data.success && data.data) {
        setCategoryAttributes(data.data.attributes || []);
        // Initialize default attribute values
        const defaults: Record<string, any> = {};
        data.data.attributes.forEach((attr: AttributeItem) => {
          if (attr.type === 'BOOLEAN') defaults[attr.key] = true;
          else if (attr.type === 'SELECT' && attr.options?.length) defaults[attr.key] = attr.options[0];
          else defaults[attr.key] = '';
        });
        setAttributeValues(defaults);
      }
    } catch (_) {}
    setStep(2);
  };

  // Image Selection & Client-Side Compression Preview
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 12) {
      setError('You can upload a maximum of 12 photos.');
      return;
    }

    const newItems: ImageUploadItem[] = [];
    Array.from(files).forEach((file, idx) => {
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        file,
        previewUrl,
        isCover: images.length === 0 && idx === 0,
      });
    });

    setImages((prev) => [...prev, ...newItems]);
    setError(null);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  const handleSetCover = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isCover: i === index,
      }))
    );
  };

  // Publish Ad
  const handlePublishAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !selectedLocationId) return;

    if (images.length === 0) {
      setError('Please upload at least 1 photo of your item.');
      return;
    }

    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      setError('Please enter a valid selling price.');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const token = localStorage.getItem('olx_access_token');
      if (!token) {
        throw new Error('Please log in first to post an ad.');
      }

      // 1. Upload Images to Backend
      setIsUploadingImages(true);
      const formData = new FormData();
      images.forEach((img) => {
        if (img.file) {
          formData.append('images', img.file);
        }
      });

      const uploadRes = await fetch('/api/v1/ads/upload-images', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || 'Failed to upload images');
      }

      const uploadedImages = uploadData.data.map((item: any, idx: number) => ({
        url: item.url,
        isCover: images[idx]?.isCover || idx === 0,
      }));

      // 2. Submit Complete Ad
      const adPayload = {
        title,
        description,
        price: priceNum,
        isNegotiable,
        categoryId: selectedCategory.id,
        locationId: selectedLocationId,
        contactPreference,
        attributes: attributeValues,
        images: uploadedImages,
      };

      const adRes = await fetch('/api/v1/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adPayload),
      });

      const adData = await adRes.json();
      if (!adRes.ok) {
        throw new Error(adData.error?.message || 'Failed to publish ad');
      }

      setCreatedAd(adData.data);
      if (onAdCreated) onAdCreated(adData.data);
      setStep(4); // Success screen
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
      setIsUploadingImages(false);
    }
  };

  if (!isOpen) return null;

  const handleBackNav = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else if (selectedParentCategory) {
      setSelectedParentCategory(null);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F2F4F5] animate-fade-in flex flex-col min-h-screen">
      {/* Top Header matching OLX style */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#E5EAED] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={handleBackNav}
          className="p-1.5 text-[#002f34] hover:bg-[#F2F4F5] rounded-full transition cursor-pointer"
          title="Back"
        >
          <ArrowLeft size={22} />
        </button>

        <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-[#002f34]">
          Post Your Ad
        </h1>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-[#667784] hover:text-[#002f34] hover:bg-[#F2F4F5] rounded-full transition cursor-pointer"
          title="Close"
        >
          <X size={22} />
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-xs font-semibold text-red-700 text-center">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center">
        {/* STEP 1: CATEGORY SELECTION MATCHING SCREENSHOT */}
        {step === 1 && (
          <div className="w-full max-w-2xl bg-white rounded-lg border border-[#D8DFE2] shadow-xs overflow-hidden">
            {!selectedParentCategory ? (
              <div>
                <div className="px-6 py-4 border-b border-[#EBF1F3] bg-white">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#002f34]">
                    Choose a category
                  </h2>
                </div>

                <div className="divide-y divide-[#EBF1F3]">
                  {categoriesTree
                    .filter((cat) => cat.slug !== 'none')
                    .map((cat) => {
                      const IconComp = getCategoryIcon(cat.name, cat.slug);
                      return (
                        <div
                          key={cat.id}
                          onClick={() => {
                            if (cat.children && cat.children.length > 0) {
                              setSelectedParentCategory(cat);
                            } else {
                              handleSelectLeafCategory(cat);
                            }
                          }}
                          className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F2F4F5] transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-[#667784] group-hover:text-[#002f34] transition-colors">
                              <IconComp size={20} strokeWidth={1.75} />
                            </div>
                            <span className="text-[15px] font-medium text-[#002f34] group-hover:text-[#002f34]">
                              {cat.name}
                            </span>
                          </div>
                          <ChevronRight
                            size={18}
                            className="text-[#70808C] group-hover:text-[#002f34] transition-colors"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div>
                <div className="px-6 py-3.5 border-b border-[#EBF1F3] bg-[#F7F8F9] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedParentCategory(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#008581] hover:underline cursor-pointer"
                  >
                    <ArrowLeft size={16} /> All Categories
                  </button>
                  <span className="text-xs font-bold text-[#002f34] uppercase tracking-wider">
                    {selectedParentCategory.name}
                  </span>
                </div>

                <div className="px-6 py-3 border-b border-[#EBF1F3] bg-white">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#70808C]">
                    Choose a subcategory
                  </h3>
                </div>

                <div className="divide-y divide-[#EBF1F3]">
                  {selectedParentCategory.children.map((sub: any) => (
                    <div
                      key={sub.id}
                      onClick={() => handleSelectLeafCategory(sub)}
                      className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F2F4F5] transition-colors cursor-pointer group"
                    >
                      <span className="text-[15px] font-medium text-[#002f34]">
                        {sub.name}
                      </span>
                      <ChevronRight
                        size={18}
                        className="text-[#70808C] group-hover:text-[#002f34] transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: DYNAMIC ATTRIBUTES & BASIC INFO */}
        {step === 2 && (
          <div className="w-full max-w-3xl bg-white rounded-lg border border-[#D8DFE2] shadow-xs p-6 sm:p-8 space-y-6">
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  Selected Category: <strong>{selectedCategory?.name}</strong>
                </span>
                <button
                  onClick={() => setStep(1)}
                  className="text-accent font-bold hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Dynamic Specifications */}
              {categoryAttributes.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-gray-200 pb-2">
                    Specifications
                  </h4>

                  {categoryAttributes.map((attr) => (
                    <div key={attr.id}>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {attr.name} {attr.isRequired && <span className="text-red-500">*</span>}
                        {attr.unit && <span className="text-gray-400 font-normal ml-1">({attr.unit})</span>}
                      </label>

                      {attr.type === 'SELECT' ? (
                        <div className="flex flex-wrap gap-2">
                          {attr.options?.map((opt, oIdx) => {
                            const isSelected = attributeValues[attr.key] === opt;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() =>
                                  setAttributeValues((prev) => ({ ...prev, [attr.key]: opt }))
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                                  isSelected
                                    ? 'bg-accent text-white border-accent shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-accent'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : attr.type === 'NUMBER' ? (
                        <div className="relative max-w-xs">
                          <input
                            type="number"
                            required={attr.isRequired}
                            placeholder={`Enter ${attr.name.toLowerCase()}`}
                            value={attributeValues[attr.key] || ''}
                            onChange={(e) =>
                              setAttributeValues((prev) => ({
                                ...prev,
                                [attr.key]: Number(e.target.value),
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 p-2 text-xs font-medium outline-none focus:border-accent"
                          />
                          {attr.unit && (
                            <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">
                              {attr.unit}
                            </span>
                          )}
                        </div>
                      ) : attr.type === 'BOOLEAN' ? (
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                            <input
                              type="radio"
                              name={attr.key}
                              checked={attributeValues[attr.key] === true}
                              onChange={() =>
                                setAttributeValues((prev) => ({ ...prev, [attr.key]: true }))
                              }
                              className="text-accent"
                            />
                            Yes
                          </label>
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                            <input
                              type="radio"
                              name={attr.key}
                              checked={attributeValues[attr.key] === false}
                              onChange={() =>
                                setAttributeValues((prev) => ({ ...prev, [attr.key]: false }))
                              }
                              className="text-accent"
                            />
                            No
                          </label>
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
                          className="w-full rounded-lg border border-gray-300 p-2 text-xs font-medium outline-none focus:border-accent"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Title & Description */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider">
                  Ad Title & Details
                </h4>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ad Title * <span className="text-gray-400 font-normal">({title.length}/100)</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Maruti Suzuki Swift VXI 2021 Petrol in mint condition"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-medium outline-none focus:border-accent"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Include brand, model, and key highlights (minimum 10 characters).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Description * <span className="text-gray-400 font-normal">({description.length}/4000)</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe condition, reason for selling, accessories included, service history, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-medium outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={title.length < 10 || description.length < 20}
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-primary-dark transition disabled:opacity-50"
                >
                  Next: Photos & Price →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PHOTOS, PRICING & LOCATION */}
          {step === 3 && (
            <form onSubmit={handlePublishAd} className="space-y-6 max-w-2xl mx-auto">
              {/* Photo Upload Box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider">
                    Upload Photos ({images.length}/12) *
                  </label>
                  <span className="text-xs text-gray-400">First photo is cover image</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 group ${
                        img.isCover ? 'border-accent ring-2 ring-accent/30' : 'border-gray-200'
                      }`}
                    >
                      <img src={img.previewUrl} alt="Upload" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white opacity-90 hover:opacity-100 transition shadow"
                      >
                        <Trash2 size={12} />
                      </button>
                      {img.isCover ? (
                        <span className="absolute bottom-1 left-1 rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                          COVER
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCover(idx)}
                          className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white opacity-0 group-hover:opacity-100 transition"
                        >
                          Make Cover
                        </button>
                      )}
                    </div>
                  ))}

                  {images.length < 12 && (
                    <label className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-accent hover:bg-accent-light/20 cursor-pointer transition">
                      <Camera size={24} className="text-gray-400" />
                      <span className="mt-1 text-[11px] font-bold text-gray-500">+ Add Photo</span>
                      <input
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

              {/* Price */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-1">
                  Selling Price (₹) *
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-2.5 text-base font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    required
                    placeholder="50,000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-lg font-bold text-primary outline-none focus:border-accent"
                  />
                </div>

                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="h-4 w-4 rounded text-accent focus:ring-accent"
                  />
                  <span className="text-xs font-semibold text-gray-700">Price is Negotiable</span>
                </label>
              </div>

              {/* Location & Contact */}
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Location & Contact Preference
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">City / State *</label>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-medium outline-none focus:border-accent bg-white"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Buyer Contact Method
                    </label>
                    <select
                      value={contactPreference}
                      onChange={(e) => setContactPreference(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-medium outline-none focus:border-accent bg-white"
                    >
                      <option value="CHAT_AND_CALL">Both In-App Chat & Call</option>
                      <option value="CHAT_ONLY">In-App Chat Only (Keep Phone Hidden)</option>
                      <option value="CALL_ONLY">Call Only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  disabled={isPublishing || images.length === 0}
                  className="rounded-xl bg-sell px-8 py-3 text-sm font-extrabold text-primary shadow-lg hover:bg-sell-hover transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      <span>{isUploadingImages ? 'Uploading Photos...' : 'Publishing Ad...'}</span>
                    </>
                  ) : (
                    <span>Post Now</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 4 && createdAd && (
            <div className="text-center py-12 max-w-md mx-auto space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-primary">Your Ad is Live on OLX ORBIT!</h3>
              <p className="text-sm text-gray-500">
                Buyers in <strong>{createdAd.location?.name}</strong> can now view your listing and message you via real-time chat.
              </p>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
                <p className="font-bold text-sm text-primary truncate">{createdAd.title}</p>
                <p className="text-base font-black text-accent mt-0.5">₹ {Number(createdAd.price).toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400 mt-1">Status: <span className="font-bold text-emerald-600">ACTIVE</span></p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white hover:bg-primary-dark transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
      </main>
    </div>
  );
};
