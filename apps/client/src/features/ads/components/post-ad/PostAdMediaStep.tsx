import React, { useRef } from 'react';
import { Camera, Trash2, Upload, Star } from 'lucide-react';

export interface ImageUploadItem {
  file: File;
  previewUrl: string;
  isCover: boolean;
}

interface PostAdMediaStepProps {
  images: ImageUploadItem[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveImage: (index: number) => void;
  onSetCoverImage: (index: number) => void;
  isDragOver: boolean;
  setIsDragOver: (over: boolean) => void;
}

export const PostAdMediaStep: React.FC<PostAdMediaStepProps> = ({
  images,
  onAddFiles,
  onRemoveImage,
  onSetCoverImage,
  isDragOver,
  setIsDragOver,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-[#002f34] flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-teal-700" />
          <span>Upload Photos ({images.length}/8)</span>
        </label>
        <span className="text-[11px] text-gray-400">PNG, JPG, WebP up to 10MB</span>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files) onAddFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
          isDragOver
            ? 'border-teal-700 bg-teal-50/50'
            : 'border-gray-300 hover:border-teal-700 bg-gray-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onAddFiles(e.target.files);
          }}
        />
        <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-800">
            Click to upload or drag & drop images
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            The first photo will be used as the listing cover photo
          </p>
        </div>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {images.map((item, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-100"
            >
              <img
                src={item.previewUrl}
                alt=""
                className="w-full h-full object-cover"
              />

              {/* Cover Photo Badge */}
              {item.isCover ? (
                <span className="absolute top-1.5 left-1.5 bg-[#002f34] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  <span>Cover</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetCoverImage(idx)}
                  className="absolute top-1.5 left-1.5 bg-black/60 hover:bg-black/80 text-white text-[9px] font-medium px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                  Set Cover
                </button>
              )}

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => onRemoveImage(idx)}
                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-rose-600 text-white p-1 rounded-full transition opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

