import { motion } from 'framer-motion';
import { useI18n } from '../i18n.jsx';
import '../styles/GradingNoticeModal.css';

const copy = {
  manual: {
    eyebrowKey: 'manualEyebrow',
    titleKey: 'manualTitle',
    bodyKey: 'manualBody',
    accent: 'manual',
    icon: '!'
  },
  review: {
    eyebrowKey: 'reviewEyebrow',
    titleKey: 'reviewTitle',
    bodyKey: 'reviewBody',
    accent: 'review',
    icon: '?'
  },
  success: {
    eyebrowKey: 'successEyebrow',
    titleKey: 'successTitle',
    bodyKey: 'successBody',
    accent: 'success',
    icon: '✓'
  },
  error: {
    eyebrowKey: 'errorEyebrow',
    titleKey: 'errorTitle',
    bodyKey: 'errorBody',
    accent: 'error',
    icon: 'i'
  }
};

function GradingNoticeModal({ type = 'manual', title, message, detail, count, onClose }) {
  const { t } = useI18n();
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
          <span className="grading-notice-eyebrow">{t(content.eyebrowKey)}</span>
          <h2>{title || t(content.titleKey)}</h2>
          <p>{message || t(content.bodyKey)}</p>
          {typeof count === 'number' && count > 0 && (
            <div className="grading-notice-count">
              <strong>{count}</strong>
              <span>
                {count === 1 ? t('submission') : t('submissions')}{' '}
                {type === 'review' ? t('reviewCountSuffix') : t('manualCountSuffix')}
              </span>
            </div>
          )}
          {detail && <div className="grading-notice-detail">{detail}</div>}
        </div>
        <button className="grading-notice-close" onClick={onClose}>
          {t('gotIt')}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default GradingNoticeModal;
