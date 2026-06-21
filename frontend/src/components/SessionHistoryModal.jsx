import { motion } from 'framer-motion';
import { useI18n } from '../i18n.jsx';
import '../styles/SessionHistoryModal.css';

const localeByLanguage = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN'
};

const formatDateTime = (value, language, t) => {
  if (!value) return t('notOpenedYet');
  return new Date(value).toLocaleString(localeByLanguage[language] || 'en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SessionHistoryModal = ({
  sessions,
  activeSessionId,
  onClose,
  onResume,
  onNewSession,
  onDelete
}) => {
  const { language, t } = useI18n();

  return (
    <motion.div
      className="session-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="session-modal"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="session-modal-header">
          <div>
            <span className="session-modal-kicker">{t('sessionHistory')}</span>
            <h2>{t('resumePreviousSession')}</h2>
          </div>
          <button className="session-close-button" onClick={onClose} aria-label={t('closeSessionHistory')}>
            x
          </button>
        </div>

        <div className="session-modal-actions">
          <button className="session-primary-action" onClick={onNewSession}>
            {t('startNewSession')}
          </button>
        </div>

        <div className="session-list">
          {sessions.length === 0 ? (
            <div className="session-empty">
              <strong>{t('noSavedSessions')}</strong>
              <span>{t('sessionsEmptyHint')}</span>
            </div>
          ) : sessions.map(session => {
            const isActive = session.sessionId === activeSessionId;
            return (
              <article
                key={session.sessionId}
                className={`session-card ${isActive ? 'active' : ''}`}
              >
                <div className="session-card-main">
                  <div>
                    <h3>{session.title || t('untitledSession')}</h3>
                    <p>{t('lastOpened')} {formatDateTime(session.lastAccessedAt || session.updatedAt, language, t)}</p>
                  </div>
                  {isActive && <span className="session-active-badge">{t('active')}</span>}
                </div>

                <div className="session-stats-row">
                  <span><strong>{session.totalUploads || 0}</strong> {t('uploads')}</span>
                  <span><strong>{session.gradedCount || 0}</strong> {t('graded')}</span>
                  <span><strong>{session.manualReviewCount || 0}</strong> {t('manual')}</span>
                  <span><strong>{session.averageScore || 0}%</strong> {t('avg')}</span>
                </div>

                <div className="session-card-actions">
                  <button
                    className="session-secondary-action"
                    onClick={() => onResume(session.sessionId)}
                    disabled={isActive}
                  >
                    {isActive ? t('currentSessionButton') : t('resume')}
                  </button>
                  <button
                    className="session-danger-action"
                    onClick={() => onDelete(session.sessionId)}
                  >
                    {t('delete')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SessionHistoryModal;
