import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api.js';
import { analyticsAPI } from '../api/analyticsAPI.js';
import { formatFileSize, prepareFilesForUpload } from '../utils/uploadBatches.js';
import { useI18n } from '../i18n.jsx';
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
  const { t } = useI18n();
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
        title: t('noWorksheetsTitle'),
        message: t('noWorksheetsMessage')
      });
      return;
    }

    if (!sessionId) {
      setNotice({
        type: 'error',
        title: t('sessionLoadingTitle'),
        message: t('sessionLoadingMessage')
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
            detail: t('batchManualDetail'),
            complete: true,
            results: consolidatedResults
          }
        : {
            type: 'success',
            message: t('batchSuccess'),
            complete: true,
            results: consolidatedResults
          });
    } catch (networkError) {
      console.error('API Upload Pipeline Failure:', networkError);
      const status = networkError.response?.status;
      if (status === 413) {
        setNotice({
          type: 'error',
          title: t('fileTooLarge'),
          message: t('smallerImage')
        });
      } else if (status === 504 || networkError.code === 'ECONNABORTED') {
        setNotice({
          type: 'error',
          title: t('gradingTimedOut'),
          message: t('smallerBatch')
        });
      } else if (networkError.message?.includes('must be under') || networkError.message?.includes('Could not')) {
        setNotice({
          type: 'error',
          title: t('uploadCouldNotPrepare'),
          message: networkError.message
        });
      } else {
        setNotice({
          type: 'error',
          title: t('uploadFailed'),
          message: t('clearWorksheetImage')
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
        title: t('sessionLoadingTitle'),
        message: t('sessionLoadingMessage')
      });
      return;
    }

    if (!answerKeyText.trim()) {
      setNotice({
        type: 'error',
        title: t('answerKeyEmptyTitle'),
        message: t('answerKeyEmptyMessage')
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
        message: t('answerKeySaved', { count: savedKey.questions?.length || 0 })
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: t('answerKeyNotSaved'),
        message: error.response?.data?.error || t('checkKeyFormat')
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
        title: t('sessionLoadingTitle'),
        message: t('sessionLoadingMessage')
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
        message: t('modelTranscribed', { count: result.answerKey?.questions?.length || 0 })
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: t('modelWorksheetNotTranscribed'),
        message: error.response?.data?.error || t('clearerModelWorksheet')
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
        title: t('answerKeyNotCleared'),
        message: error.response?.data?.error || t('tryAgain')
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
              <span className="eyebrow">{t('teacherAnswerKey')}</span>
              <h2>{t('answerKeyTitle')}</h2>
              <p>
                {t('answerKeyDescription')}
              </p>
            </div>
            <div className={`answer-key-status ${hasAnswerKey ? 'ready' : 'empty'}`}>
              <strong>{answerKeyCount}</strong>
              <span>{hasAnswerKey ? t('answersReady') : t('noKeyYet')}</span>
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
                {isSavingKey ? t('savingKey') : t('saveTypedKey')}
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
                {isTranscribingKey ? t('readingModel') : t('uploadModelWorksheet')}
              </button>
              {hasAnswerKey && (
                <button
                  type="button"
                  className="answer-key-button ghost"
                  onClick={clearAnswerKey}
                  disabled={isSavingKey || isTranscribingKey}
                >
                  {t('clear')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="upload-main-card glass-panel">
          <div className="section-heading">
            <span className="eyebrow">{t('worksheetUpload')}</span>
            <h2>{t('uploadFlowTitle')}</h2>
            <p>
              {t('uploadFlowDescription')}
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
                <span className="upload-badge">{t('dragDropReady')}</span>
                <h3>{isDragActive ? t('releaseToStage') : t('dropFilesHere')}</h3>
                <p>
                  {t('uploadBatchHint')}
                </p>
              </div>
              <div className="dropzone-actions">
                <span className="ghost-button">{t('chooseFiles')}</span>
                <span className="helper-text">{t('supportedFormats')}</span>
              </div>
            </label>
          </div>

          <div className="selected-summary">
            <div>
              <span className="summary-value">{fileList.length}</span>
              <span className="summary-label">{t('selectedFiles')}</span>
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
                  <span>{t('noWorksheetsSelected')}</span>
                  <p>{t('uploadDeckHint')}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {remainingFiles > 0 && (
              <div className="more-files-pill">+{remainingFiles} {t('moreFiles')}</div>
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
            ? t('gradingBatch', { current: uploadProgress.current, total: uploadProgress.total })
            : isProcessing
              ? t('preparingUpload')
              : t('processSelectedWorksheets')}
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
