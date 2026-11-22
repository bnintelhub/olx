import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  X,
  Check,
  RotateCcw,
  Crop as CropIcon,
  Maximize2,
  FastForward,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { cropImage, CropArea, getImageDimensions, ImageDimensions } from '@/lib/image-utils';

export type AspectRatioMode = '4:3' | '1:1' | '16:9' | '3:4' | 'free';

export interface ImageCropModalProps {
  isOpen: boolean;
  file: File | null;
  currentIndex?: number;
  totalQueue?: number;
  defaultRatio?: AspectRatioMode;
  onClose: () => void;
  onApply: (croppedFile: File, newPreviewUrl: string) => void;
  onSkip?: () => void;
  onSkipAll?: () => void;
  onRatioChange?: (ratio: AspectRatioMode) => void;
}

interface CropRect {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  width: number; // percentage 0..100
  height: number; // percentage 0..100
}

const RATIO_CONFIGS: Array<{
  mode: AspectRatioMode;
  label: string;
  badge?: string;
  targetRatio: number | null;
  desc: string;
}> = [
  { mode: '4:3', label: '4:3 Card', badge: 'Standard', targetRatio: 4 / 3, desc: 'Exact fit for OLX listing cards' },
  { mode: '16:9', label: '16:9 Wide', badge: 'Cars & Bikes', targetRatio: 16 / 9, desc: 'Best for vehicles and real estate' },
  { mode: '1:1', label: '1:1 Square', targetRatio: 1, desc: 'Product & gadget focus' },
  { mode: '3:4', label: '3:4 Portrait', targetRatio: 3 / 4, desc: 'Fashion, clothes & portraits' },
  { mode: 'free', label: 'Free Frame', targetRatio: null, desc: 'Any custom dimensions' },
];

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  file,
  currentIndex = 0,
  totalQueue = 1,
  defaultRatio = '4:3',
  onClose,
  onApply,
  onSkip,
  onSkipAll,
  onRatioChange,
}) => {
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>(defaultRatio);
  const [crop, setCrop] = useState<CropRect>({ x: 5, y: 5, width: 90, height: 90 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Active Drag State
  const dragRef = useRef<{
    type: 'move' | 'resize';
    handle?: string;
    startX: number;
    startY: number;
    startCrop: CropRect;
    imageRect: DOMRect;
  } | null>(null);

  const getNumericalRatio = useCallback((mode: AspectRatioMode): number | null => {
    switch (mode) {
      case '4:3':
        return 4 / 3;
      case '1:1':
        return 1;
      case '16:9':
        return 16 / 9;
      case '3:4':
        return 3 / 4;
      case 'free':
      default:
        return null;
    }
  }, []);

  // Calculate default crop box that maximizes coverage of the image without cutting off subjects
  const calculateMaxCrop = useCallback(
    (mode: AspectRatioMode, naturalW: number, naturalH: number): CropRect => {
      const targetRatio = getNumericalRatio(mode);
      if (!targetRatio || !naturalW || !naturalH) {
        return { x: 2, y: 2, width: 96, height: 96 };
      }

      const imgAspect = naturalW / naturalH;
      let widthPercent: number;
      let heightPercent: number;

      if (imgAspect >= targetRatio) {
        // Image is wider than target ratio: cover 96% height, scale width
        heightPercent = 96;
        widthPercent = Math.min(96, (heightPercent * targetRatio) / imgAspect);
      } else {
        // Image is taller than target ratio: cover 96% width, scale height
        widthPercent = 96;
        heightPercent = Math.min(96, (widthPercent * imgAspect) / targetRatio);
      }

      const x = Math.max(0, (100 - widthPercent) / 2);
      const y = Math.max(0, (100 - heightPercent) / 2);

      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        width: Number(widthPercent.toFixed(2)),
        height: Number(heightPercent.toFixed(2)),
      };
    },
    [getNumericalRatio]
  );

  // Sync default ratio prop if provided
  useEffect(() => {
    if (defaultRatio) {
      setAspectRatio(defaultRatio);
    }
  }, [defaultRatio]);

  // Load image file and inspect dimensions
  useEffect(() => {
    if (!isOpen || !file) {
      setImageUrl(null);
      setDimensions(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    getImageDimensions(file)
      .then((dims) => {
        setDimensions(dims);
        setCrop(calculateMaxCrop(aspectRatio, dims.width, dims.height));
      })
      .catch(() => setDimensions(null));

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, file, calculateMaxCrop, aspectRatio]);

  // Lock body scroll while modal is active
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

  // Handle aspect ratio preset selection
  const handleRatioSelect = (mode: AspectRatioMode) => {
    setAspectRatio(mode);
    onRatioChange?.(mode);
    if (dimensions) {
      setCrop(calculateMaxCrop(mode, dimensions.width, dimensions.height));
    }
  };

  // Reset to full maximum coverage
  const handleResetCrop = () => {
    if (dimensions) {
      setCrop(calculateMaxCrop(aspectRatio, dimensions.width, dimensions.height));
    }
  };

  // Drag & Resize Handlers (Pointer Event API for unified Mouse + Touch support)
  const handlePointerDown = (
    e: React.PointerEvent,
    actionType: 'move' | 'resize',
    handle?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();

    dragRef.current = {
      type: actionType,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
      imageRect: rect,
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current) return;
      const { type, handle, startX, startY, startCrop, imageRect } = dragRef.current;
      const { width: renderedW, height: renderedH } = imageRect;
      if (!renderedW || !renderedH) return;

      const dxPercent = ((e.clientX - startX) / renderedW) * 100;
      const dyPercent = ((e.clientY - startY) / renderedH) * 100;

      if (type === 'move') {
        const newX = Math.max(0, Math.min(100 - startCrop.width, startCrop.x + dxPercent));
        const newY = Math.max(0, Math.min(100 - startCrop.height, startCrop.y + dyPercent));
        setCrop((prev) => ({
          ...prev,
          x: Number(newX.toFixed(2)),
          y: Number(newY.toFixed(2)),
        }));
        return;
      }

      if (type === 'resize' && handle) {
        const targetRatio = getNumericalRatio(aspectRatio);
        // Ratio constraint factor: widthPercent = heightPercent * ratioFactor
        const ratioFactor = targetRatio ? targetRatio * (renderedH / renderedW) : null;

        let { x, y, width, height } = startCrop;

        if (handle === 'se') {
          let newW = Math.max(12, Math.min(100 - startCrop.x, startCrop.width + dxPercent));
          let newH = Math.max(12, Math.min(100 - startCrop.y, startCrop.height + dyPercent));
          if (ratioFactor) {
            if (newW / ratioFactor <= 100 - startCrop.y) {
              newH = newW / ratioFactor;
            } else {
              newH = 100 - startCrop.y;
              newW = newH * ratioFactor;
            }
          }
          width = newW;
          height = newH;
        } else if (handle === 'sw') {
          let newW = Math.max(12, Math.min(startCrop.x + startCrop.width, startCrop.width - dxPercent));
          let newH = Math.max(12, Math.min(100 - startCrop.y, startCrop.height + dyPercent));
          if (ratioFactor) {
            if (newW / ratioFactor <= 100 - startCrop.y) {
              newH = newW / ratioFactor;
            } else {
              newH = 100 - startCrop.y;
              newW = newH * ratioFactor;
            }
          }
          x = startCrop.x + (startCrop.width - newW);
          width = newW;
          height = newH;
        } else if (handle === 'ne') {
          let newW = Math.max(12, Math.min(100 - startCrop.x, startCrop.width + dxPercent));
          let newH = Math.max(12, Math.min(startCrop.y + startCrop.height, startCrop.height - dyPercent));
          if (ratioFactor) {
            if (newW / ratioFactor <= startCrop.y + startCrop.height) {
              newH = newW / ratioFactor;
            } else {
              newH = startCrop.y + startCrop.height;
              newW = newH * ratioFactor;
            }
          }
          y = startCrop.y + (startCrop.height - newH);
          width = newW;
          height = newH;
        } else if (handle === 'nw') {
          let newW = Math.max(12, Math.min(startCrop.x + startCrop.width, startCrop.width - dxPercent));
          let newH = Math.max(12, Math.min(startCrop.y + startCrop.height, startCrop.height - dyPercent));
          if (ratioFactor) {
            if (newW / ratioFactor <= startCrop.y + startCrop.height) {
              newH = newW / ratioFactor;
            } else {
              newH = startCrop.y + startCrop.height;
              newW = newH * ratioFactor;
            }
          }
          x = startCrop.x + (startCrop.width - newW);
          y = startCrop.y + (startCrop.height - newH);
          width = newW;
          height = newH;
        } else if (!ratioFactor) {
          // Free resizing on single edges
          if (handle === 'e') width = Math.max(12, Math.min(100 - startCrop.x, startCrop.width + dxPercent));
          if (handle === 's') height = Math.max(12, Math.min(100 - startCrop.y, startCrop.height + dyPercent));
          if (handle === 'w') {
            const newW = Math.max(12, Math.min(startCrop.x + startCrop.width, startCrop.width - dxPercent));
            x = startCrop.x + (startCrop.width - newW);
            width = newW;
          }
          if (handle === 'n') {
            const newH = Math.max(12, Math.min(startCrop.y + startCrop.height, startCrop.height - dyPercent));
            y = startCrop.y + (startCrop.height - newH);
            height = newH;
          }
        }

        // Keep inside bounds
        x = Math.max(0, Math.min(x, 100 - width));
        y = Math.max(0, Math.min(y, 100 - height));

        setCrop({
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          width: Number(width.toFixed(2)),
          height: Number(height.toFixed(2)),
        });
      }
    },
    [getNumericalRatio, aspectRatio]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove]);

  // Clean up pointer listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Execute Crop and Save
  const handleSaveCrop = async () => {
    if (!file || !imageRef.current || !dimensions) return;

    setIsProcessing(true);
    try {
      const img = imageRef.current;
      const naturalW = dimensions.width;
      const naturalH = dimensions.height;

      // Translate percentage crop coordinates to actual natural image pixels
      let cropX = Math.round((crop.x / 100) * naturalW);
      let cropY = Math.round((crop.y / 100) * naturalH);
      let cropW = Math.round((crop.width / 100) * naturalW);
      let cropH = Math.round((crop.height / 100) * naturalH);

      // Boundary safety checks
      cropX = Math.max(0, Math.min(cropX, naturalW - 10));
      cropY = Math.max(0, Math.min(cropY, naturalH - 10));
      cropW = Math.max(10, Math.min(cropW, naturalW - cropX));
      cropH = Math.max(10, Math.min(cropH, naturalH - cropY));

      const cropArea: CropArea = {
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
      };

      // Crop and export optimized WebP/PNG up to 2560px
      const croppedFile = await cropImage(img, cropArea, file, 2560);
      const previewUrl = URL.createObjectURL(croppedFile);

      onApply(croppedFile, previewUrl);
    } catch (err) {
      console.error('Failed to crop image:', err);
      toast.error('Could not crop this photo. Keeping original.');
      handleSkipCurrent();
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick skip this photo without cropping
  const handleSkipCurrent = () => {
    if (!file) return;
    if (onSkip) {
      onSkip();
    } else {
      const previewUrl = URL.createObjectURL(file);
      onApply(file, previewUrl);
    }
  };

  if (!isOpen || !file || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="p-3.5 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#002f34] text-white flex items-center justify-center shadow-xs">
              <CropIcon className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  Format & Dimension Selector
                </h3>
                {totalQueue > 1 && (
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">
                    Photo {currentIndex + 1} of {totalQueue}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Drag corners to frame your item</span>
                {dimensions && (
                  <span className="font-semibold text-slate-600 bg-slate-200/70 px-1.5 py-0.2 rounded text-[10px]">
                    {dimensions.width} × {dimensions.height} px
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                showPreview
                  ? 'bg-teal-50 text-teal-800 border border-teal-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Toggle Live Card & Carousel Preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Card Preview</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aspect Ratio Presets Bar */}
        <div className="px-3.5 sm:px-6 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-slate-500" />
              <span>Ratio:</span>
            </span>
            {RATIO_CONFIGS.map((item) => {
              const isSelected = aspectRatio === item.mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => handleRatioSelect(item.mode)}
                  className={`relative px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-[#002f34] text-white shadow-xs ring-2 ring-[#002f34]/30'
                      : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={item.desc}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                        isSelected
                          ? 'bg-teal-400/25 text-teal-200'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleResetCrop}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0 font-medium"
            title="Expand to fit entire photo"
          >
            <Maximize2 className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Fit All</span>
          </button>
        </div>

        {/* Main Crop Viewport */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center p-4 min-h-[340px] max-h-[480px]">
          {/* Constrained Image Wrapper */}
          <div
            ref={imageContainerRef}
            className="relative inline-block max-w-full max-h-[440px] select-none touch-none"
          >
            {/* Base Image */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop target"
              draggable={false}
              className="block max-h-[420px] max-w-full w-auto h-auto object-contain pointer-events-none rounded-lg shadow-lg"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (!dimensions) {
                  const dims = { width: img.naturalWidth, height: img.naturalHeight };
                  setDimensions(dims);
                  setCrop(calculateMaxCrop(aspectRatio, dims.width, dims.height));
                }
              }}
            />

            {/* Dark Mask Overlay (Covering unselected parts) */}
            <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
              {/* Top curtain */}
              <div
                className="absolute left-0 right-0 top-0 bg-slate-950/70"
                style={{ height: `${crop.y}%` }}
              />
              {/* Bottom curtain */}
              <div
                className="absolute left-0 right-0 bottom-0 bg-slate-950/70"
                style={{ height: `${100 - (crop.y + crop.height)}%` }}
              />
              {/* Left curtain */}
              <div
                className="absolute left-0 bg-slate-950/70"
                style={{
                  top: `${crop.y}%`,
                  height: `${crop.height}%`,
                  width: `${crop.x}%`,
                }}
              />
              {/* Right curtain */}
              <div
                className="absolute right-0 bg-slate-950/70"
                style={{
                  top: `${crop.y}%`,
                  height: `${crop.height}%`,
                  width: `${100 - (crop.x + crop.width)}%`,
                }}
              />
            </div>

            {/* Interactive Resizable & Draggable Crop Frame */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.width}%`,
                height: `${crop.height}%`,
              }}
              className="absolute border-2 border-white/95 rounded-md cursor-move shadow-md select-none touch-none group ring-1 ring-black/40"
            >
              {/* Rule of Thirds Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div />
              </div>

              {/* 4 Sturdy Corner Resize Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'resize', 'nw')}
                className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-white border-2 border-[#002f34] shadow-md cursor-nw-resize flex items-center justify-center hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'resize', 'ne')}
                className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white border-2 border-[#002f34] shadow-md cursor-ne-resize flex items-center justify-center hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'resize', 'sw')}
                className="absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-full bg-white border-2 border-[#002f34] shadow-md cursor-sw-resize flex items-center justify-center hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'resize', 'se')}
                className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-white border-2 border-[#002f34] shadow-md cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform"
              />

              {/* 4 Edge Handles (For fine-tuning) */}
              {aspectRatio === 'free' && (
                <>
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'resize', 'n')}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 rounded-full bg-white/90 border border-slate-700 shadow-xs cursor-n-resize"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'resize', 's')}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 rounded-full bg-white/90 border border-slate-700 shadow-xs cursor-s-resize"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'resize', 'w')}
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 h-6 w-2.5 rounded-full bg-white/90 border border-slate-700 shadow-xs cursor-w-resize"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'resize', 'e')}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-6 w-2.5 rounded-full bg-white/90 border border-slate-700 shadow-xs cursor-e-resize"
                  />
                </>
              )}

              {/* Center Aspect Tag */}
              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none flex items-center gap-1 shadow">
                <span className="text-teal-300 font-extrabold">{aspectRatio}</span>
                <span className="text-gray-400">•</span>
                <span>Active Frame</span>
              </div>
            </div>
          </div>

          {/* Live Card & Carousel Preview Floating Card */}
          {showPreview && (
            <div className="absolute top-4 right-4 z-20 w-44 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                <span>Card Preview</span>
                <span className="text-[9px] bg-teal-100 text-teal-800 px-1 py-0.2 rounded font-bold">
                  4:3 Card
                </span>
              </div>

              {/* Mini Card simulation */}
              <div className="relative aspect-[4/3] w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-100 shadow-2xs">
                {imageUrl && (
                  <div
                    className="w-full h-full bg-no-repeat"
                    style={{
                      backgroundImage: `url(${imageUrl})`,
                      backgroundPosition: `${crop.x / (100 - crop.width || 1) * 100}% ${crop.y / (100 - crop.height || 1) * 100}%`,
                      backgroundSize: `${(100 / (crop.width || 1)) * 100}% ${(100 / (crop.height || 1)) * 100}%`,
                    }}
                  />
                )}
              </div>

              <p className="text-[10px] text-slate-500 text-center leading-tight">
                This photo will fit without getting stretched.
              </p>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="px-4 py-3 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetCrop}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Reset frame"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Skip current photo */}
            <button
              type="button"
              onClick={handleSkipCurrent}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Keep original dimensions without cropping"
            >
              Keep Original
            </button>

            {/* Skip all remaining if batch upload */}
            {totalQueue > 1 && currentIndex < totalQueue - 1 && onSkipAll && (
              <button
                type="button"
                onClick={onSkipAll}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 cursor-pointer"
                title="Add all remaining photos without cropping"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Add All As-Is</span>
              </button>
            )}

            {/* Primary Apply Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSaveCrop}
              className="px-5 py-2 text-xs font-bold text-white bg-[#002f34] hover:bg-teal-900 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-teal-300" />
              <span>
                {isProcessing
                  ? 'Processing...'
                  : totalQueue > 1 && currentIndex < totalQueue - 1
                  ? 'Apply & Next Photo'
                  : 'Apply Crop & Save'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
