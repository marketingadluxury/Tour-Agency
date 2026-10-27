/**
 * Utilities for automatic client-side image compression
 * Compress images to under 1MB (max 1920px resolution) before uploading
 */

export interface CompressionOptions {
  maxDimension?: number; // Maximum width or height in pixels (default 1920px)
  maxSizeBytes?: number; // Target max file size in bytes (default 1MB = 1000 * 1024 bytes)
  initialQuality?: number; // Compression quality 0.0 - 1.0 (default 0.82)
  outputType?: string; // e.g. 'image/jpeg' or 'image/webp'
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxDimension = 1920,
    maxSizeBytes = 1024 * 1024, // 1MB
    initialQuality = 0.82,
    outputType = 'image/jpeg'
  } = options;

  // If file is not an image or is already small (< 500KB), return as is
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If file is already smaller than maxSizeBytes, perform light resize/compression only if huge pixel dimensions
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = async () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions respecting aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Iteratively compress until size < maxSizeBytes or quality limit reached
        let currentQuality = initialQuality;
        let blob: Blob | null = null;

        while (currentQuality >= 0.4) {
          blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob((b) => res(b), outputType, currentQuality)
          );

          if (blob && blob.size <= maxSizeBytes) {
            break;
          }

          currentQuality -= 0.1;
        }

        if (!blob) {
          resolve(file);
          return;
        }

        // Preserve original file name, append .jpg if necessary
        let newFileName = file.name;
        if (!/\.(jpg|jpeg|png|webp)$/i.test(newFileName)) {
          newFileName += '.jpg';
        } else {
          newFileName = newFileName.replace(/\.(png|webp)$/i, '.jpg');
        }

        const compressedFile = new File([blob], newFileName, {
          type: outputType,
          lastModified: Date.now()
        });

        console.log(
          `[ImageCompress] Original: ${(file.size / 1024 / 1024).toFixed(2)}MB -> Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${width}x${height}px)`
        );

        resolve(compressedFile);
      };

      img.onerror = () => {
        resolve(file);
      };
    };

    reader.onerror = () => {
      resolve(file);
    };
  });
}
