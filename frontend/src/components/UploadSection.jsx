import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import axios from 'axios';
import '../styles/UploadSection.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const MAX_UPLOADS = 50;

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function UploadSection({ onGradingExecutionComplete }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
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

    const multipartFormPayload = new FormData();
    for (let index = 0; index < fileList.length; index++) {
      multipartFormPayload.append('worksheets', fileList[index]);
    }

    setIsProcessing(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/grading/evaluate`,
        multipartFormPayload, 
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      onGradingExecutionComplete(response.data);
      window.alert('Processing complete. Results are ready in the dashboard.');
    } catch (networkError) {
      console.error("API Upload Pipeline Failure:", networkError);
      window.alert('Upload failed. Please try again.');
    } finally {
      setIsProcessing(false);
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
                  Accepts image files only. You can upload any number of worksheets at once.
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
        <span>{isProcessing ? 'Uploading…' : `Process ${fileList.length || 'selected'} worksheets`}</span>
        <span className="button-chevron">→</span>
      </motion.button>
    </motion.section>
  );
}

export default UploadSection;