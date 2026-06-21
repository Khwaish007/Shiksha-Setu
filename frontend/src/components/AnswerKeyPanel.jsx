import { useEffect, useRef, useState } from 'react';
import { analyticsAPI } from '../api/analyticsAPI';
import { useI18n } from '../i18n.jsx';
import '../styles/UploadSection.css';

const renderAnswerKeyText = (answerKey) =>
  (answerKey?.questions || [])
    .map((question) => `${question.questionNumber}: ${question.expectedAnswer}`)
    .join('\n');

const AnswerKeyPanel = ({ sessionId, onNotice, compact = false }) => {
  const { t } = useI18n();
  const [answerKey, setAnswerKey] = useState(null);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTranscribingKey, setIsTranscribingKey] = useState(false);
  const modelWorksheetInputRef = useRef(null);

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

  const notify = (notice) => {
    if (onNotice) onNotice(notice);
  };

  const saveTypedAnswerKey = async () => {
    if (!sessionId) {
      notify({
        type: 'error',
        title: t('sessionLoadingTitle'),
        message: t('sessionLoadingMessage'),
      });
      return;
    }

    if (!answerKeyText.trim()) {
      notify({
        type: 'error',
        title: t('answerKeyEmptyTitle'),
        message: t('answerKeyEmptyMessage'),
      });
      return;
    }

    setIsSavingKey(true);
    try {
      const savedKey = await analyticsAPI.saveAnswerKey(sessionId, answerKeyText);
      setAnswerKey(savedKey);
      setAnswerKeyText(savedKey.rawText || renderAnswerKeyText(savedKey));
      notify({
        type: 'success',
        message: t('answerKeySaved', { count: savedKey.questions?.length || 0 }),
      });
    } catch (error) {
      notify({
        type: 'error',
        title: t('answerKeyNotSaved'),
        message: error.response?.data?.error || t('checkKeyFormat'),
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  const transcribeModelWorksheet = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!sessionId) {
      notify({
        type: 'error',
        title: t('sessionLoadingTitle'),
        message: t('sessionLoadingMessage'),
      });
      return;
    }

    setIsTranscribingKey(true);
    try {
      const result = await analyticsAPI.transcribeAnswerKey(sessionId, file);
      if (result.status === 'Manual Review Required') {
        notify({
          type: 'manual',
          detail: result.message || result.errorSummary,
        });
        return;
      }

      setAnswerKey(result.answerKey);
      setAnswerKeyText(result.answerKey?.rawText || renderAnswerKeyText(result.answerKey));
      notify({
        type: 'success',
        message: t('modelTranscribed', { count: result.answerKey?.questions?.length || 0 }),
      });
    } catch (error) {
      notify({
        type: 'error',
        title: t('modelWorksheetNotTranscribed'),
        message: error.response?.data?.error || t('clearerModelWorksheet'),
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
      notify({
        type: 'error',
        title: t('answerKeyNotCleared'),
        message: error.response?.data?.error || t('tryAgain'),
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <div className={`answer-key-card glass-panel ${compact ? 'answer-key-compact' : ''}`}>
      <div className="answer-key-header">
        <div>
          <span className="eyebrow">{t('teacherAnswerKey')}</span>
          <h2>{t('answerKeyTitle')}</h2>
          <p>{t('answerKeyDescription')}</p>
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
          disabled={isSavingKey || isTranscribingKey || !sessionId}
        />
        <div className="answer-key-actions">
          <button
            type="button"
            className="answer-key-button primary"
            onClick={saveTypedAnswerKey}
            disabled={isSavingKey || isTranscribingKey || !sessionId}
          >
            {isSavingKey ? t('savingKey') : t('saveTypedKey')}
          </button>
          <input
            ref={modelWorksheetInputRef}
            type="file"
            accept="image/*"
            onChange={transcribeModelWorksheet}
            className="visually-hidden-input"
            id={`model-answer-key-upload-${compact ? 'compact' : 'full'}`}
          />
          <button
            type="button"
            className="answer-key-button secondary"
            onClick={() => modelWorksheetInputRef.current?.click()}
            disabled={isSavingKey || isTranscribingKey || !sessionId}
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

      {hasAnswerKey ? (
        <p className="answer-key-mode-hint ready">{t('gradingUsesAnswerKey')}</p>
      ) : (
        <p className="answer-key-mode-hint">{t('gradingUsesLlmKnowledge')}</p>
      )}
    </div>
  );
};

export default AnswerKeyPanel;
