// Vercel serverless: ~4.5 MB request body limit
export const VERCEL_MAX_PAYLOAD_BYTES = 3_500_000;
// Small batches: faster than 1-at-a-time, safe under Vercel payload cap (override via VITE_UPLOAD_BATCH_SIZE)
export const MAX_FILES_PER_BATCH = Number(import.meta.env.VITE_UPLOAD_BATCH_SIZE) || 10;
// Target per file when a batch must squeeze many large files (batching splits by size automatically)
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

/** Phones often supply ".jpg" or an empty name from the camera roll */
export const ensureNamedFile = (file) => {
  const hasUsableName = file.name && file.name !== '.jpg' && file.name !== '.jpeg' && !file.name.startsWith('.');
  if (hasUsableName) {
    return file;
  }

  const extension = isHeicFile(file) ? 'heic' : 'jpg';
  return new File([file], `worksheet-${Date.now()}.${extension}`, {
    type: file.type || (extension === 'heic' ? 'image/heic' : 'image/jpeg'),
    lastModified: file.lastModified || Date.now(),
  });
};

const sniffFileFormat = async (file) => {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
  if (bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'webp';
  }

  const box = String.fromCharCode(bytes[4] || 0, bytes[5] || 0, bytes[6] || 0, bytes[7] || 0);
  if (box === 'ftyp') {
    const brand = String.fromCharCode(bytes[8] || 0, bytes[9] || 0, bytes[10] || 0, bytes[11] || 0);
    if (/heic|heix|hevc|mif1|msf1/i.test(brand)) return 'heic';
  }

  return 'unknown';
};

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

const bitmapToCanvas = (bitmap, maxDimension) => {
  const { width, height } = scaledDimensions(bitmap.width, bitmap.height, maxDimension);
  try {
    if (width === bitmap.width && height === bitmap.height) {
      return drawToCanvas(bitmap, width, height);
    }
    return drawToCanvas(bitmap, width, height);
  } finally {
    bitmap.close?.();
  }
};

const decodeViaCreateImageBitmap = async (file, maxDimension) => {
  const attempts = [
    () => createImageBitmap(file, {
      resizeWidth: maxDimension,
      resizeHeight: maxDimension,
      resizeQuality: 'high',
    }),
    () => createImageBitmap(file, {
      imageOrientation: 'from-image',
      resizeWidth: maxDimension,
      resizeHeight: maxDimension,
      resizeQuality: 'high',
    }),
    () => createImageBitmap(file, { imageOrientation: 'from-image' }),
    () => createImageBitmap(file),
  ];

  let lastError;
  for (const create of attempts) {
    try {
      const bitmap = await create();
      return bitmapToCanvas(bitmap, maxDimension);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('bitmap-decode-failed');
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

const convertHeicToJpegFile = async (file) => {
  const { default: heic2any } = await import('heic2any');
  const output = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.85,
  });
  const blob = Array.isArray(output) ? output[0] : output;
  return new File([blob], ensureNamedFile(file).name.replace(/\.\w+$/i, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
};

const decodeImageToCanvas = async (file, maxDimension) => {
  const sniffed = await sniffFileFormat(file);
  let sourceFile = file;

  if (sniffed === 'heic' || (sniffed === 'unknown' && isHeicFile(file))) {
    sourceFile = await convertHeicToJpegFile(file);
  }

  const decoders = [];
  if (typeof createImageBitmap === 'function') {
    decoders.push(() => decodeViaCreateImageBitmap(sourceFile, maxDimension));
  }
  decoders.push(() => decodeViaImageElement(sourceFile, maxDimension));
  decoders.push(() => decodeViaDataUrl(sourceFile, maxDimension));

  let lastError;
  for (const decode of decoders) {
    try {
      return await decode();
    } catch (error) {
      lastError = error;
    }
  }

  if (sniffed !== 'heic') {
    try {
      const converted = await convertHeicToJpegFile(file);
      return decodeViaCreateImageBitmap(converted, maxDimension);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('decode-failed');
};

const buildReadError = (file) => {
  if (isHeicFile(file)) {
    return new Error(
      `Could not read "${file.name || 'photo'}". iPhone HEIC photos may not work in this browser — set Camera → Formats → Most Compatible, or save as JPEG and try again.`
    );
  }

  return new Error(
    `Could not read "${file.name || 'photo'}". The photo may be too large for this browser — try lowering camera resolution, or upload from a laptop.`
  );
};

const compressToTarget = async (file, maxBytes) => {
  const namedFile = ensureNamedFile(file);

  try {
    const canvas = await decodeImageToCanvas(namedFile, MAX_DIMENSION);
    return await canvasToJpegFile(canvas, namedFile.name, maxBytes);
  } catch {
    if (namedFile.size <= VERCEL_MAX_PAYLOAD_BYTES) {
      return namedFile;
    }
    throw buildReadError(namedFile);
  }
};

/**
 * Only resize photos that exceed upload limits. Typical phone photos (1–3 MB) are sent as-is
 * so the browser never has to decode a full 12 MP image in memory.
 */
export const compressImageIfNeeded = async (file, maxBytes = VERCEL_MAX_PAYLOAD_BYTES) => {
  const namedFile = ensureNamedFile(file);

  if (!isImageFile(namedFile)) {
    return namedFile;
  }

  const sniffed = await sniffFileFormat(namedFile);
  const needsHeicConversion = sniffed === 'heic' || isHeicFile(namedFile);

  if (namedFile.size <= maxBytes) {
    if (needsHeicConversion) {
      return convertHeicToJpegFile(namedFile);
    }
    return namedFile;
  }

  return compressToTarget(namedFile, maxBytes);
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
  const compressed = await Promise.all(
    files.map((file) => compressImageIfNeeded(file, VERCEL_MAX_PAYLOAD_BYTES))
  );
  return chunkFilesForUpload(compressed);
};
