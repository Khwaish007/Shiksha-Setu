import '../styles/ReteachTomorrowSummary.css';
import { useI18n } from '../i18n.jsx';

const ReteachTomorrowSummary = ({ summary }) => {
  const { t } = useI18n();

  if (!summary) return null;

  return (
    <div className="reteach-summary-container">
      <div className="reteach-summary-header">
        <div className="reteach-summary-icon">📅</div>
        <div>
          <h2 className="reteach-summary-title">{t('reteachTomorrow')}</h2>
          <p className="reteach-summary-text">{summary.summaryText}</p>
        </div>
        {summary.atRiskCount > 0 && (
          <span className="reteach-at-risk-badge">
            {summary.atRiskCount} {t('atRisk').toLowerCase()}
          </span>
        )}
      </div>

      {summary.tomorrowFocus?.length > 0 && (
        <div className="reteach-focus-list">
          {summary.tomorrowFocus.map((item, idx) => (
            <div
              key={idx}
              className={`reteach-focus-item priority-${(item.priority || 'LOW').toLowerCase()}`}
            >
              <div className="reteach-focus-top">
                <span className="reteach-focus-rank">#{idx + 1}</span>
                <span className="reteach-focus-topic">{item.topic}</span>
                <span className="reteach-focus-pct">{item.percentageOfClass}%</span>
              </div>
              <p className="reteach-focus-action">{item.action}</p>
              <div className="reteach-focus-meta">
                <span>{item.studentsAffected} {t('studentsAffected').toLowerCase()}</span>
                {item.practicePdfPath && (
                  <button
                    className="reteach-pdf-link"
                    onClick={() => window.open(item.practicePdfPath, '_blank')}
                  >
                    📥 {t('practicePdf')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReteachTomorrowSummary;
