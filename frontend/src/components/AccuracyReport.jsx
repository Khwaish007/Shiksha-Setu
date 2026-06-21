import { useState } from 'react';
import { analyticsAPI } from '../api/analyticsAPI.js';
import { useI18n } from '../i18n.jsx';
import '../styles/AccuracyReport.css';

const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const formatDate = (value) => {
  if (!value) return 'Not run yet';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getErrorMessage = (error, fallback) => {
  if (error?.response?.status === 504) {
    return 'Vercel timed out while waiting for Claude. Try again once, or run the full benchmark from the backend CLI where there is no serverless timeout.';
  }

  const responseError = error?.response?.data?.error || error?.response?.data || error?.message;
  if (!responseError) return fallback;
  if (typeof responseError === 'string') return responseError;
  if (typeof responseError.message === 'string') return responseError.message;
  if (typeof responseError.code === 'string') return `${responseError.code}: ${fallback}`;
  return fallback;
};

function AccuracyReport({ benchmark, report, onReportUpdated }) {
  const { t } = useI18n();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  const runBenchmark = async (mode = 'live') => {
    setIsRunning(true);
    setError('');

    try {
      const maxCases = mode === 'live' ? 1 : 12;
      const nextReport = await analyticsAPI.runAccuracyReport({ maxCases, mode });
      await onReportUpdated?.(nextReport);
    } catch (runError) {
      console.error('Accuracy benchmark failed:', runError);
      setError(getErrorMessage(runError, t('accuracyRunFailed')));
    } finally {
      setIsRunning(false);
    }
  };

  const cases = report?.cases || [];

  return (
    <section className="accuracy-report-shell">
      <div className="accuracy-report-header">
        <div>
          <span className="accuracy-kicker">{t('validationHarness')}</span>
          <h2>{t('accuracyReportTitle')}</h2>
          <p>{t('accuracyReportSubtitle')}</p>
        </div>
        <div className="accuracy-actions">
          <button
            type="button"
            className="accuracy-run-button"
            onClick={() => runBenchmark('live')}
            disabled={isRunning}
          >
            {isRunning ? t('runningBenchmark') : t('runSingleLiveCase')}
          </button>
          <button
            type="button"
            className="accuracy-mock-button"
            onClick={() => runBenchmark('mock')}
            disabled={isRunning}
          >
            {t('testUiRun')}
          </button>
        </div>
      </div>

      {error && <div className="accuracy-error">{error}</div>}

      <div className="accuracy-dataset-note">
        <strong>{benchmark?.title || t('accuracyBenchmark')}</strong>
        <span>
          {benchmark?.availableCases || 0}/{benchmark?.totalCases || 0} {t('benchmarkCasesAvailable')}
        </span>
      </div>

      {report ? (
        <>
          <div className="accuracy-metric-grid">
            <div className="accuracy-metric">
              <span>{t('scoreMae')}</span>
              <strong>{report.scoreMae ?? 0}</strong>
              <small>{t('pointsAverageError')}</small>
            </div>
            <div className="accuracy-metric">
              <span>{t('conceptPrecision')}</span>
              <strong>{percent(report.conceptPrecision)}</strong>
              <small>{t('reportedConceptsCorrect')}</small>
            </div>
            <div className="accuracy-metric">
              <span>{t('conceptRecall')}</span>
              <strong>{percent(report.conceptRecall)}</strong>
              <small>{t('humanConceptsFound')}</small>
            </div>
            <div className="accuracy-metric">
              <span>{t('manualReviewRate')}</span>
              <strong>{percent(report.manualReviewRate)}</strong>
              <small>{t('manualReviewRateHint')}</small>
            </div>
            <div className="accuracy-metric">
              <span>{t('teacherReviewRate')}</span>
              <strong>{percent(report.teacherReviewRate)}</strong>
              <small>{t('teacherReviewRateHint')}</small>
            </div>
          </div>

          <div className="accuracy-report-meta">
            <span>{t('lastRun')}: {formatDate(report.createdAt)}</span>
            <span>{t('runMode')}: {report.runMode}</span>
            <span>{t('cases')}: {report.totalCases}</span>
          </div>

          {report.notes && <p className="accuracy-notes">{report.notes}</p>}

          <div className="accuracy-table-wrap">
            <table className="accuracy-table">
              <thead>
                <tr>
                  <th>{t('case')}</th>
                  <th>{t('expected')}</th>
                  <th>{t('actual')}</th>
                  <th>{t('scoreError')}</th>
                  <th>{t('missedConcepts')}</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.caseId}>
                    <td>
                      <strong>{item.caseId}</strong>
                      <span>{item.studentName}</span>
                    </td>
                    <td>
                      <strong>{item.expectedScore}%</strong>
                      <span>{item.expectedStatus}</span>
                    </td>
                    <td>
                      <strong>{Math.round(Number(item.actualScore) || 0)}%</strong>
                      <span>{item.actualStatus}</span>
                    </td>
                    <td>{item.scoreError ?? '-'}</td>
                    <td>
                      <div className="accuracy-concepts">
                        {(item.falseNegativeConcepts || []).length > 0
                          ? item.falseNegativeConcepts.map(concept => <mark key={`${item.caseId}-${concept}`}>{concept}</mark>)
                          : <span>{t('none')}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="accuracy-empty">
          <h3>{t('accuracyNoReportTitle')}</h3>
          <p>{t('accuracyNoReportBody')}</p>
        </div>
      )}
    </section>
  );
}

export default AccuracyReport;
