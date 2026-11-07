import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Layers,
  FileText,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Category, LocationItem } from '@/types';
import { categoriesService } from '@/features/categories/service/categories.service';
import { locationsService } from '@/features/locations/service/locations.service';
import { adsService } from '@/features/ads/service/ads.service';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { ADS_QUERY_KEYS } from '@/features/ads/hook/useAdsQuery';
import { SellCategoryStep } from '../components/SellCategoryStep';
import { SellDetailsStep } from '../components/SellDetailsStep';
import { SellMediaStep, SellImageItem } from '../components/SellMediaStep';
import { SellPreviewStep } from '../components/SellPreviewStep';
import { SellSuccessStep } from '../components/SellSuccessStep';
import { PricingUpgradeModal } from '../components/PricingUpgradeModal';
import { SellHeaderBar } from '../components/SellHeaderBar';
import { AttributeItem } from '@/features/ads/components/post-ad/PostAdDynamicFields';

export const SellPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useAuthStore();

  const isPlanningParam = searchParams.has('planning') || searchParams.has('plans');
  const [showPricingModal, setShowPricingModal] = useState(isPlanningParam);

  useEffect(() => {
    if (isPlanningParam) {
      setShowPricingModal(true);
    }
  }, [isPlanningParam]);

  const openPricing = () => {
    setShowPricingModal(true);
    const next = new URLSearchParams(searchParams);
    if (!next.has('planning')) {
      const base = next.toString();
      navigate({ pathname: '/sell', search: base ? `?${base}&planning` : '?planning' }, { replace: true });
    }
  };

  const closePricing = () => {
    setShowPricingModal(false);
    const next = new URLSearchParams(searchParams);
    next.delete('planning');
    next.delete('plans');
    const rest = next.toString();
    navigate({ pathname: '/sell', search: rest ? `?${rest}` : '' }, { replace: true });
  };

  // Wizard Step (1: Category, 2: Details & Location, 3: Photos, 4: Preview, 5: Success)
  const [step, setStep] = useState<number>(1);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);

  // Taxonomy data
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Dynamic specifications
  const [categoryAttributes, setCategoryAttributes] = useState<AttributeItem[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [locality, setLocality] = useState('');

  // Media
  const [images, setImages] = useState<SellImageItem[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdAd, setCreatedAd] = useState<any | null>(null);
  const [quota, setQuota] = useState<any | null>(null);
  const [stagedImages, setStagedImages] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      apiClient.get('/revenue/quota').then((res) => {
        if (res.data?.success) setQuota(res.data.data);
      }).catch(() => {});
    }
  }, [user]);

  // Load Categories & Cities on mount
  useEffect(() => {
    setIsLoadingTaxonomy(true);
    Promise.all([categoriesService.getCategoriesTree().catch(() => []), locationsService.getCities().catch(() => [])])
      .then(([tree, cities]) => {
        setCategoriesTree(tree);
        const cityList = [...cities];
        if (!cityList.some((c) => c.slug === 'patna')) {
          cityList.unshift({ id: 'patna-city-id', name: 'Patna', slug: 'patna', type: 'CITY', latitude: 25.5941, longitude: 85.1376, isActive: true } as LocationItem);
        }
        setLocations(cityList);
        const queryLoc = searchParams.get('city');
        const matched = cityList.find((c) => c.slug === queryLoc);
        if (matched) setSelectedLocationId(matched.id);
        else if (cityList.length > 0) {
          const patnaCity = cityList.find((c) => c.slug === 'patna');
          setSelectedLocationId(patnaCity ? patnaCity.id : cityList[0].id);
        }
      })
      .finally(() => setIsLoadingTaxonomy(false));
  }, [searchParams]);

  // Clean up object URLs only when component unmounts
  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        if (img.previewUrl.startsWith('blob:')) try { URL.revokeObjectURL(img.previewUrl); } catch {}
      });
    };
  }, []);

  // Step 1: Select Category & Fetch Attributes
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Step 2: Details Validation
  const handleValidateDetails = () => {
    setFormError(null);
    if (!title.trim() || title.trim().length < 10) { setFormError('Ad title must be at least 10 characters.'); return false; }
    if (!description.trim() || description.trim().length < 20) { setFormError('Description must be at least 20 characters.'); return false; }
    const numPrice = Number(price);
    if (!price || isNaN(numPrice) || numPrice <= 0) { setFormError('Please enter a valid price in Rupees.'); return false; }
    if (!selectedLocationId) { setFormError('Please choose a city / location.'); return false; }

    for (const attr of categoryAttributes) {
      if (attr.isRequired && (attributeValues[attr.key] === undefined || attributeValues[attr.key] === '')) {
        setFormError(`Please provide the required specification: "${attr.name}".`);
        return false;
      }
    }

    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  // Step 3: Photos Management
  const handleAddFiles = (filesList: FileList | File[]) => {
    const valid = Array.from(filesList).filter((f) => ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(f.type));
    if (!valid.length) return toast.error('Invalid image format (use JPEG, PNG, or WebP)');
    if (images.length + valid.length > 8) return toast.error('Maximum 8 photos allowed');
    setStagedImages([]); // Reset staged uploads when images change

    const newItems: SellImageItem[] = valid.map((file, idx) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isCover: images.length === 0 && idx === 0,
    }));
    setImages((prev) => [...prev, ...newItems]);

    // Asynchronously update to base64 Data URLs so preview never breaks across re-renders
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) setImages((prev) => prev.map((item) => (item.file === file ? { ...item, previewUrl: reader.result as string } : item)));
      };
      reader.readAsDataURL(file);
    });
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

  // Step 4: Final Submit to POST /ads
  const handleFinalSubmit = async () => {
    if (!user) {
      openAuthModal(() => handleFinalSubmit());
      return;
    }

    if (images.length === 0) {
      setFormError('Please upload at least 1 photo.');
      return;
    }

    // Fail-Fast: Prevent uploading files if quota is already exhausted
    if (quota?.isLimitReached) {
      openPricing();
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const sortedImages = [...images].sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0));
      const imageFiles = sortedImages.map((img) => img.file);

      // Resolve location ID to real DB ID or slug
      let finalLocationId = selectedLocationId;
      if (finalLocationId === 'patna-city-id') {
        const realPatna = locations.find((l) => l.slug === 'patna' && l.id !== 'patna-city-id');
        finalLocationId = realPatna ? realPatna.id : (locations[0]?.id && locations[0]?.id !== 'patna-city-id' ? locations[0].id : 'patna');
      }

      // Re-use staged media if available; only upload fresh files once
      let uploadedImages = stagedImages;
      if (uploadedImages.length === 0 && imageFiles.length > 0) {
        const rawUploaded = await adsService.uploadImages(imageFiles);
        if (Array.isArray(rawUploaded) && rawUploaded.length > 0) {
          uploadedImages = rawUploaded.map((up, idx) => ({
            mediaId: up.mediaId,
            url: up.url || up.displayUrl,
            sortOrder: idx,
            isCover: idx === 0 || sortedImages[idx]?.isCover || false,
          }));
          setStagedImages(uploadedImages);
        }
      }

      if (uploadedImages.length === 0 && imageFiles.length > 0) {
        throw new Error('Image upload failed. Please verify your files and try again.');
      }

      // Create listing
      const res = await adsService.createAd({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        isNegotiable,
        categoryId: selectedCategory!.id,
        locationId: finalLocationId,
        attributes: attributeValues,
        images: uploadedImages,
      });

      if (res) {
        setCreatedAd(res);
        setStep(5);
        queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
        toast.success('Your ad was submitted successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || 'Failed to publish listing.';
      if (status === 402 || msg.toLowerCase().includes('limit reached')) {
        openPricing();
      }
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    images.forEach((img) => { if (img.previewUrl.startsWith('blob:')) URL.revokeObjectURL(img.previewUrl); });
    setStep(1);
    setSelectedParentCategory(null);
    setSelectedCategory(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setIsNegotiable(true);
    setImages([]);
    setStagedImages([]);
    setAttributeValues({});
    setCategoryAttributes([]);
    setFormError(null);
    setCreatedAd(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  return (
    <div className="min-h-screen bg-[#F5F7F8] py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <SellHeaderBar
          step={step}
          onBack={() => {
            if (step > 1 && step < 5) setStep(step - 1);
            else navigate('/');
          }}
          quota={quota}
          onOpenPlans={openPricing}
        />

        {/* Wizard Steps Navigation (Visible in steps 1-4) */}
        {step < 5 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {['Category', 'Details & Location', 'Photos', 'Preview'].map((label, idx) => (
                <div key={label} className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl font-bold ${step === idx + 1 ? 'bg-teal-50 text-teal-900 border border-teal-200' : 'text-gray-400'}`}>
                  <span className="w-5 h-5 rounded-full bg-teal-800 text-white text-[10px] flex items-center justify-center">{idx + 1}</span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Notification */}
        {formError && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{formError}</span>
          </div>
        )}

        {/* Wizard Step Content */}
        <div className="bg-white rounded-2xl p-4 sm:p-8 border border-gray-200 shadow-sm">
          {step === 1 && (
            <SellCategoryStep
              categoriesTree={categoriesTree}
              searchQuery={categorySearch}
              onSearchChange={setCategorySearch}
              selectedParentCategory={selectedParentCategory}
              onSelectParentCategory={setSelectedParentCategory}
              selectedCategory={selectedCategory}
              onSelectLeafCategory={handleSelectLeafCategory}
              isLoading={isLoadingTaxonomy}
            />
          )}

          {step === 2 && selectedCategory && (
            <div className="space-y-6">
              <SellDetailsStep
                category={selectedCategory}
                title={title}
                onTitleChange={setTitle}
                description={description}
                onDescriptionChange={setDescription}
                price={price}
                onPriceChange={setPrice}
                isNegotiable={isNegotiable}
                onNegotiableChange={setIsNegotiable}
                locations={locations}
                selectedLocationId={selectedLocationId}
                onLocationChange={setSelectedLocationId}
                locality={locality}
                onLocalityChange={setLocality}
                categoryAttributes={categoryAttributes}
                attributeValues={attributeValues}
                onAttributeChange={(key, val) =>
                  setAttributeValues((prev) => ({ ...prev, [key]: val }))
                }
                isLoadingAttributes={isLoadingAttributes}
              />
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="text-xs font-bold h-10 px-5 gap-1.5 cursor-pointer rounded-xl">
                  <ArrowLeft className="w-3.5 h-3.5" /><span>Change Category</span>
                </Button>
                <Button type="button" onClick={handleValidateDetails} className="bg-[#002f34] hover:bg-[#003d44] text-white text-xs font-bold h-10 px-6 gap-2 rounded-xl cursor-pointer">
                  <span>Continue to Photos</span><ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <SellMediaStep images={images} onAddFiles={handleAddFiles} onRemoveImage={handleRemoveImage} onSetCoverImage={handleSetCoverImage} />
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="text-xs font-bold h-10 px-5 gap-1.5 cursor-pointer rounded-xl">
                  <ArrowLeft className="w-3.5 h-3.5" /><span>Back to Details</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (images.length === 0) { setFormError('Please upload at least 1 photo.'); return; }
                    setFormError(null); setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-[#002f34] hover:bg-[#003d44] text-white text-xs font-bold h-10 px-6 gap-2 rounded-xl cursor-pointer"
                >
                  <span>Review Preview</span><ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && selectedCategory && (
            <SellPreviewStep
              category={selectedCategory}
              title={title}
              description={description}
              price={Number(price) || 0}
              isNegotiable={isNegotiable}
              location={selectedLocation}
              locality={locality}
              categoryAttributes={categoryAttributes}
              attributeValues={attributeValues}
              images={images}
              onBack={() => setStep(3)}
              onSubmit={handleFinalSubmit}
              isSubmitting={isSubmitting}
              sellerName={user?.profile?.name || user?.email || user?.phoneNumber || 'Classifieds Member'}
            />
          )}

          {step === 5 && (
            <SellSuccessStep
              createdAd={createdAd}
              onPostAnother={handleResetForm}
            />
          )}
        </div>
      </div>

      {/* Monetization / Extra Listings Upgrade Dialog */}
      <PricingUpgradeModal
        isOpen={showPricingModal}
        onClose={closePricing}
        quota={quota}
        onPaymentSuccess={(updatedQuota) => {
          setQuota(updatedQuota);
        }}
      />
    </div>
  );
};
