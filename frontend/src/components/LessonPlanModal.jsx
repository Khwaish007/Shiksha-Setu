import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/LessonPlanModal.css';
import { useI18n } from '../i18n.jsx';
import { analyticsAPI } from '../api/analyticsAPI';

const LessonPlanModal = ({ misconception, sessionId, onClose }) => {
  const { t } = useI18n();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await analyticsAPI.generateLessonPlan({
          concept: misconception.concept,
          misconception: misconception.misconception,
          studentsAffectedCount: misconception.studentsAffectedCount,
          occurrences: misconception.occurrences,
          sessionId,
        });
        if (!cancelled) setPlan(data.plan);
      } catch (err) {
        console.error('Lesson plan failed:', err);
        if (!cancelled) setError(t('lessonPlanFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [misconception, sessionId, t]);

  const copyPlan = () => {
    if (!plan) return;
    const lines = [
      plan.title,
      `${t('lessonPlanDuration')}: ${plan.durationMinutes} min`,
      '',
      `🎯 ${t('lessonPlanHook')}`,
      plan.hook,
      '',
      `📝 ${t('lessonPlanWorkedExamples')}`,
      ...plan.workedExamples.map((ex, i) =>
        `${i + 1}. ${ex.problem}\n   ${t('solution')}: ${ex.solution}\n   ${t('teacherTalk')}: ${ex.teacherTalk}`
      ),
      '',
      `📋 ${t('lessonPlanBoardPlan')}`,
      ...plan.boardPlan.map((s) => `${s.step}. (${s.durationMinutes}m) ${s.action}`),
      '',
      `✅ ${t('lessonPlanExitTicket')}`,
      plan.exitTicket.question,
      `${t('expected')}: ${plan.exitTicket.expectedAnswer}`,
      `${t('successCriteria')}: ${plan.exitTicket.successCriteria}`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    alert(t('lessonPlanCopied'));
  };

  return (
    <div className="lp-modal-overlay" onClick={onClose}>
      <motion.div
        className="lp-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lp-modal-header">
          <div>
            <span className="lp-eyebrow">{t('lessonPlanEyebrow')}</span>
            <h2>{plan?.title || t('generatingLessonPlan')}</h2>
            {misconception && (
              <p className="lp-misconception-target">
                {misconception.concept}: &ldquo;{misconception.misconception}&rdquo;
              </p>
            )}
          </div>
          <button type="button" className="lp-close-btn" onClick={onClose}>&times;</button>
        </header>

        <div className="lp-modal-body">
          {loading && (
            <div className="lp-loading">
              <span className="lp-spinner" />
              <p>{t('generatingLessonPlan')}</p>
            </div>
          )}

          {error && <p className="lp-error">{error}</p>}

          {plan && !loading && (
            <>
              <div className="lp-meta-row">
                <span className="lp-badge">⏱️ {plan.durationMinutes} {t('minutes')}</span>
                {plan.source === 'ai' && <span className="lp-badge ai">✨ AI</span>}
                {misconception?.studentsAffectedCount > 0 && (
                  <span className="lp-badge">
                    👥 {misconception.studentsAffectedCount} {t('studentsAffected').toLowerCase()}
                  </span>
                )}
              </div>

              <section className="lp-section">
                <h3>🎯 {t('lessonPlanHook')}</h3>
                <p>{plan.hook}</p>
              </section>

              <section className="lp-section">
                <h3>📝 {t('lessonPlanWorkedExamples')}</h3>
                {plan.workedExamples.map((ex, i) => (
                  <div key={i} className="lp-example-card">
                    <h4>{t('example')} {i + 1}</h4>
                    <p className="lp-problem">{ex.problem}</p>
                    <p><strong>{t('solution')}:</strong> {ex.solution}</p>
                    <p className="lp-teacher-talk"><strong>{t('teacherTalk')}:</strong> {ex.teacherTalk}</p>
                  </div>
                ))}
              </section>

              <section className="lp-section">
                <h3>📋 {t('lessonPlanBoardPlan')}</h3>
                <ol className="lp-board-list">
                  {plan.boardPlan.map((step) => (
                    <li key={step.step}>
                      <span className="lp-step-time">{step.durationMinutes}m</span>
                      <span>{step.action}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="lp-section lp-exit-ticket">
                <h3>✅ {t('lessonPlanExitTicket')}</h3>
                <p className="lp-exit-question">{plan.exitTicket.question}</p>
                <p><strong>{t('expected')}:</strong> {plan.exitTicket.expectedAnswer}</p>
                <p><strong>{t('successCriteria')}:</strong> {plan.exitTicket.successCriteria}</p>
              </section>
            </>
          )}
        </div>

        {plan && !loading && (
          <footer className="lp-modal-footer">
            <button type="button" className="lp-btn-secondary" onClick={copyPlan}>
              {t('copyLessonPlan')}
            </button>
            <button type="button" className="lp-btn-primary" onClick={onClose}>
              {t('close')}
            </button>
          </footer>
        )}
      </motion.div>
    </div>
  );
};

export default LessonPlanModal;
