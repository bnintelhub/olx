import sharp from 'sharp';

// Focal point detection using edge saliency and contrast centroid
export async function detectFocalPoint(
  imagePath: string,
  _width: number,
  _height: number
): Promise<{ x: number; y: number }> {
  try {
    const { data, info } = await sharp(imagePath, { limitInputPixels: 64000000 })
      .rotate()
      .resize(64, 64, { fit: 'fill', fastShrinkOnLoad: true })
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;
    const w = info.width;
    const h = info.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const val = data[y * w + x];
        if (val > 20) {
          const weight = val * val;
          sumX += x * weight;
          sumY += y * weight;
          totalWeight += weight;
        }
      }
    }

    if (totalWeight < 1000) {
      return { x: 0.5, y: 0.5 };
    }

    const focalX = Math.min(Math.max(sumX / totalWeight / w, 0.05), 0.95);
    const focalY = Math.min(Math.max(sumY / totalWeight / h, 0.05), 0.95);

    return {
      x: Math.round(focalX * 1000) / 1000,
      y: Math.round(focalY * 1000) / 1000,
    };
  } catch {
    return { x: 0.5, y: 0.5 };
  }
}

// Calculates crop window anchored to focal point
export function calculateCropWindow(
  srcW: number,
  srcH: number,
  targetAspect: number,
  focal: { x: number; y: number }
): { left: number; top: number; width: number; height: number } {
  // Edge-case guard against zero, negative, or NaN dimensions
  if (!srcW || !srcH || srcW <= 0 || srcH <= 0 || isNaN(srcW) || isNaN(srcH)) {
    return { left: 0, top: 0, width: Math.max(1, srcW || 1), height: Math.max(1, srcH || 1) };
  }

  const srcAspect = srcW / srcH;
  let cropW = srcW;
  let cropH = srcH;
  let left = 0;
  let top = 0;

  if (srcAspect > targetAspect) {
    cropH = srcH;
    cropW = Math.max(1, Math.round(srcH * targetAspect));
    const focalPxX = focal.x * srcW;
    left = Math.round(focalPxX - cropW / 2);
    left = Math.max(0, Math.min(srcW - cropW, left));
  } else if (srcAspect < targetAspect) {
    cropW = srcW;
    cropH = Math.max(1, Math.round(srcW / targetAspect));
    const focalPxY = focal.y * srcH;
    top = Math.round(focalPxY - cropH / 2);
    top = Math.max(0, Math.min(srcH - cropH, top));
  }

  return { left, top, width: cropW, height: cropH };
}
