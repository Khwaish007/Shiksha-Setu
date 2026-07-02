import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';
import { useI18n } from '../i18n.jsx';
import '../styles/StudentFeedbackPage.css';

const StudentFeedbackPage = () => {
  const { token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language, setLanguage, languages } = useI18n();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lang = searchParams.get('lang') || language || 'hi';

  useEffect(() => {
    if (lang !== language) {
      setLanguage(lang);
    }
  }, [lang, language, setLanguage]);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await analyticsAPI.getWorksheetFeedback(token, lang);
        setFeedback(data);
      } catch (err) {
        setError(err.response?.data?.error || t('feedbackLoadFailed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, lang, t]);

  const handleLanguageChange = (nextLang) => {
    setSearchParams({ lang: nextLang });
    setLanguage(nextLang);
  };

  if (loading) {
    return (
      <div className="sfp-page">
        <div className="sfp-loading">
          <div className="sfp-spinner" />
          <p>{t('loadingFeedback')}</p>
        </div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="sfp-page">
        <div className="sfp-error-card">
          <span className="sfp-error-icon">📋</span>
          <h1>{t('feedbackNotFound')}</h1>
          <p>{error || t('feedbackInvalidLink')}</p>
        </div>
      </div>
    );
  }

  const { content, wrongQuestions, score } = feedback;

  return (
    <div className="sfp-page">
      <header className="sfp-header">
        <div className="sfp-brand">
          <span className="sfp-kicker">Shiksha Setu</span>
          <h1>{t('yourWorksheetFeedback')}</h1>
        </div>
        <label className="sfp-lang-picker">
          <span>{t('language')}</span>
          <select value={lang} onChange={(e) => handleLanguageChange(e.target.value)}>
            {languages.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
      </header>

      <motion.main
        className="sfp-main"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <section className="sfp-hero-card">
          <p className="sfp-greeting">{content?.greeting}</p>
          <div className="sfp-score-badge">{score}%</div>
          <p className="sfp-score-summary">{content?.scoreSummary}</p>
          <p className="sfp-encouragement">{content?.encouragement}</p>
        </section>

        {wrongQuestions?.length > 0 && (
          <section className="sfp-section">
            <h2>{content?.mistakesTitle}</h2>
            <div className="sfp-mistakes-list">
              {wrongQuestions.map((item, index) => (
                <article key={`${item.questionNumber}-${index}`} className="sfp-mistake-card">
                  <div className="sfp-mistake-header">
                    <span className="sfp-q-badge">{item.questionNumber}</span>
                    <span className="sfp-concept-tag">{item.concept}</span>
                  </div>
                  {item.evidence && (
                    <p className="sfp-evidence">{item.evidence}</p>
                  )}
                  <div className="sfp-solution-box">
                    <span className="sfp-solution-label">{content?.workedSolutionLabel}</span>
                    <p>{item.workedSolution}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="sfp-footer">
          <p>{t('feedbackNoLoginNote')}</p>
        </footer>
      </motion.main>
    </div>
  );
};

export default StudentFeedbackPage;
