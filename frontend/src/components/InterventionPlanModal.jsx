import { useState } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';
import { useI18n } from '../i18n.jsx';
import '../styles/InterventionPlanModal.css';

const InterventionPlanModal = ({ plan, sessionId, onClose, onPhoneSaved }) => {
  const { t } = useI18n();
  const [parentPhone, setParentPhone] = useState(plan?.parentPhone || '');
  const [savingPhone, setSavingPhone] = useState(false);

  if (!plan) return null;

  const handleSavePhone = async () => {
    if (!plan.studentId) return;
    setSavingPhone(true);
    try {
      await analyticsAPI.updateParentPhone(plan.studentId, parentPhone);
      onPhoneSaved?.(parentPhone);
    } catch (err) {
      console.error('Failed to save phone:', err);
    } finally {
      setSavingPhone(false);
    }
  };

  const copyToClipboard = () => {
    if (!plan.parentMessage?.whatsappText) return;
    navigator.clipboard.writeText(plan.parentMessage.whatsappText);
    alert(t('copiedToClipboard'));
  };

  const openWhatsApp = () => {
    if (!plan.parentMessage?.whatsappText) return;
    const encoded = encodeURIComponent(plan.parentMessage.whatsappText);
    const digits = parentPhone.replace(/\D/g, '');
    const url = digits
      ? `https://wa.me/${digits}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const openPdf = (path) => {
    window.open(path, '_blank');
  };

  return (
    <div className="ip-modal-overlay" onClick={onClose}>
      <motion.div
        className="ip-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ip-modal-header">
          <div>
            <h2>{t('interventionPlanFor', { name: plan.studentName })}</h2>
            <p className="ip-subtitle">{t('interventionPlanSubtitle')}</p>
          </div>
          <button className="ip-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="ip-modal-body">
          {/* Teacher re-teach actions */}
          <section className="ip-section">
            <h3 className="ip-section-title">📋 {t('teacherReteachActions')}</h3>
            <ul className="ip-action-list">
              {(plan.teacherActions || []).map((item, i) => (
                <li key={i} className="ip-action-item">
                  <span className="ip-concept-tag">{item.concept}</span>
                  <span className="ip-action-text">{item.action}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Weak concepts + practice PDFs */}
          <section className="ip-section">
            <h3 className="ip-section-title">🎯 {t('weakConceptsPractice')}</h3>
            <div className="ip-concept-grid">
              {(plan.weakConcepts || []).map((wc, i) => (
                <div key={i} className="ip-concept-card">
                  <div className="ip-concept-name">{wc.concept}</div>
                  <div className="ip-concept-meta">
                    {t('mistakesCount', { count: wc.mistakeCount })}
                  </div>
                  {wc.hasPracticePdf && (
                    <button
                      className="ip-pdf-btn"
                      onClick={() => openPdf(wc.practicePdfPath)}
                    >
                      📥 {t('downloadPracticePdf')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Parent message preview */}
          <section className="ip-section">
            <h3 className="ip-section-title">💬 {t('parentMessagePreview')}</h3>
            <div className="ip-message-preview">
              {plan.parentMessage?.hindi && (
                <div className="ip-message-part hindi-text">{plan.parentMessage.hindi}</div>
              )}
              {plan.parentMessage?.hindi && plan.parentMessage?.english && <hr />}
              {plan.parentMessage?.english && (
                <div className="ip-message-part english-text">{plan.parentMessage.english}</div>
              )}
            </div>
          </section>

          {/* Parent phone for WhatsApp */}
          <section className="ip-section ip-phone-section">
            <label className="ip-phone-label">{t('parentWhatsAppNumber')}</label>
            <div className="ip-phone-row">
              <input
                type="tel"
                className="ip-phone-input"
                placeholder={t('parentPhonePlaceholder')}
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
              />
              {plan.studentId && (
                <button
                  className="ip-save-phone-btn"
                  onClick={handleSavePhone}
                  disabled={savingPhone}
                >
                  {savingPhone ? t('saving') : t('save')}
                </button>
              )}
            </div>
            <p className="ip-phone-hint">{t('parentPhoneHint')}</p>
          </section>
        </div>

        <div className="ip-modal-footer">
          <button className="ip-btn-secondary" onClick={copyToClipboard}>
            {t('copyToClipboard')}
          </button>
          <button className="ip-btn-primary" onClick={openWhatsApp}>
            <span className="whatsapp-icon">💬</span> {t('sendViaWhatsApp')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default InterventionPlanModal;
