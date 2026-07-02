import { useState } from 'react';
import '../styles/AdaptiveWorksheetPanel.css';
import { useI18n } from '../i18n.jsx';
import { analyticsAPI } from '../api/analyticsAPI';
import API_BASE_URL from '../config/api.js';

const openBlobPdf = (blob, filename = 'worksheet.pdf') => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const AdaptiveWorksheetPanel = ({ sessionId }) => {
  const { t } = useI18n();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerateClass = async () => {
    if (!sessionId) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await analyticsAPI.generateClassAdaptiveWorksheets(sessionId);
      setResult(data);
    } catch (err) {
      console.error('Class worksheet generation failed:', err);
      setError(t('adaptiveWorksheetFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (worksheet) => {
    setDownloadingId(worksheet.id);
    try {
      const blob = await analyticsAPI.downloadAdaptiveWorksheet(worksheet.id);
      const filename = `${worksheet.studentName.replace(/\s+/g, '_')}_${worksheet.concept.replace(/\s+/g, '_')}.pdf`;
      openBlobPdf(blob, filename);
    } catch (err) {
      console.error('Download failed:', err);
      alert(t('adaptiveWorksheetDownloadFailed'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!result?.worksheets?.length) return;
    for (const ws of result.worksheets) {
      await handleDownload(ws);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  return (
    <div className="adaptive-panel">
      <header className="adaptive-header">
        <h2>{t('adaptiveWorksheetTitle')}</h2>
        <p className="adaptive-subtitle">{t('adaptiveWorksheetSubtitle')}</p>
      </header>

      <div className="adaptive-hero">
        <div className="adaptive-hero-icon">🧬</div>
        <div className="adaptive-hero-text">
          <h3>{t('adaptiveWorksheetHero')}</h3>
          <p>{t('adaptiveWorksheetHeroDesc')}</p>
        </div>
        <button
          type="button"
          className="adaptive-generate-btn"
          onClick={handleGenerateClass}
          disabled={generating || !sessionId}
        >
          {generating ? t('generatingAdaptiveWorksheets') : `⚡ ${t('generateClassWorksheets')}`}
        </button>
      </div>

      {error && <p className="adaptive-error">{error}</p>}

      {result && (
        <div className="adaptive-results">
          <div className="adaptive-results-header">
            <p className="adaptive-results-summary">{result.message}</p>
            {result.worksheets?.length > 0 && (
              <button type="button" className="adaptive-download-all-btn" onClick={handleDownloadAll}>
                📥 {t('downloadAllWorksheets')}
              </button>
            )}
          </div>

          {result.worksheets?.length === 0 ? (
            <div className="adaptive-empty">
              <span>📋</span>
              <p>{t('adaptiveWorksheetEmpty')}</p>
            </div>
          ) : (
            <div className="adaptive-worksheet-grid">
              {result.worksheets.map((ws) => (
                <article key={ws.id} className="adaptive-worksheet-card">
                  <div className="adaptive-card-top">
                    <h4>{ws.studentName}</h4>
                    <span className={`adaptive-source source-${ws.source}`}>
                      {ws.source === 'ai' ? '✨ AI' : '📋 Template'}
                    </span>
                  </div>
                  <p className="adaptive-concept">{ws.concept}</p>
                  <p className="adaptive-question-count">
                    {t('adaptiveQuestionCount', { count: ws.questionCount })}
                  </p>
                  {ws.targetedMisconceptions?.length > 0 && (
                    <div className="adaptive-misconceptions">
                      {ws.targetedMisconceptions.map((m, i) => (
                        <span key={i} className="adaptive-misconception-tag">{m}</span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="adaptive-download-btn"
                    onClick={() => handleDownload(ws)}
                    disabled={downloadingId === ws.id}
                  >
                    {downloadingId === ws.id ? t('downloading') : `📥 ${t('downloadTest')}`}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="adaptive-api-hint">
        {t('adaptiveWorksheetHint', { api: `${API_BASE_URL}/api/v1/grading/adaptive-worksheets` })}
      </p>
    </div>
  );
};

export default AdaptiveWorksheetPanel;

export { openBlobPdf };
