import '../styles/PilotScalePlan.css';
import { useI18n } from '../i18n.jsx';

const PilotScalePlan = ({ plan }) => {
  const { t } = useI18n();

  if (!plan) return null;

  return (
    <div className="psp-container">
      <div className="psp-header">
        <h2>{t('pilotScalePlan')}</h2>
        <p className="psp-subtitle">{t('pilotScaleSubtitle')}</p>
      </div>

      {plan.liveMetrics && (
        <div className="psp-live-metrics">
          <span className="psp-live-label">{t('liveFromBatchRuns')}</span>
          <div className="psp-live-grid">
            <div className="psp-live-item">
              <strong>{plan.liveMetrics.worksheetsGraded}</strong> {t('worksheetsGraded')}
            </div>
            <div className="psp-live-item">
              <strong>₹{plan.liveMetrics.costPerWorksheetInr}</strong>/{t('worksheet')}
            </div>
            <div className="psp-live-item">
              <strong>{plan.liveMetrics.throughputPerMin}</strong> {t('worksheetsPerMinute')}
            </div>
            <div className="psp-live-item">
              <strong>{(plan.liveMetrics.totalTokens || 0).toLocaleString()}</strong> {t('tokens')}
            </div>
          </div>
        </div>
      )}

      <div className="psp-sections">
        {/* Deployment */}
        <section className="psp-section">
          <h3 className="psp-section-title">🚀 {plan.deployment?.title || t('deployment')}</h3>
          <ul className="psp-list">
            {(plan.deployment?.items || []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Unit economics */}
        <section className="psp-section">
          <h3 className="psp-section-title">💰 {plan.unitEconomics?.title || t('monthlyCost')}</h3>
          <table className="psp-table">
            <tbody>
              {(plan.unitEconomics?.rows || []).map((row, i) => (
                <tr key={i} className={row.label?.includes('Total') || row.label?.includes('Target') ? 'psp-row-highlight' : ''}>
                  <td className="psp-table-label">{row.label}</td>
                  <td className="psp-table-value">{row.value}</td>
                  <td className="psp-table-note">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Maintenance */}
        <section className="psp-section">
          <h3 className="psp-section-title">🔧 {plan.maintenance?.title || t('maintenance')}</h3>
          <ul className="psp-list">
            {(plan.maintenance?.items || []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Adoption path */}
        <section className="psp-section">
          <h3 className="psp-section-title">📈 {plan.adoptionPath?.title || t('adoptionPath')}</h3>
          <div className="psp-phases">
            {(plan.adoptionPath?.phases || []).map((phase, i) => (
              <div key={i} className="psp-phase-card">
                <div className="psp-phase-header">{phase.phase}</div>
                <div className="psp-phase-schools">{phase.schools}</div>
                <div className="psp-phase-goal">{phase.goal}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {plan.credibility?.note && (
        <div className="psp-credibility">
          <p>{plan.credibility.note}</p>
        </div>
      )}
    </div>
  );
};

export default PilotScalePlan;
