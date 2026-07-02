import '../styles/InterventionImpactPanel.css';
import { useI18n } from '../i18n.jsx';

const statusIcon = {
  improved: '📈',
  awaiting_followup: '⏳',
  worsened: '📉',
  unchanged: '➡️',
};

const InterventionImpactPanel = ({ data }) => {
  const { t } = useI18n();

  if (!data) return null;

  const { summary, interventions = [] } = data;

  return (
    <div className="impact-panel">
      <header className="impact-header">
        <h2>{t('interventionImpactTitle')}</h2>
        <p className="impact-subtitle">{t('interventionImpactSubtitle')}</p>
        {summary?.headline && (
          <p className="impact-headline">{summary.headline}</p>
        )}
        {summary?.totalLogged > 0 && (
          <div className="impact-stats-row">
            <span className="impact-stat improved">{summary.improvedCount} {t('impactImproved')}</span>
            <span className="impact-stat awaiting">{summary.awaitingCount} {t('impactAwaiting')}</span>
            {summary.worsenedCount > 0 && (
              <span className="impact-stat worsened">{summary.worsenedCount} {t('impactWorsened')}</span>
            )}
          </div>
        )}
      </header>

      {interventions.length === 0 ? (
        <div className="impact-empty">
          <span>🔄</span>
          <p>{t('interventionImpactEmpty')}</p>
        </div>
      ) : (
        <div className="impact-list">
          {interventions.map((item) => (
            <article
              key={item.id}
              className={`impact-card status-${item.impact?.status || 'awaiting_followup'}`}
            >
              <div className="impact-card-top">
                <span className="impact-icon">{statusIcon[item.impact?.status] || '⏳'}</span>
                <div>
                  <h3>{item.concept}</h3>
                  {item.studentName && (
                    <p className="impact-student">{item.studentName}</p>
                  )}
                  <p className="impact-date">
                    {t('reteachLogged')}: {new Date(item.completedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <p className="impact-delta-label">{item.impact?.deltaLabel}</p>

              {item.baseline && (
                <div className="impact-metrics">
                  <div className="impact-metric">
                    <span className="metric-label">{t('beforeReteach')}</span>
                    <strong>{item.baseline.classAffectedPct}%</strong>
                    <span className="metric-hint">{t('classAffected')}</span>
                  </div>
                  {item.followUp ? (
                    <div className="impact-metric">
                      <span className="metric-label">{t('afterReteach')}</span>
                      <strong>{item.followUp.classAffectedPct}%</strong>
                      <span className="metric-hint">{t('classAffected')}</span>
                    </div>
                  ) : (
                    <div className="impact-metric awaiting">
                      <span className="metric-label">{t('afterReteach')}</span>
                      <strong>—</strong>
                      <span className="metric-hint">{t('gradeNextTest')}</span>
                    </div>
                  )}
                  {item.impact?.status === 'improved' && item.impact.relativeDrop > 0 && (
                    <div className="impact-metric highlight">
                      <span className="metric-label">{t('improvement')}</span>
                      <strong>−{item.impact.relativeDrop}%</strong>
                    </div>
                  )}
                </div>
              )}

              {item.actionDescription && (
                <p className="impact-action">{item.actionDescription}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterventionImpactPanel;
