import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import '../styles/AtRiskStudents.css';
import { useI18n } from '../i18n.jsx';
import { analyticsAPI } from '../api/analyticsAPI';
import InterventionPlanModal from './InterventionPlanModal';
import ReteachTomorrowSummary from './ReteachTomorrowSummary';

const AtRiskStudents = ({ students, sessionId, reteachSummary }) => {
  const { t } = useI18n();
  const [loadingStudent, setLoadingStudent] = useState(null);
  const [activePlan, setActivePlan] = useState(null);

  const handleGeneratePlan = async (student) => {
    if (!sessionId) return;
    setLoadingStudent(student.studentName);
    try {
      const plan = await analyticsAPI.generateSessionInterventionPlan(sessionId, student.studentName);
      setActivePlan(plan);
    } catch (err) {
      console.error('Failed to generate intervention plan:', err);
      alert(t('interventionPlanFailed'));
    } finally {
      setLoadingStudent(null);
    }
  };

  return (
    <div className="atrisk-container">
      {reteachSummary && <ReteachTomorrowSummary summary={reteachSummary} />}

      <div className="atrisk-header">
        <h2>{t('atRiskStudents')}</h2>
        <p className="atrisk-subtitle">{t('studentsNeedSupport')}</p>
      </div>

      {(!students || students.length === 0) ? (
        <div className="atrisk-empty">
          <p>{t('noAtRiskStudents')}</p>
        </div>
      ) : (
        <div className="atrisk-grid">
          {students.map((student, idx) => {
            const riskLevel = student.score < 40 ? 'CRITICAL' : student.score < 60 ? 'HIGH' : 'MEDIUM';
            const isLoading = loadingStudent === student.studentName;
            return (
              <div key={idx} className={`atrisk-card risk-${riskLevel.toLowerCase()}`}>
                <div className="card-header">
                  <h3 className="student-name-risk">{student.studentName}</h3>
                  <span className={`risk-badge ${riskLevel.toLowerCase()}`}>{riskLevel}</span>
                </div>

                <div className="score-display">
                  <div className="score-number">{student.score}%</div>
                  <div className="score-label">{t('currentScore')}</div>
                </div>

                <div className="weak-areas">
                  <div className="areas-title">{t('problemAreas')}</div>
                  <div className="areas-tags">
                    {student.topMistakes && student.topMistakes.length > 0 ? (
                      student.topMistakes.map((area, i) => (
                        <span key={i} className="area-tag">{area}</span>
                      ))
                    ) : (
                      <span className="area-tag">{t('noSpecificWeakAreas')}</span>
                    )}
                  </div>
                </div>

                <div className="intervention-section">
                  <div className="intervention-type">{t('interventionType')}</div>
                  <div className="intervention-desc">{student.interventionType}</div>
                </div>

                <div className="study-hours">⏱️ {t('estimatedStudyHours')}: {student.estimatedStudyHours}</div>

                <button
                  className="action-button"
                  onClick={() => handleGeneratePlan(student)}
                  disabled={isLoading || !sessionId}
                >
                  {isLoading ? t('generatingPlan') : `📋 ${t('createInterventionPlan')}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {activePlan && (
          <InterventionPlanModal
            plan={activePlan}
            sessionId={sessionId}
            onClose={() => setActivePlan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtRiskStudents;
