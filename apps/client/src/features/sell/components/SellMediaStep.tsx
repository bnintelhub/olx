import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Star, Trash2, AlertCircle, Crop, Sparkles } from 'lucide-react';
import { AspectRatioMode } from '@/components/ImageCropModal';

export interface SellImageItem {
  file: File;
  previewUrl: string;
  isCover: boolean;
}

interface SellMediaStepProps {
  images: SellImageItem[];
  preferredRatio?: AspectRatioMode;
  onRatioChange?: (ratio: AspectRatioMode) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveImage: (index: number) => void;
  onSetCoverImage: (index: number) => void;
  onCropImage?: (index: number) => void;
}

const RATIO_PRESETS: Array<{ mode: AspectRatioMode; label: string; badge?: string; desc: string }> = [
  { mode: '4:3', label: '4:3 Standard', badge: 'Recommended', desc: 'Default for marketplace cards' },
  { mode: '1:1', label: '1:1 Square', desc: 'Square product focus' },
  { mode: '16:9', label: '16:9 Wide', desc: 'Vehicles & Real Estate' },
  { mode: '3:4', label: '3:4 Portrait', desc: 'Fashion & Clothing' },
  { mode: 'free', label: 'Free', desc: 'Original aspect' },
];

export const SellMediaStep: React.FC<SellMediaStepProps> = ({
  images,
  preferredRatio = '4:3',
  onRatioChange,
  onAddFiles,
  onRemoveImage,
  onSetCoverImage,
  onCropImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-lg font-black text-[#002f34] flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-teal-700" />
          <span>Upload Photos of Your Item</span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Upload up to 8 photos. Format photos to the same dimension for a clean, consistent listing.
        </p>
      </div>

      {/* Target Dimension / Format Selector */}
      <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#002f34] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Target Listing Format</span>
          </span>
          <span className="text-[11px] text-gray-400">
            Selected photos will open in this aspect ratio
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {RATIO_PRESETS.map((preset) => {
            const isSelected = preferredRatio === preset.mode;
            return (
              <button
                key={preset.mode}
                type="button"
                onClick={() => onRatioChange?.(preset.mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#002f34] text-white shadow-xs ring-2 ring-[#002f34]/30'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
                title={preset.desc}
              >
                <span>{preset.label}</span>
                {preset.badge && !isSelected && (
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-semibold">
                    ★ Best
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-teal-700 bg-teal-50/50 scale-[0.99]'
            : 'border-gray-300 hover:border-teal-700 bg-gray-50/40 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddFiles(e.target.files);
            }
          }}
        />

        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mb-3 shadow-2xs">
          <UploadCloud className="w-7 h-7" />
        </div>
        <div className="text-xs font-bold text-gray-800">
          Click to choose photos or drag & drop here
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Select photos to crop & frame in {preferredRatio} format (Max 8 photos, up to 10MB each)
        </p>
      </div>

      {/* Uploaded Photos Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span>Uploaded Photos ({images.length}/8)</span>
            <span className="text-[11px] text-gray-400">The first photo is your cover photo</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((item, index) => (
              <div
                key={index}
                className={`relative group rounded-xl overflow-hidden aspect-square border-2 transition ${
                  item.isCover ? 'border-teal-700 ring-2 ring-teal-700/20' : 'border-gray-200'
                }`}
              >
                <img
                  src={item.previewUrl}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (item.file && !target.dataset.fallback) {
                      target.dataset.fallback = 'true';
                      const reader = new FileReader();
                      reader.onload = () => { if (reader.result) target.src = reader.result as string; };
                      reader.readAsDataURL(item.file);
                    }
                  }}
                />

                {/* Cover Badge */}
                {item.isCover && (
                  <span className="absolute top-2 left-2 bg-[#002f34] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow z-10">
                    Cover Photo
                  </span>
                )}

                {/* Persistent Mobile-Friendly Crop Pill Button */}
                {onCropImage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCropImage(index);
                    }}
                    className="absolute bottom-2 left-2 bg-black/75 hover:bg-[#002f34] text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-xs shadow flex items-center gap-1 transition cursor-pointer z-10"
                    title="Crop & Adjust Dimension"
                  >
                    <Crop className="w-3 h-3 text-teal-300" />
                    <span>Crop</span>
                  </button>
                )}

                {/* Action Overlays on Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  {onCropImage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCropImage(index);
                      }}
                      className="p-1.5 rounded-lg bg-white/95 text-[#002f34] hover:bg-white text-xs font-semibold shadow cursor-pointer"
                      title="Crop & Set Focal Point"
                    >
                      <Crop className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!item.isCover && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetCoverImage(index);
                      }}
                      className="p-1.5 rounded-lg bg-white/95 text-gray-800 hover:bg-white text-xs font-semibold flex items-center gap-1 shadow cursor-pointer"
                      title="Set as Cover Photo"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(index);
                    }}
                    className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow cursor-pointer"
                    title="Remove Image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>At least 1 photo is required to publish your listing.</span>
        </div>
      )}
    </div>
  );
};
