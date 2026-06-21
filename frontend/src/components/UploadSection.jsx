import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api.js';
import { analyticsAPI } from '../api/analyticsAPI.js';
import { formatFileSize, prepareFilesForUpload } from '../utils/uploadBatches.js';
import GradingNoticeModal from './GradingNoticeModal.jsx';
import '../styles/UploadSection.css';

const MAX_UPLOADS = 50;

const uploadFileBatch = async (files, sessionId) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('worksheets', file);
  }
  const { data } = await axios.post(
    `${API_BASE}/sessions/${sessionId}/evaluate`,
    formData,
    { timeout: 120000 }
  );
  return data;
};

const renderAnswerKeyText = (answerKey) => (
  (answerKey?.questions || [])
    .map(question => `${question.questionNumber}: ${question.expectedAnswer}`)
    .join('\n')
);

function UploadSection({ sessionId, onGradingExecutionComplete }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [notice, setNotice] = useState(null);
  const [answerKey, setAnswerKey] = useState(null);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTranscribingKey, setIsTranscribingKey] = useState(false);
  const modelWorksheetInputRef = useRef(null);

  const fileList = useMemo(() => Array.from(selectedFiles), [selectedFiles]);
  const previewFiles = fileList.slice(0, 6);
  const remainingFiles = Math.max(0, fileList.length - previewFiles.length);
  const answerKeyCount = answerKey?.questions?.length || 0;
  const hasAnswerKey = answerKeyCount > 0;

  useEffect(() => {
    const fetchAnswerKey = async () => {
      if (!sessionId) return;
      try {
        const key = await analyticsAPI.getAnswerKey(sessionId);
        setAnswerKey(key);
        setAnswerKeyText(key?.rawText || renderAnswerKeyText(key));
      } catch (error) {
        console.error('Failed to load answer key:', error);
      }
    };

    fetchAnswerKey();
  }, [sessionId]);

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
      setNotice({
        type: 'error',
        title: 'No worksheets selected',
        message: 'Please add at least one worksheet image before processing.'
      });
      return;
    }

    if (!sessionId) {
      setNotice({
        type: 'error',
        title: 'Session still loading',
        message: 'Please wait a moment while your fresh grading session is prepared.'
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(null);

    try {
      const batches = await prepareFilesForUpload(fileList);
      const consolidatedResults = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        setUploadProgress({ current: batchIndex + 1, total: batches.length });
        const batchResults = await uploadFileBatch(batches[batchIndex], sessionId);
        consolidatedResults.push(...batchResults);
      }

      const manualReviewCount = consolidatedResults.filter(
        item => item.status === 'Manual Review Required'
      ).length;
      setNotice(manualReviewCount > 0
        ? {
            type: 'manual',
            count: manualReviewCount,
            detail: 'These files were not graded. They may be unclear, non-mathematical, incomplete, or outside the expected worksheet format.',
            complete: true,
            results: consolidatedResults
          }
        : {
            type: 'success',
            message: 'All selected worksheets were graded successfully. Click Got it to view the refreshed dashboard.',
            complete: true,
            results: consolidatedResults
          });
    } catch (networkError) {
      console.error('API Upload Pipeline Failure:', networkError);
      const status = networkError.response?.status;
      if (status === 413) {
        setNotice({
          type: 'error',
          title: 'File too large',
          message: 'Try a smaller image or take a photo at lower resolution.'
        });
      } else if (status === 504 || networkError.code === 'ECONNABORTED') {
        setNotice({
          type: 'error',
          title: 'Grading timed out',
          message: 'Try again with a smaller image or fewer worksheets.'
        });
      } else if (networkError.message?.includes('must be under') || networkError.message?.includes('Could not')) {
        setNotice({
          type: 'error',
          title: 'Upload could not be prepared',
          message: networkError.message
        });
      } else {
        setNotice({
          type: 'error',
          title: 'Upload failed',
          message: 'Please try again with clear worksheet images.'
        });
      }
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  const saveTypedAnswerKey = async () => {
    if (!sessionId) {
      setNotice({
        type: 'error',
        title: 'Session still loading',
        message: 'Please wait a moment before saving the answer key.'
      });
      return;
    }

    if (!answerKeyText.trim()) {
      setNotice({
        type: 'error',
        title: 'Answer key is empty',
        message: 'Add at least one answer, for example Q1: 42, before saving the key.'
      });
      return;
    }

    setIsSavingKey(true);
    try {
      const savedKey = await analyticsAPI.saveAnswerKey(sessionId, answerKeyText);
      setAnswerKey(savedKey);
      setAnswerKeyText(savedKey.rawText || renderAnswerKeyText(savedKey));
      setNotice({
        type: 'success',
        message: `Answer key saved with ${savedKey.questions?.length || 0} questions. Future grading in this session will use it as ground truth.`
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Answer key not saved',
        message: error.response?.data?.error || 'Please check the key format and try again.'
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  const transcribeModelWorksheet = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!sessionId) {
      setNotice({
        type: 'error',
        title: 'Session still loading',
        message: 'Please wait a moment before uploading the model worksheet.'
      });
      return;
    }

    setIsTranscribingKey(true);
    try {
      const result = await analyticsAPI.transcribeAnswerKey(sessionId, file);
      if (result.status === 'Manual Review Required') {
        setNotice({
          type: 'manual',
          detail: result.message || result.errorSummary
        });
        return;
      }

      setAnswerKey(result.answerKey);
      setAnswerKeyText(result.answerKey?.rawText || renderAnswerKeyText(result.answerKey));
      setNotice({
        type: 'success',
        message: `Model worksheet transcribed into ${result.answerKey?.questions?.length || 0} answers. Review it once before grading.`
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Model worksheet not transcribed',
        message: error.response?.data?.error || 'Please try again with a clearer filled model worksheet.'
      });
    } finally {
      setIsTranscribingKey(false);
      if (modelWorksheetInputRef.current) modelWorksheetInputRef.current.value = '';
    }
  };

  const clearAnswerKey = async () => {
    if (!sessionId) return;

    setIsSavingKey(true);
    try {
      const cleared = await analyticsAPI.clearAnswerKey(sessionId);
      setAnswerKey(cleared);
      setAnswerKeyText('');
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Answer key not cleared',
        message: error.response?.data?.error || 'Please try again.'
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  const closeNotice = () => {
    const shouldComplete = notice?.complete;
    const results = notice?.results;
    setNotice(null);
    if (shouldComplete) {
      onGradingExecutionComplete(results);
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
        <div className="answer-key-card glass-panel">
          <div className="answer-key-header">
            <div>
              <span className="eyebrow">Teacher Answer Key</span>
              <h2>Set the ground truth before grading</h2>
              <p>
                Paste answers manually or upload one filled model worksheet. Claude will grade this session against the saved key instead of guessing.
              </p>
            </div>
            <div className={`answer-key-status ${hasAnswerKey ? 'ready' : 'empty'}`}>
              <strong>{answerKeyCount}</strong>
              <span>{hasAnswerKey ? 'answers ready' : 'no key yet'}</span>
            </div>
          </div>

          <div className="answer-key-editor">
            <textarea
              value={answerKeyText}
              onChange={(event) => setAnswerKeyText(event.target.value)}
              placeholder={'Q1: 42\nQ2: x = 7\nQ3: Area = 154 cm^2'}
              disabled={isSavingKey || isTranscribingKey}
            />
            <div className="answer-key-actions">
              <button
                type="button"
                className="answer-key-button primary"
                onClick={saveTypedAnswerKey}
                disabled={isSavingKey || isTranscribingKey}
              >
                {isSavingKey ? 'Saving key...' : 'Save Typed Key'}
              </button>
              <input
                ref={modelWorksheetInputRef}
                type="file"
                accept="image/*"
                onChange={transcribeModelWorksheet}
                className="visually-hidden-input"
                id="model-answer-key-upload"
              />
              <button
                type="button"
                className="answer-key-button secondary"
                onClick={() => modelWorksheetInputRef.current?.click()}
                disabled={isSavingKey || isTranscribingKey}
              >
                {isTranscribingKey ? 'Reading model...' : 'Upload Model Worksheet'}
              </button>
              {hasAnswerKey && (
                <button
                  type="button"
                  className="answer-key-button ghost"
                  onClick={clearAnswerKey}
                  disabled={isSavingKey || isTranscribingKey}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

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
                  Upload any number of worksheets. Files are sent in small batches of 2 and graded in parallel.
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
            ? `Grading batch ${uploadProgress.current} of ${uploadProgress.total}…`
            : isProcessing
              ? 'Preparing upload…'
              : `Process ${fileList.length || 'selected'} worksheets`}
        </span>
        <span className="button-chevron">→</span>
      </motion.button>
      <AnimatePresence>
        {notice && (
          <GradingNoticeModal
            {...notice}
            onClose={closeNotice}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default UploadSection;
