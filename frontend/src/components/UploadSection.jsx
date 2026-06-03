import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api.js';
import { formatFileSize, prepareFilesForUpload } from '../utils/uploadBatches.js';
import '../styles/UploadSection.css';

const MAX_UPLOADS = 50;

const uploadFileBatch = async (files) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('worksheets', file);
  }
  const { data } = await axios.post(
    `${API_BASE_URL}/api/v1/grading/evaluate`,
    formData,
    { timeout: 120000 }
  );
  return data;
};

function UploadSection({ onGradingExecutionComplete }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const fileList = useMemo(() => Array.from(selectedFiles), [selectedFiles]);
  const previewFiles = fileList.slice(0, 6);
  const remainingFiles = Math.max(0, fileList.length - previewFiles.length);

  const executeFileSelectionInterception = (event) => {
    const nextFiles = Array.from(event.target.files || []).slice(0, MAX_UPLOADS);
    setSelectedFiles(nextFiles);
    setIsDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const nextFiles = Array.from(event.dataTransfer.files || [])
      .filter(file => file.type.startsWith('image/'))
      .slice(0, MAX_UPLOADS);

    setSelectedFiles(nextFiles);
    setIsDragActive(false);
  };

  const dispatchBatchUploadPipeline = async () => {
    if (fileList.length === 0) {
      window.alert('Please add at least one worksheet image before processing.');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(null);

    try {
      const batches = await prepareFilesForUpload(fileList);
      const allResults = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        setUploadProgress({ current: batchIndex + 1, total: batches.length });
        const batchResults = await uploadFileBatch(batches[batchIndex]);
        if (Array.isArray(batchResults)) {
          allResults.push(...batchResults);
        }
      }

      onGradingExecutionComplete(allResults);
      window.alert(
        batches.length > 1
          ? `Processing complete. ${fileList.length} worksheets graded one at a time. Results are ready in the dashboard.`
          : 'Processing complete. Results are ready in the dashboard.'
      );
    } catch (networkError) {
      console.error('API Upload Pipeline Failure:', networkError);
      const status = networkError.response?.status;
      if (status === 413) {
        window.alert('File too large. Try a smaller image or take a photo at lower resolution.');
      } else if (status === 504 || networkError.code === 'ECONNABORTED') {
        window.alert('Grading timed out. Try again with a smaller image.');
      } else if (networkError.message?.includes('must be under') || networkError.message?.includes('Could not')) {
        window.alert(networkError.message);
      } else {
        window.alert('Upload failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  return (
    <motion.section
      className="upload-section-shell"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="upload-grid">
        <div className="upload-main-card glass-panel">
          <div className="section-heading">
            <span className="eyebrow">Worksheet Upload</span>
            <h2>Upload tests in one elegant flow</h2>
            <p>
              Select handwritten worksheets, preview them instantly, and send them for grading in one clean step.
            </p>
          </div>

          <div
            className={`dropzone ${isDragActive ? 'active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
          >
            <input
              id="worksheet-upload"
              className="visually-hidden-input"
              type="file"
              multiple
              accept="image/*"
              onChange={executeFileSelectionInterception}
            />

            <label className="dropzone-content" htmlFor="worksheet-upload">
              <motion.div
                className="dropzone-orb"
                animate={{ scale: isDragActive ? 1.06 : 1, opacity: isDragActive ? 1 : 0.92 }}
                transition={{ type: 'spring', stiffness: 180, damping: 16 }}
              />
              <div className="dropzone-copy">
                <span className="upload-badge">Drag & Drop Ready</span>
                <h3>{isDragActive ? 'Release to stage your worksheets' : 'Drop files here or browse from your device'}</h3>
                <p>
                  Upload any number of worksheets. Each file is graded individually to work within server limits.
                </p>
              </div>
              <div className="dropzone-actions">
                <span className="ghost-button">Choose Files</span>
                <span className="helper-text">PNG, JPG, JPEG, WEBP</span>
              </div>
            </label>
          </div>

          <div className="selected-summary">
            <div>
              <span className="summary-value">{fileList.length}</span>
              <span className="summary-label">Selected files</span>
            </div>
          </div>

          <div className="file-grid">
            <AnimatePresence>
              {previewFiles.length > 0 ? previewFiles.map((file, index) => (
                <motion.div
                  key={`${file.name}-${file.lastModified}`}
                  className="file-pill"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="file-icon">⟡</div>
                  <div className="file-meta">
                    <strong>{file.name}</strong>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                </motion.div>
              )) : (
                <motion.div
                  className="empty-selection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span>No worksheets selected yet.</span>
                  <p>Once you add files, the upload deck will preview the first few and keep the rest organized behind the scenes.</p>
                </motion.div>
              )}
            </AnimatePresence>
            {remainingFiles > 0 && (
              <div className="more-files-pill">+{remainingFiles} more files</div>
            )}
          </div>
        </div>

      </div>

      <motion.button
        className="primary-upload-button standalone"
        onClick={dispatchBatchUploadPipeline}
        disabled={isProcessing}
        whileHover={{ scale: isProcessing ? 1 : 1.01 }}
        whileTap={{ scale: isProcessing ? 1 : 0.99 }}
      >
        <span>
          {isProcessing && uploadProgress
            ? `Grading file ${uploadProgress.current} of ${uploadProgress.total}…`
            : isProcessing
              ? 'Preparing upload…'
              : `Process ${fileList.length || 'selected'} worksheets`}
        </span>
        <span className="button-chevron">→</span>
      </motion.button>
    </motion.section>
  );
}

export default UploadSection;
