// Vercel serverless: ~4.5 MB request body limit
export const VERCEL_MAX_PAYLOAD_BYTES = 3_500_000;
// Small batches: faster than 1-at-a-time, safe under Vercel payload cap (override via VITE_UPLOAD_BATCH_SIZE)
export const MAX_FILES_PER_BATCH = Number(import.meta.env.VITE_UPLOAD_BATCH_SIZE) || 10;
// Keep each compressed file smaller when batching so N files fit in one request
export const COMPRESS_TARGET_BYTES = Math.floor(VERCEL_MAX_PAYLOAD_BYTES / MAX_FILES_PER_BATCH * 0.85);

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const IMAGE_NAME_PATTERN = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i;

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (file) =>
  file.type?.startsWith('image/') || IMAGE_NAME_PATTERN.test(file.name);

const isHeicFile = (file) =>
  /heic|heif/i.test(file.type || '') || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);

const scaledDimensions = (width, height, maxDimension) => {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  if (width >= height) {
    return {
      width: maxDimension,
      height: Math.round((height / width) * maxDimension),
    };
  }
  return {
    width: Math.round((width / height) * maxDimension),
    height: maxDimension,
  };
};

const drawToCanvas = (source, width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(source, 0, 0, width, height);
  return canvas;
};

const canvasToJpegFile = (canvas, fileName, maxBytes) =>
  new Promise((resolve, reject) => {
    let quality = JPEG_QUALITY;
    let scale = 1;

    const attempt = () => {
      const targetWidth = Math.max(1, Math.round(canvas.width * scale));
      const targetHeight = Math.max(1, Math.round(canvas.height * scale));
      const targetCanvas =
        scale < 1 ? drawToCanvas(canvas, targetWidth, targetHeight) : canvas;

      targetCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`Could not compress "${fileName}".`));
            return;
          }

          if (blob.size <= maxBytes || (quality <= 0.45 && scale <= 0.5)) {
            resolve(
              new File([blob], fileName.replace(/\.\w+$/i, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
            );
            return;
          }

          if (quality > 0.5) {
            quality -= 0.08;
          } else {
            scale *= 0.85;
            quality = JPEG_QUALITY;
          }
          attempt();
        },
        'image/jpeg',
        quality
      );
    };

    attempt();
  });

const decodeViaCreateImageBitmap = async (file, maxDimension) => {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
    resizeWidth: maxDimension,
    resizeHeight: maxDimension,
    resizeQuality: 'high',
  });

  try {
    return drawToCanvas(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close?.();
  }
};

const decodeViaImageElement = (file, maxDimension) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = scaledDimensions(img.width, img.height, maxDimension);
      resolve(drawToCanvas(img, width, height));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image-element-decode-failed'));
    };

    img.src = objectUrl;
  });

const decodeViaDataUrl = (file, maxDimension) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const { width, height } = scaledDimensions(img.width, img.height, maxDimension);
        resolve(drawToCanvas(img, width, height));
      };

      img.onerror = () => reject(new Error('data-url-decode-failed'));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error('file-read-failed'));
    reader.readAsDataURL(file);
  });

const decodeImageToCanvas = async (file, maxDimension) => {
  const decoders = [];

  if (typeof createImageBitmap === 'function') {
    decoders.push(() => decodeViaCreateImageBitmap(file, maxDimension));
  }
  decoders.push(() => decodeViaImageElement(file, maxDimension));
  decoders.push(() => decodeViaDataUrl(file, maxDimension));

  let lastError;
  for (const decode of decoders) {
    try {
      return await decode();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('decode-failed');
};

const buildReadError = (file) => {
  if (isHeicFile(file)) {
    return new Error(
      `Could not read "${file.name}". iPhone HEIC photos may not work in this browser — set Camera → Formats → Most Compatible, or save as JPEG and try again.`
    );
  }

  return new Error(
    `Could not read "${file.name}". Try retaking the photo in good light, or use a smaller image (camera resolution can be lowered in phone settings).`
  );
};

/** Compress large images so uploads stay under Vercel limits and grade faster */
export const compressImageIfNeeded = async (file, maxBytes = COMPRESS_TARGET_BYTES) => {
  if (!isImageFile(file) || file.size <= maxBytes) {
    return file;
  }

  try {
    const canvas = await decodeImageToCanvas(file, MAX_DIMENSION);
    return await canvasToJpegFile(canvas, file.name, maxBytes);
  } catch {
    throw buildReadError(file);
  }
};

export const chunkFilesForUpload = (files) => {
  const batches = [];
  let currentBatch = [];
  let currentSize = 0;

  for (const file of files) {
    if (file.size > VERCEL_MAX_PAYLOAD_BYTES) {
      throw new Error(
        `"${file.name}" is ${formatFileSize(file.size)}. Each file must be under ${formatFileSize(VERCEL_MAX_PAYLOAD_BYTES)} after compression.`
      );
    }

    const wouldExceedSize = currentSize + file.size > VERCEL_MAX_PAYLOAD_BYTES;
    const wouldExceedCount = currentBatch.length >= MAX_FILES_PER_BATCH;

    if (currentBatch.length > 0 && (wouldExceedSize || wouldExceedCount)) {
      batches.push(currentBatch);
      currentBatch = [];
      currentSize = 0;
    }

    currentBatch.push(file);
    currentSize += file.size;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
};

export const prepareFilesForUpload = async (files) => {
  const compressed = await Promise.all(files.map((file) => compressImageIfNeeded(file)));
  return chunkFilesForUpload(compressed);
};
