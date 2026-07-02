import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/LearningPassportModal.css';
import { useI18n } from '../i18n.jsx';
import { analyticsAPI } from '../api/analyticsAPI';

const TABS = ['inside', 'howToUse', 'privacy'];

const LearningPassportModal = ({ studentId, studentName, onClose }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('inside');
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await analyticsAPI.previewStudentPassport(studentId);
        if (!cancelled) setPassport(data.passport);
      } catch (err) {
        console.error('Passport preview failed:', err);
        if (!cancelled) {
          setError(err.response?.data?.error || t('passportFailed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [studentId, t]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await analyticsAPI.getStudentPassport(studentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'my_learning_passport.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Passport download failed:', err);
      alert(err.response?.data?.error || t('passportFailed'));
    } finally {
      setDownloading(false);
    }
  };

  const copyPrimer = () => {
    if (!passport?.llm_primer) return;
    navigator.clipboard.writeText(passport.llm_primer);
    alert(t('passportPrimerCopied'));
  };

  const profile = passport?.learner_profile;

  return (
    <div className="lpp-modal-overlay" onClick={onClose}>
      <motion.div
        className="lpp-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lpp-modal-header">
          <div>
            <span className="lpp-eyebrow">{t('passportEyebrow')}</span>
            <h2>{t('passportTitle', { name: studentName })}</h2>
            <p className="lpp-subtitle">{t('passportSubtitle')}</p>
          </div>
          <button type="button" className="lpp-close-btn" onClick={onClose} aria-label={t('close')}>
            ×
          </button>
        </header>

        <nav className="lpp-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`lpp-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(`passportTab_${tab}`)}
            </button>
          ))}
        </nav>

        <div className="lpp-modal-body">
          {loading && <p className="lpp-loading">{t('passportLoading')}</p>}
          {error && <p className="lpp-error">{error}</p>}

          {!loading && !error && passport && activeTab === 'inside' && (
            <div className="lpp-panel">
              <div className="lpp-stats-row">
                <div className="lpp-stat">
                  <span className="lpp-stat-value">{profile?.overall_average}%</span>
                  <span className="lpp-stat-label">{t('passportAvgScore')}</span>
                </div>
                <div className="lpp-stat">
                  <span className="lpp-stat-value">{profile?.total_tests_taken}</span>
                  <span className="lpp-stat-label">{t('passportTests')}</span>
                </div>
                <div className="lpp-stat">
                  <span className="lpp-stat-value">{passport.strengths?.length || 0}</span>
                  <span className="lpp-stat-label">{t('passportStrengths')}</span>
                </div>
              </div>

              <section className="lpp-section">
                <h3>{t('passportMasteryMap')}</h3>
                <ul className="lpp-list">
                  {(passport.mastery_map || []).slice(0, 5).map((m) => (
                    <li key={m.concept}>
                      <span className={`lpp-badge lpp-badge-${m.mastery_level}`}>{m.mastery_level.replace('_', ' ')}</span>
                      <span>{m.concept}</span>
                      {m.score_on_concept != null && (
                        <span className="lpp-muted">{m.score_on_concept}%</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="lpp-section">
                <h3>{t('passportErrorPatterns')}</h3>
                {(passport.error_patterns || []).length === 0 ? (
                  <p className="lpp-muted">{t('passportNoErrors')}</p>
                ) : (
                  <ul className="lpp-list">
                    {passport.error_patterns.slice(0, 3).map((e) => (
                      <li key={e.pattern}>
                        <span>{e.pattern}</span>
                        <span className="lpp-muted">×{e.recurrence_count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="lpp-section">
                <h3>{t('passportLlmPrimer')}</h3>
                <p className="lpp-primer">{passport.llm_primer}</p>
                <button type="button" className="lpp-copy-btn" onClick={copyPrimer}>
                  {t('passportCopyPrimer')}
                </button>
              </section>
            </div>
          )}

          {!loading && !error && activeTab === 'howToUse' && (
            <div className="lpp-panel">
              <p>{t('passportHowToIntro')}</p>

              <section className="lpp-section">
                <h3>ChatGPT</h3>
                <ol className="lpp-steps">
                  <li>{t('passportStepDownload')}</li>
                  <li>{t('passportStepOpenChatGPT')}</li>
                  <li>{t('passportStepPastePrimer')}</li>
                  <li>{t('passportStepAskHelp')}</li>
                </ol>
              </section>

              <section className="lpp-section">
                <h3>Google Gemini</h3>
                <ol className="lpp-steps">
                  <li>{t('passportStepDownload')}</li>
                  <li>{t('passportStepOpenGemini')}</li>
                  <li>{t('passportStepUploadJson')}</li>
                  <li>{t('passportStepAskHelp')}</li>
                </ol>
              </section>

              <section className="lpp-section">
                <h3>Claude</h3>
                <ol className="lpp-steps">
                  <li>{t('passportStepDownload')}</li>
                  <li>{t('passportStepOpenClaude')}</li>
                  <li>{t('passportStepPastePrimer')}</li>
                  <li>{t('passportStepAskHelp')}</li>
                </ol>
              </section>
            </div>
          )}

          {!loading && !error && activeTab === 'privacy' && (
            <div className="lpp-panel">
              <p className="lpp-privacy-notice">{passport?.privacy_notice || t('passportPrivacyNotice')}</p>
              <ul className="lpp-privacy-list">
                <li>{t('passportPrivacyNoSchool')}</li>
                <li>{t('passportPrivacyNoTeacher')}</li>
                <li>{t('passportPrivacyNoSession')}</li>
                <li>{t('passportPrivacyStudentOwned')}</li>
                <li>{t('passportPrivacyShareCarefully')}</li>
              </ul>
            </div>
          )}
        </div>

        <footer className="lpp-modal-footer">
          <button type="button" className="lpp-secondary-btn" onClick={onClose}>
            {t('close')}
          </button>
          <button
            type="button"
            className="lpp-primary-btn"
            onClick={handleDownload}
            disabled={loading || !!error || downloading}
          >
            {downloading ? t('downloading') : t('passportDownload')}
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

export default LearningPassportModal;
