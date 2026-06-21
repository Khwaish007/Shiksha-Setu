import '../styles/PerformanceStats.css';
import { useI18n } from '../i18n.jsx';

const PerformanceStats = ({ distribution }) => {
  const { t } = useI18n();

  return (
    <div className="performance-stats-container">
      <div className="stats-header">
        <h2>{t('performanceDistributionAnalysis')}</h2>
        <p className="stats-subtitle">{t('performanceDistributionSubtitle')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">{t('minimumScore')}</span>
              <span className="stat-value">{distribution.min}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('maximumScore')}</span>
              <span className="stat-value">{distribution.max}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('scoreRange')}</span>
              <span className="stat-value">{distribution.max - distribution.min}%</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">{t('meanAverage')}</span>
              <span className="stat-value">{distribution.mean}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('medianMiddle')}</span>
              <span className="stat-value">{distribution.median}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('stdDeviation')}</span>
              <span className="stat-value">{distribution.stdDev}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">{t('distributionType')}</span>
              <span className="stat-value">{distribution.distributionType || t('normal')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('bimodalPattern')}</span>
              <span className="stat-value">{distribution.bimodal ? t('yes') : t('no')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('skewness')}</span>
              <span className="stat-value" style={{ textTransform: 'capitalize' }}>{distribution.skewness}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="insights-box">
        <h3 className="insights-title">💡 {t('keyInsights')}</h3>
        <ul className="insights-list">
          {distribution.insights && distribution.insights.map((insight, idx) => (
            <li key={idx} className="insight-item">
              <span className="insight-bullet">•</span>
              <span className="insight-text">{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="interpretation-box">
        <h3 className="interpretation-title">🔍 {t('whatThisMeans')}</h3>
        <div className="interpretation-content">
          {distribution.mean === distribution.median ? (
            <p>{t('symmetricDistribution')}</p>
          ) : distribution.mean > distribution.median ? (
            <p>{t('highPerformersPulling')}</p>
          ) : (
            <p>{t('mostAboveAverage')}</p>
          )}

          {distribution.stdDev > 15 ? (
            <p>{t('highVariance')}</p>
          ) : (
            <p>{t('lowVariance')}</p>
          )}

          {distribution.bimodal ? (
            <p>{t('bimodalAdvice')}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PerformanceStats;
