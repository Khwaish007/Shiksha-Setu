import '../styles/ClassInsights.css';
import { useI18n } from '../i18n.jsx';

const ClassInsights = ({ classData }) => {
  const { t } = useI18n();

  return (
    <div className="class-insights-container">
      <div className="insights-header">
        <h2>{t('classCollectiveInsights')}</h2>
        <p className="insights-subtitle">{t('classInsightsSubtitle')}</p>
      </div>

      <div className="insights-grid">
        <div className="insight-card strength-card">
          <div className="card-icon">💪</div>
          <h3 className="card-title">{t('classStrengthsTitle')}</h3>
          <p className="card-description">{t('classStrengthsDescription')}</p>

          <div className="insights-list">
            {classData && classData.classStrengths && classData.classStrengths.map((strength, idx) => (
              <div key={idx} className="insight-item strength-item">
                <div className="item-rank">{idx + 1}</div>
                <div className="item-content">
                  <h4>{strength.topic}</h4>
                  <span className="item-stat">{strength.mistakesCount} {t('mistakes').toLowerCase()}</span>
                </div>
                <div className="success-badge">✅</div>
              </div>
            ))}
          </div>
        </div>

        <div className="insight-card weakness-card">
          <div className="card-icon">⚠️</div>
          <h3 className="card-title">{t('classWeaknessesTitle')}</h3>
          <p className="card-description">{t('classWeaknessesDescription')}</p>

          <div className="insights-list">
            {classData && classData.classWeaknesses && classData.classWeaknesses.map((weakness, idx) => (
              <div key={idx} className="insight-item weakness-item">
                <div className="item-rank">{idx + 1}</div>
                <div className="item-content">
                  <h4>{weakness.topic}</h4>
                  <span className="item-stat">{weakness.mistakesCount} {t('mistakes').toLowerCase()}</span>
                </div>
                <div className="warning-badge">⚠️</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {classData && classData.overallTrend && (
        <div className="trend-section">
          <h3>📊 {t('overallClassTrend')}</h3>
          <p className="trend-text">{classData.overallTrend}</p>
        </div>
      )}
    </div>
  );
};

export default ClassInsights;
