import { motion } from 'framer-motion';
import '../styles/GradingNoticeModal.css';

const copy = {
  manual: {
    eyebrow: 'Manual review needed',
    title: 'This submission needs a teacher review',
    body: "The AI could not grade this reliably. The page may be unclear, incomplete, non-mathematical, or outside the expected test format.",
    accent: 'manual',
    icon: '!'
  },
  success: {
    eyebrow: 'Grading complete',
    title: 'Results are ready',
    body: 'The worksheet grading finished successfully and the dashboard has been updated.',
    accent: 'success',
    icon: '✓'
  },
  error: {
    eyebrow: 'Upload issue',
    title: 'This upload could not be processed',
    body: 'Something interrupted the grading request. Please try again with a clear worksheet image.',
    accent: 'error',
    icon: 'i'
  }
};

function GradingNoticeModal({ type = 'manual', title, message, detail, count, onClose }) {
  const content = copy[type] || copy.manual;

  return (
    <motion.div
      className="grading-notice-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`grading-notice-modal notice-${content.accent}`}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 210, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grading-notice-glow" />
        <div className="grading-notice-icon">{content.icon}</div>
        <div className="grading-notice-content">
          <span className="grading-notice-eyebrow">{content.eyebrow}</span>
          <h2>{title || content.title}</h2>
          <p>{message || content.body}</p>
          {typeof count === 'number' && count > 0 && (
            <div className="grading-notice-count">
              <strong>{count}</strong>
              <span>{count === 1 ? 'submission' : 'submissions'} set aside for manual checking</span>
            </div>
          )}
          {detail && <div className="grading-notice-detail">{detail}</div>}
        </div>
        <button className="grading-notice-close" onClick={onClose}>
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}

export default GradingNoticeModal;
