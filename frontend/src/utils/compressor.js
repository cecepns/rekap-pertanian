import Compressor from 'compressorjs';

/**
 * Compress an image file using CompressorJS to ensure size <= 500KB
 * @param {File|Blob} file The input image file
 * @param {Object} options Optional custom settings
 * @returns {Promise<{file: File, previewUrl: string, originalSize: number, compressedSize: number, savedPercent: number}>}
 */
export const compressImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('File yang dipilih bukan gambar yang valid'));
    }

    const targetMaxSize = options.maxSizeKB || 500; // max 500kb as requested
    const originalSize = file.size;

    // If file is already small (e.g. <= 300KB), compression might still normalize it
    const initialQuality = originalSize > 2 * 1024 * 1024 ? 0.7 : 0.8;

    new Compressor(file, {
      quality: options.quality || initialQuality,
      maxWidth: options.maxWidth || 1600,
      maxHeight: options.maxHeight || 1600,
      mimeType: 'image/jpeg',
      convertSize: 500000,
      success(result) {
        // If result is still over 500KB, perform a second pass with lower quality
        if (result.size > targetMaxSize * 1024 && (!options.retryCount || options.retryCount < 2)) {
          new Compressor(result, {
            quality: 0.55,
            maxWidth: 1200,
            maxHeight: 1200,
            mimeType: 'image/jpeg',
            success(secondPass) {
              const finalFile = new File([secondPass], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve({
                file: finalFile,
                previewUrl: URL.createObjectURL(finalFile),
                originalSize,
                compressedSize: finalFile.size,
                savedPercent: Math.round(((originalSize - finalFile.size) / originalSize) * 100),
              });
            },
            error(err) {
              reject(err);
            },
          });
        } else {
          const finalFile = new File([result], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve({
            file: finalFile,
            previewUrl: URL.createObjectURL(finalFile),
            originalSize,
            compressedSize: finalFile.size,
            savedPercent: Math.max(0, Math.round(((originalSize - finalFile.size) / originalSize) * 100)),
          });
        }
      },
      error(err) {
        console.error('CompressorJS Error:', err);
        reject(err);
      },
    });
  });
};

/**
 * Format bytes to readable string (e.g. 350 KB, 1.2 MB)
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
