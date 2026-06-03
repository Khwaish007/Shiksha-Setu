// Vercel serverless: ~4.5 MB request body limit — use 1 file per request for reliability
export const VERCEL_MAX_PAYLOAD_BYTES = 3_500_000;
export const MAX_FILES_PER_BATCH = 1;

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Compress large images so uploads stay under Vercel limits and grade faster */
export const compressImageIfNeeded = async (file, maxBytes = 1_500_000) => {
  if (!file.type.startsWith('image/') || file.size <= maxBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxDimension = 1600;
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`Could not compress "${file.name}".`));
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }));
        },
        'image/jpeg',
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read "${file.name}".`));
    };

    img.src = objectUrl;
  });
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
