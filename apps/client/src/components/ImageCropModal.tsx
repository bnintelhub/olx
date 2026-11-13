import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  AlertTriangle,
  Crop as CropIcon,
} from 'lucide-react';
import { cropImage, CropArea, getImageDimensions, ImageDimensions } from '@/lib/image-utils';

export interface ImageCropModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onApply: (croppedFile: File, newPreviewUrl: string) => void;
}

type AspectRatioMode = '4:3' | '1:1' | '16:9' | 'free';

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  file,
  onClose,
  onApply,
}) => {
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('4:3');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Load image file and inspect dimensions
  useEffect(() => {
    if (!isOpen || !file) {
      setImageUrl(null);
      setDimensions(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    getImageDimensions(file)
      .then((dims) => setDimensions(dims))
      .catch(() => setDimensions(null));

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, file]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset viewport
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setAspectRatio('4:3');
  };

  // Drag to pan image (adjust focal point)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(3, Math.max(1, newZoom));
    setZoom(Number(clamped.toFixed(2)));
  };

  // Calculate Crop Box size within the preview container based on selected aspect ratio
  const getCropBoxSize = () => {
    // Standard crop box dimensions in preview viewport
    const baseW = 360;
    switch (aspectRatio) {
      case '1:1':
        return { width: 320, height: 320 };
      case '16:9':
        return { width: 360, height: 202 };
      case '4:3':
      default:
        return { width: baseW, height: 270 };
      case 'free':
        return { width: 360, height: 270 };
    }
  };

  const cropBox = getCropBoxSize();

  // Perform crop on canvas and return cropped File
  const handleSaveCrop = async () => {
    if (!file || !imageRef.current || !dimensions) return;

    setIsProcessing(true);
    try {
      const img = imageRef.current;
      const naturalW = dimensions.width;
      const naturalH = dimensions.height;

      // Determine the rendered image dimensions inside the container
      const rect = img.getBoundingClientRect();
      const renderedW = rect.width;
      const renderedH = rect.height;

      // Scale factor between rendered image and original natural image
      const scaleX = naturalW / (renderedW || 1);
      const scaleY = naturalH / (renderedH || 1);

      // The crop box is centered in the container
      const container = containerRef.current;
      if (!container) return;

      const contRect = container.getBoundingClientRect();
      const cropCenterX = contRect.left + contRect.width / 2;
      const cropCenterY = contRect.top + contRect.height / 2;

      // Top-left of crop box relative to rendered image
      const cropLeftInRendered = cropCenterX - cropBox.width / 2 - rect.left;
      const cropTopInRendered = cropCenterY - cropBox.height / 2 - rect.top;

      // Translate to natural pixels
      let cropX = Math.round(cropLeftInRendered * scaleX);
      let cropY = Math.round(cropTopInRendered * scaleY);
      let cropW = Math.round(cropBox.width * scaleX);
      let cropH = Math.round(cropBox.height * scaleY);

      // Bounds clamping
      cropX = Math.max(0, Math.min(cropX, naturalW - 10));
      cropY = Math.max(0, Math.min(cropY, naturalH - 10));
      cropW = Math.min(cropW, naturalW - cropX);
      cropH = Math.min(cropH, naturalH - cropY);

      // Fallback if dimensions collapsed
      if (cropW <= 0) cropW = naturalW;
      if (cropH <= 0) cropH = naturalH;

      const cropArea: CropArea = {
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
      };

      // Crop and scale to safe dimensions (<= 2560px)
      const croppedFile = await cropImage(img, cropArea, file, 2560);
      const previewUrl = URL.createObjectURL(croppedFile);

      onApply(croppedFile, previewUrl);
      onClose();
    } catch (err) {
      console.error('Failed to crop image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !file || !imageUrl) return null;

  const isExceeded = dimensions && (dimensions.width > 5000 || dimensions.height > 5000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center shadow-xs">
              <CropIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Crop & Set Focal Point
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>Drag image to position the focal point inside the frame</span>
                {dimensions && (
                  <span className="font-semibold text-slate-700 bg-slate-200/70 px-1.5 py-0.2 rounded text-[10px]">
                    {dimensions.width} × {dimensions.height} px
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning if exceeded 5000px */}
        {isExceeded && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 flex items-center gap-2 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Image exceeds 5000px limit ({dimensions?.width}×{dimensions?.height}px). Cropping will safely scale it for fast loading.
            </span>
          </div>
        )}

        {/* Aspect Ratio Selector */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>Aspect Ratio:</span>
            {(['4:3', '1:1', '16:9', 'free'] as AspectRatioMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAspectRatio(mode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  aspectRatio === mode
                    ? 'bg-[#002f34] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {mode === '4:3' ? '4:3 (Ad Card)' : mode === '1:1' ? '1:1 Square' : mode === '16:9' ? '16:9 Wide' : 'Free'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition cursor-pointer shrink-0"
            title="Reset position and zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Interactive Viewport / Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative flex-1 bg-slate-900 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none min-h-[320px] max-h-[460px]"
        >
          {/* Scalable, Pannable Image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="To crop"
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="max-w-none max-h-[400px] object-contain pointer-events-none"
          />

          {/* Dark Vignette Overlay outside the Crop Box */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Active Crop Frame */}
            <div
              style={{
                width: `${cropBox.width}px`,
                height: `${cropBox.height}px`,
              }}
              className="relative border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] rounded-lg pointer-events-none transition-all duration-200"
            >
              {/* Rule of Thirds Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-white/25" />
                <div className="border-r border-white/25" />
                <div />
              </div>

              {/* Central Focal Point Reticle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 rounded-full border border-teal-400/80 bg-teal-500/20 flex items-center justify-center shadow-xs">
                  <Crosshair className="w-5 h-5 text-teal-300 drop-shadow" />
                </div>
              </div>

              {/* Focal Point Indicator Pill */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow pointer-events-none flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-teal-400" />
                <span>Primary Focal Center</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zoom & Control Bar */}
        <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-sm">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.2)}
              className="text-slate-500 hover:text-slate-800 cursor-pointer p-1"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full accent-[#002f34] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.2)}
              className="text-slate-500 hover:text-slate-800 cursor-pointer p-1"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 font-mono w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSaveCrop}
              className="px-4 py-2 text-xs font-bold text-white bg-[#002f34] hover:bg-teal-800 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Cropping...' : 'Apply & Save Crop'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

