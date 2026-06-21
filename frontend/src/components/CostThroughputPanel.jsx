import '../styles/CostThroughputPanel.css';
import { useI18n } from '../i18n.jsx';

const formatNumber = (n) => {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const CostThroughputPanel = ({ telemetry, compact = false }) => {
  const { t } = useI18n();

  if (!telemetry) return null;

  const { totals, lastBatch, pricing } = telemetry;
  const hasData = totals?.worksheetsGraded > 0;

  const displayTokens = hasData ? totals.totalTokens : 0;
  const displayCostPerSheet = hasData ? totals.costPerWorksheetInr : null;
  const displayThroughput = lastBatch?.throughputPerMin ?? totals.throughputPerMin ?? 0;

  return (
    <div className={`ctp-container ${compact ? 'ctp-compact' : ''}`}>
      <div className="ctp-header">
        <h2>{t('costThroughput')}</h2>
        {!compact && (
          <p className="ctp-subtitle">
            {hasData ? t('costThroughputLive') : t('costThroughputEmpty')}
          </p>
        )}
        {hasData && (
          <span className="ctp-live-badge">{t('live')}</span>
        )}
      </div>

      <div className="ctp-metrics-grid">
        <div className="ctp-metric-card">
          <div className="ctp-metric-icon">🔢</div>
          <div className="ctp-metric-value">{formatNumber(displayTokens)}</div>
          <div className="ctp-metric-label">{t('tokensUsed')}</div>
          {hasData && (
            <div className="ctp-metric-detail">
              {formatNumber(totals.inputTokens)} in · {formatNumber(totals.outputTokens)} out
            </div>
          )}
        </div>

        <div className="ctp-metric-card highlight">
          <div className="ctp-metric-icon">₹</div>
          <div className="ctp-metric-value">
            {displayCostPerSheet != null ? `₹${displayCostPerSheet}` : '—'}
          </div>
          <div className="ctp-metric-label">{t('costPerWorksheet')}</div>
          {hasData && (
            <div className="ctp-metric-detail">
              {t('totalSpend')}: ₹{totals.costInr} · {totals.worksheetsGraded} {t('worksheets')}
            </div>
          )}
        </div>

        <div className="ctp-metric-card">
          <div className="ctp-metric-icon">⚡</div>
          <div className="ctp-metric-value">
            {displayThroughput > 0 ? displayThroughput : '—'}
          </div>
          <div className="ctp-metric-label">{t('worksheetsPerMinute')}</div>
          {lastBatch && (
            <div className="ctp-metric-detail">
              {t('lastBatch')}: {lastBatch.worksheets} {t('in')} {(lastBatch.durationMs / 1000).toFixed(1)}s
            </div>
          )}
        </div>
      </div>

      {!compact && hasData && lastBatch && (
        <div className="ctp-last-batch">
          <span className="ctp-last-batch-label">{t('lastBatchRun')}</span>
          <span>{lastBatch.worksheets} worksheets</span>
          <span>·</span>
          <span>{formatNumber(lastBatch.totalTokens)} tokens</span>
          <span>·</span>
          <span>₹{lastBatch.costPerWorksheetInr}/sheet</span>
          <span>·</span>
          <span>{lastBatch.throughputPerMin} {t('perMin')}</span>
        </div>
      )}

      {!compact && pricing && (
        <div className="ctp-pricing-note">
          {t('pricingNote', {
            model: pricing.model?.replace('claude-', 'Claude ').replace(/-/g, ' ') || 'Claude Opus 4.1',
            rate: pricing.usdToInr,
          })}
        </div>
      )}
    </div>
  );
};

export default CostThroughputPanel;
