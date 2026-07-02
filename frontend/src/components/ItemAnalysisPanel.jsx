import '../styles/ItemAnalysisPanel.css';
import { useI18n } from '../i18n.jsx';

const flagClass = (flag) => {
  const map = {
    good: 'flag-good',
    acceptable: 'flag-acceptable',
    too_easy: 'flag-easy',
    too_hard: 'flag-hard',
    poor_discriminator: 'flag-poor',
    negative_discriminator: 'flag-negative',
    insufficient_data: 'flag-neutral',
  };
  return map[flag] || 'flag-neutral';
};

const ItemAnalysisPanel = ({ data }) => {
  const { t } = useI18n();

  if (!data) return null;

  const { questions = [], totalStudents, groupSize, insufficientSample, summary, insights, hasAnswerKey } = data;

  if (totalStudents === 0) {
    return (
      <div className="item-analysis-container">
        <div className="item-analysis-empty">
          <span>📊</span>
          <h2>{t('itemAnalysisTitle')}</h2>
          <p>{t('itemAnalysisEmpty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="item-analysis-container">
      <header className="item-analysis-header">
        <h2>{t('itemAnalysisTitle')}</h2>
        <p className="item-analysis-subtitle">{t('itemAnalysisSubtitle')}</p>
        <div className="item-analysis-meta">
          <span>{t('itemAnalysisStudents', { count: totalStudents })}</span>
          <span>{t('itemAnalysisGroupSize', { count: groupSize })}</span>
          {hasAnswerKey && <span className="meta-badge">{t('itemAnalysisAnswerKeyLinked')}</span>}
          {insufficientSample && <span className="meta-warning">{t('itemAnalysisSmallSample')}</span>}
        </div>
      </header>

      {insights?.length > 0 && (
        <div className="item-analysis-insights">
          <h3>💡 {t('keyInsights')}</h3>
          <ul>
            {insights.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="item-analysis-legend">
        <span><strong>p</strong> = {t('difficultyIndexLegend')}</span>
        <span><strong>D</strong> = {t('discriminationIndexLegend')}</span>
      </div>

      <div className="item-analysis-table-wrap">
        <table className="item-analysis-table">
          <thead>
            <tr>
              <th>{t('question')}</th>
              <th>{t('concept')}</th>
              <th title={t('difficultyIndexLegend')}>p</th>
              <th title={t('discriminationIndexLegend')}>D</th>
              <th>{t('correct')}</th>
              <th>{t('itemQuality')}</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.questionNumber} className={flagClass(q.qualityFlag)}>
                <td className="col-q">{q.questionNumber}</td>
                <td className="col-concept">{q.concept}</td>
                <td className="col-p">
                  <div className="p-bar-wrap">
                    <div className="p-bar" style={{ width: `${q.pValuePercent}%` }} />
                    <span>{q.pValuePercent}%</span>
                  </div>
                </td>
                <td className={`col-d ${q.discriminationIndex < 0.2 ? 'd-low' : 'd-ok'}`}>
                  {q.discriminationIndex >= 0 ? '+' : ''}{q.discriminationIndex.toFixed(2)}
                </td>
                <td className="col-n">{q.correctCount}/{q.n}</td>
                <td className="col-flag">
                  <span className={`quality-pill ${flagClass(q.qualityFlag)}`}>
                    {t(`itemFlag_${q.qualityFlag}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(summary?.negativeDiscriminators?.length > 0 || summary?.poorDiscriminators?.length > 0) && (
        <div className="item-analysis-action-box">
          <h3>🔍 {t('itemAnalysisActionTitle')}</h3>
          <ul>
            {summary.negativeDiscriminators?.map((q) => (
              <li key={`neg-${q}`}>{t('itemActionNegative', { question: q })}</li>
            ))}
            {summary.poorDiscriminators?.map((q) => (
              <li key={`poor-${q}`}>{t('itemActionPoor', { question: q })}</li>
            ))}
            {summary.tooEasy?.map((q) => (
              <li key={`easy-${q}`}>{t('itemActionEasy', { question: q })}</li>
            ))}
            {summary.tooHard?.map((q) => (
              <li key={`hard-${q}`}>{t('itemActionHard', { question: q })}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ItemAnalysisPanel;
