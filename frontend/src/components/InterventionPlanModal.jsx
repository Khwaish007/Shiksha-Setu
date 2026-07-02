import { useState } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';
import { useI18n } from '../i18n.jsx';
import ParentChannelActions from './ParentChannelActions';
import { openBlobPdf } from './AdaptiveWorksheetPanel';
import '../styles/InterventionPlanModal.css';

const InterventionPlanModal = ({ plan, onClose, onPhoneSaved, sessionId, onReteachLogged }) => {
  const { t } = useI18n();
  const [parentPhone, setParentPhone] = useState(plan?.parentPhone || '');
  const [parentCommunication, setParentCommunication] = useState(
    plan?.parentCommunication || { preferredChannel: 'auto', preferredLanguage: 'hindi', hasSmartphone: true }
  );
  const [loggingReteach, setLoggingReteach] = useState(false);
  const [reteachLogged, setReteachLogged] = useState(false);
  const [downloadingConcept, setDownloadingConcept] = useState(null);

  if (!plan) return null;

  const handleMarkRetaught = async () => {
    const concepts = (plan.teacherActions || []).map((a) => a.concept).filter(Boolean);
    if (!concepts.length) return;

    setLoggingReteach(true);
    try {
      if (plan.studentId) {
        await analyticsAPI.logStudentReteach(plan.studentId, {
          concepts,
          sessionId,
          actionDescription: plan.teacherActions.map((a) => a.action).join('; '),
          source: 'intervention_plan',
        });
      } else if (sessionId) {
        for (const action of plan.teacherActions) {
          await analyticsAPI.logClassReteach(sessionId, {
            concept: action.concept,
            actionDescription: action.action,
            source: 'intervention_plan',
            scope: 'class',
            studentName: plan.studentName,
          });
        }
      }
      setReteachLogged(true);
      onReteachLogged?.();
      alert(t('reteachLoggedSuccess', { concept: concepts.join(', ') }));
    } catch (err) {
      console.error('Failed to log reteach:', err);
      alert(t('reteachLogFailed'));
    } finally {
      setLoggingReteach(false);
    }
  };

  const copyToClipboard = () => {
    if (!plan.parentMessage?.whatsappText) return;
    navigator.clipboard.writeText(plan.parentMessage.whatsappText);
    alert(t('copiedToClipboard'));
  };

  const downloadPractice = async (wc) => {
    setDownloadingConcept(wc.concept);
    try {
      if (plan.studentId) {
        const blob = await analyticsAPI.generateStudentAdaptiveWorksheet(plan.studentId, {
          concept: wc.concept,
        });
        openBlobPdf(blob, `${wc.concept.replace(/\s+/g, '_')}_adaptive.pdf`);
      } else {
        const slug = wc.concept.toLowerCase().replace(/\s+/g, '_');
        const blob = await analyticsAPI.getPracticeTest(slug);
        openBlobPdf(blob, `${slug}_practice.pdf`);
      }
    } catch (err) {
      console.error('Practice download failed:', err);
      if (wc.practicePdfPath) {
        window.open(wc.practicePdfPath, '_blank');
      } else {
        alert(t('adaptiveWorksheetDownloadFailed'));
      }
    } finally {
      setDownloadingConcept(null);
    }
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
                      onClick={() => downloadPractice(wc)}
                      disabled={downloadingConcept === wc.concept}
                    >
                      {downloadingConcept === wc.concept
                        ? t('downloading')
                        : plan.studentId
                          ? `✨ ${t('downloadAdaptiveWorksheet')}`
                          : `📥 ${t('downloadPracticePdf')}`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

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

          <section className="ip-section ip-phone-section">
            <h3 className="ip-section-title">📡 {t('sendToParent')}</h3>
            <ParentChannelActions
              studentId={plan.studentId}
              messageData={plan.parentMessage}
              parentPhone={parentPhone}
              parentCommunication={parentCommunication}
              templateType="intervention_plan"
              onPhoneSaved={(phone) => {
                setParentPhone(phone);
                onPhoneSaved?.(phone);
              }}
              onPreferencesSaved={setParentCommunication}
            />
          </section>
        </div>

        <div className="ip-modal-footer">
          <button className="ip-btn-secondary" onClick={copyToClipboard}>
            {t('copyToClipboard')}
          </button>
          <button
            className="ip-btn-primary ip-reteach-log-btn"
            onClick={handleMarkRetaught}
            disabled={loggingReteach || reteachLogged || !plan.teacherActions?.length}
          >
            {reteachLogged
              ? `✓ ${t('reteachLogged')}`
              : loggingReteach
                ? t('loggingReteach')
                : `✓ ${t('markRetaught')}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default InterventionPlanModal;
