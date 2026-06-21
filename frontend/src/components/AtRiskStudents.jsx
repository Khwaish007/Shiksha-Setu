import '../styles/AtRiskStudents.css';
import { useI18n } from '../i18n.jsx';

const AtRiskStudents = ({ students }) => {
  const { t } = useI18n();

  return (
    <div className="atrisk-container">
      <div className="atrisk-header">
        <h2>{t('atRiskStudents')}</h2>
        <p className="atrisk-subtitle">{t('studentsNeedSupport')}</p>
      </div>

      <div className="atrisk-grid">
        {students && students.map((student, idx) => {
          const riskLevel = student.score < 40 ? 'CRITICAL' : student.score < 60 ? 'HIGH' : 'MEDIUM';
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
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default AtRiskStudents;
