/**
 * Image Utilities for Client-Side Inspection, Safe Scaling, and Cropping
 * Prevents IMAGE_DIMENSIONS_EXCEEDED errors (>5000x5000px limit on server)
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get natural dimensions of a file using an offscreen Image element
 */
export function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image "${file.name}" for dimension inspection`));
    };

    img.src = objectUrl;
  });
}

/**
 * Check if image exceeds server max dimension limit (default 5000px)
 */
export async function isImageExceedingMaxDimensions(file: File, maxDim = 5000): Promise<boolean> {
  try {
    const { width, height } = await getImageDimensions(file);
    return width > maxDim || height > maxDim;
  } catch {
    return false;
  }
}

/**
 * Crop a specific area from an image and export as an optimized File.
 * Guarantees output dimensions do not exceed maxOutputDim (default 2560px).
 */
export function cropImage(
  imageSource: HTMLImageElement,
  crop: CropArea,
  originalFile: File,
  maxOutputDim = 2560
): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      // Determine output dimensions (scaled down if crop exceeds maxOutputDim)
      let outWidth = crop.width;
      let outHeight = crop.height;

      if (outWidth > maxOutputDim || outHeight > maxOutputDim) {
        const scale = Math.min(maxOutputDim / outWidth, maxOutputDim / outHeight);
        outWidth = Math.round(outWidth * scale);
        outHeight = Math.round(outHeight * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, outWidth);
      canvas.height = Math.max(1, outHeight);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas 2D context not available'));
      }

      // Smooth downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the cropped portion to canvas
      ctx.drawImage(
        imageSource,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const mimeType = originalFile.type === 'image/png' ? 'image/png' : 'image/webp';
      const outputExt = mimeType === 'image/png' ? '.png' : '.webp';
      const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
      const outputName = `${baseName}-cropped${outputExt}`;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Failed to create image blob from canvas'));
          }
          const croppedFile = new File([blob], outputName, {
            type: mimeType,
            lastModified: Date.now(),
          });
          resolve(croppedFile);
        },
        mimeType,
        0.92
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Automatically downscale an image if it exceeds max allowable dimensions (e.g. 5000px).
 * Preserves full image aspect ratio while ensuring width and height <= maxDim.
 */
export async function autoSafeScaleImage(file: File, maxDim = 4000): Promise<File> {
  try {
    const { width, height } = await getImageDimensions(file);

    // If within limits, keep original file
    if (width <= maxDim && height <= maxDim) {
      return file;
    }

    // Calculate proportional downscale ratio
    const scale = Math.min(maxDim / width, maxDim / height);
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // Fallback to original
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/webp';
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const outputName = `${baseName}-scaled.webp`;

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const scaledFile = new File([blob], outputName, {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve(scaledFile);
          },
          mimeType,
          0.92
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  } catch {
    return file;
  }
}

