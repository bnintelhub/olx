import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Star, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface SellImageItem {
  file: File;
  previewUrl: string;
  isCover: boolean;
}

interface SellMediaStepProps {
  images: SellImageItem[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveImage: (index: number) => void;
  onSetCoverImage: (index: number) => void;
}

export const SellMediaStep: React.FC<SellMediaStepProps> = ({
  images,
  onAddFiles,
  onRemoveImage,
  onSetCoverImage,
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
          High-quality photos from multiple angles get up to 5x more buyer responses. Upload up to 8 photos.
        </p>
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
          Click to upload or drag & drop images
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Supported formats: JPEG, PNG, WebP (Max 8 photos, up to 10MB each)
        </p>
      </div>

      {/* Uploaded Photos Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span>Uploaded Photos ({images.length}/8)</span>
            <span className="text-[11px] text-gray-400">The first photo will be used as the cover photo</span>
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
                  <span className="absolute top-2 left-2 bg-[#002f34] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                    Cover Photo
                  </span>
                )}

                {/* Action Overlays */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!item.isCover && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetCoverImage(index);
                      }}
                      className="p-1.5 rounded-lg bg-white/90 text-gray-800 hover:bg-white text-xs font-semibold flex items-center gap-1 shadow cursor-pointer"
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

