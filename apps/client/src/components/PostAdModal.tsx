import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, ArrowLeft, MapPin, IndianRupee, AlertCircle } from 'lucide-react';
import { Category, LocationItem } from '../types';
import { categoriesService } from '../features/categories/service/categories.service';
import { locationsService } from '../features/locations/service/locations.service';
import { adsService } from '../features/ads/service/ads.service';
import { useAuthStore } from '../features/auth/stores/useAuthStore';
import { ADS_QUERY_KEYS } from '../features/ads/hook/useAdsQuery';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PostAdCategoryStep } from '@/features/ads/components/post-ad/PostAdCategoryStep';
import {
  PostAdDynamicFields,
  AttributeItem,
} from '@/features/ads/components/post-ad/PostAdDynamicFields';
import {
  PostAdMediaStep,
  ImageUploadItem,
} from '@/features/ads/components/post-ad/PostAdMediaStep';
import { PostAdSuccessStep } from '@/features/ads/components/post-ad/PostAdSuccessStep';

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

export const PostAdModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdCreated?: (newAd: any) => void;
}> = ({ isOpen, onClose, onAdCreated }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [step, setStep] = useState<number>(1);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(false);

  // Category selection
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryAttributes, setCategoryAttributes] = useState<AttributeItem[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  // Media
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Submission state
  const [isUploading, setIsUploading] = useState(false);
  const [createdAd, setCreatedAd] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

    setIsLoadingTaxonomy(true);
    Promise.all([
      categoriesService.getCategoriesTree().catch(() => []),
      locationsService.getCities().catch(() => []),
    ])
      .then(([tree, cities]) => {
        setCategoriesTree(tree);
        setLocations(cities);
        if (cities.length > 0 && !selectedLocationId) {
          setSelectedLocationId(cities[0].id);
        }
      })
      .finally(() => setIsLoadingTaxonomy(false));
  }, [isOpen]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [images]);

  const handleSelectLeafCategory = async (cat: Category) => {
    setSelectedCategory(cat);
    setFormError(null);
    setIsLoadingAttributes(true);

    try {
      const attributes = await categoriesService.getCategoryAttributes(cat.id);
      setCategoryAttributes(attributes || []);

      const defaults: Record<string, any> = {};
      (attributes || []).forEach((attr: AttributeItem) => {
        if (attr.type === 'BOOLEAN') defaults[attr.key] = false;
        else if (attr.type === 'MULTI_SELECT') defaults[attr.key] = [];
        else defaults[attr.key] = '';
      });
      setAttributeValues(defaults);
    } catch {
      setCategoryAttributes([]);
    } finally {
      setIsLoadingAttributes(false);
      setStep(2);
    }
  };

  const handleAddFiles = (filesList: FileList | File[]) => {
    const rawFiles = Array.from(filesList);
    const validFiles = rawFiles.filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(f.type)
    );

    if (validFiles.length === 0) {
      toast.error('Invalid image format (use JPEG, PNG, or WebP)');
      return;
    }

    if (images.length + validFiles.length > 8) {
      toast.error('Maximum 8 photos allowed');
      return;
    }

    const newItems: ImageUploadItem[] = validFiles.map((file, idx) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isCover: images.length === 0 && idx === 0,
    }));

    setImages((prev) => [...prev, ...newItems]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      if (removed?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      if (removed?.isCover && updated.length > 0) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  const handleSetCoverImage = (index: number) => {
    setImages((prev) =>
      prev.map((item, idx) => ({
        ...item,
        isCover: idx === index,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCategory) {
      setFormError('Please select a category for your classified listing.');
      return;
    }
    if (!title.trim() || title.trim().length < 5) {
      setFormError('Please provide a descriptive title (at least 5 characters).');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setFormError('Please provide a detailed description (at least 10 characters).');
      return;
    }
    const numPrice = Number(price);
    if (!price || isNaN(numPrice) || numPrice <= 0) {
      setFormError('Please enter a valid listing price.');
      return;
    }
    if (!selectedLocationId) {
      setFormError('Please select your city or locality location.');
      return;
    }
    if (images.length === 0) {
      setFormError('Please upload at least 1 photo of your item.');
      return;
    }

    // Validate required category attributes
    for (const attr of categoryAttributes) {
      if (attr.isRequired) {
        const val = attributeValues[attr.key];
        if (val === undefined || val === null || val === '') {
          setFormError(`Please fill in the required field "${attr.name}".`);
          return;
        }
      }
    }

    setIsUploading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: numPrice,
        isNegotiable,
        categoryId: selectedCategory.id,
        locationId: selectedLocationId,
        attributes: attributeValues,
      };

      const sortedImages = [...images].sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0));
      const imageFiles = sortedImages.map((img) => img.file);

      let uploadedImages: any[] = [];
      if (imageFiles.length > 0) {
        uploadedImages = await adsService.uploadImages(imageFiles);
      }

      const res = await adsService.createAd({
        ...payload,
        images: uploadedImages,
      });

      if (res) {
        setCreatedAd(res);
        setStep(3);
        queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
        if (onAdCreated) onAdCreated(res);
        toast.success('Your ad was published successfully!');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to publish classified ad.');
      toast.error('Failed to post ad');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition cursor-pointer mr-1"
                title="Change Category"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-[#002f34]">
                {step === 1
                  ? 'Choose a Category'
                  : step === 2
                  ? 'Include some details'
                  : 'Listing Published'}
              </h2>
              <p className="text-[11px] text-gray-400">
                {step === 1
                  ? 'Step 1 of 2: Select the taxonomy for your item'
                  : step === 2
                  ? `Category: ${selectedCategory?.name || 'Classified Item'}`
                  : 'Ready for buyers'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {step === 1 && (
            <PostAdCategoryStep
              categoriesTree={categoriesTree}
              categorySearch={categorySearch}
              onSearchChange={setCategorySearch}
              selectedParentCategory={selectedParentCategory}
              onSelectParentCategory={setSelectedParentCategory}
              onSelectLeafCategory={handleSelectLeafCategory}
              isLoadingTaxonomy={isLoadingTaxonomy}
              isLoadingAttributes={isLoadingAttributes}
            />
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Ad Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#002f34]">
                  Ad Title <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. iPhone 14 Pro Max 256GB Deep Purple"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={70}
                  className="h-10 text-xs rounded-xl"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Mention key features (brand, model, age, condition)</span>
                  <span>{title.length}/70</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#002f34]">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Include condition, reason for selling, accessories included, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={4000}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 bg-white"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Include details with honest condition</span>
                  <span>{description.length}/4000</span>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#002f34]">
                  Set a Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    ₹
                  </span>
                  <Input
                    type="number"
                    placeholder="e.g. 25000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="h-10 pl-8 text-xs rounded-xl"
                  />
                </div>
                {Number(price) > 0 && (
                  <p className="text-xs text-teal-800 font-medium">
                    {numberToIndianWords(Number(price))}
                  </p>
                )}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="rounded text-teal-700 focus:ring-0"
                  />
                  <span className="text-xs text-gray-600">Price is negotiable</span>
                </label>
              </div>

              {/* Dynamic Category Specifications */}
              <PostAdDynamicFields
                categoryAttributes={categoryAttributes}
                attributeValues={attributeValues}
                onAttributeChange={(key, val) =>
                  setAttributeValues((prev) => ({ ...prev, [key]: val }))
                }
                isLoading={isLoadingAttributes}
              />

              {/* Media Uploads */}
              <PostAdMediaStep
                images={images}
                onAddFiles={handleAddFiles}
                onRemoveImage={handleRemoveImage}
                onSetCoverImage={handleSetCoverImage}
                isDragOver={isDragOver}
                setIsDragOver={setIsDragOver}
              />

              {/* Location */}
              <div className="space-y-1.5 pt-3 border-t border-gray-100">
                <label className="text-xs font-bold uppercase tracking-wider text-[#002f34] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-700" />
                  <span>Confirm Your City <span className="text-rose-500">*</span></span>
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full h-10 text-xs border border-gray-200 rounded-xl px-3 bg-white focus:outline-none focus:border-teal-700"
                >
                  <option value="">Select your city</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isUploading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={isUploading}
                  className="font-bold px-6"
                >
                  {isUploading ? 'Publishing Ad...' : 'Post Now'}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <PostAdSuccessStep
              createdAd={createdAd}
              onViewAd={(adId) => navigate(`/ad/${adId}`)}
              onReset={() => {
                setStep(1);
                setTitle('');
                setDescription('');
                setPrice('');
                setImages([]);
                setCreatedAd(null);
              }}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
