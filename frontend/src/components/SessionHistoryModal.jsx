import { motion } from 'framer-motion';
import '../styles/SessionHistoryModal.css';

const formatDateTime = (value) => {
  if (!value) return 'Not opened yet';
  return new Date(value).toLocaleString('en-IN', {
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
            <span className="session-modal-kicker">Session History</span>
            <h2>Resume any previous grading session</h2>
          </div>
          <button className="session-close-button" onClick={onClose} aria-label="Close session history">
            x
          </button>
        </div>

        <div className="session-modal-actions">
          <button className="session-primary-action" onClick={onNewSession}>
            Start New Session
          </button>
        </div>

        <div className="session-list">
          {sessions.length === 0 ? (
            <div className="session-empty">
              <strong>No saved sessions yet</strong>
              <span>Reloads and completed uploads will appear here as separate histories.</span>
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
                    <h3>{session.title || 'Untitled session'}</h3>
                    <p>Last opened {formatDateTime(session.lastAccessedAt || session.updatedAt)}</p>
                  </div>
                  {isActive && <span className="session-active-badge">Active</span>}
                </div>

                <div className="session-stats-row">
                  <span><strong>{session.totalUploads || 0}</strong> uploads</span>
                  <span><strong>{session.gradedCount || 0}</strong> graded</span>
                  <span><strong>{session.manualReviewCount || 0}</strong> manual</span>
                  <span><strong>{session.averageScore || 0}%</strong> avg</span>
                </div>

                <div className="session-card-actions">
                  <button
                    className="session-secondary-action"
                    onClick={() => onResume(session.sessionId)}
                    disabled={isActive}
                  >
                    {isActive ? 'Current Session' : 'Resume'}
                  </button>
                  <button
                    className="session-danger-action"
                    onClick={() => onDelete(session.sessionId)}
                  >
                    Delete
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
