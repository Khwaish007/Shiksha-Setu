import '../styles/PerformanceStats.css';

const PerformanceStats = ({ distribution }) => {
  return (
    <div className="performance-stats-container">
      <div className="stats-header">
        <h2>Performance Distribution Analysis</h2>
        <p className="stats-subtitle">Statistical insights into class performance patterns</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">Minimum Score</span>
              <span className="stat-value">{distribution.min}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Maximum Score</span>
              <span className="stat-value">{distribution.max}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Score Range</span>
              <span className="stat-value">{distribution.max - distribution.min}%</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">Mean (Average)</span>
              <span className="stat-value">{distribution.mean}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Median (Middle)</span>
              <span className="stat-value">{distribution.median}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Std Deviation</span>
              <span className="stat-value">{distribution.stdDev}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">Distribution Type</span>
              <span className="stat-value">{distribution.distributionType || 'Normal'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Bimodal Pattern</span>
              <span className="stat-value">{distribution.bimodal ? 'Yes' : 'No'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Skewness</span>
              <span className="stat-value" style={{ textTransform: 'capitalize' }}>{distribution.skewness}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="insights-box">
        <h3 className="insights-title">💡 Key Insights</h3>
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
        <h3 className="interpretation-title">🔍 What This Means</h3>
        <div className="interpretation-content">
          {distribution.mean === distribution.median ? (
            <p>The class shows a symmetric distribution with consistent performance.</p>
          ) : distribution.mean > distribution.median ? (
            <p>High performers are pulling the average up. Most students score below the average.</p>
          ) : (
            <p>Most students perform above average. Only a few low performers bring down the mean.</p>
          )}

          {distribution.stdDev > 15 ? (
            <p>High variance indicates diverse performance levels. Students need differentiated instruction.</p>
          ) : (
            <p>Low variance shows consistent performance across the class. Good for cohort-level instruction.</p>
          )}

          {distribution.bimodal ? (
            <p>Bimodal distribution suggests two distinct groups: strong performers and struggling students. Consider forming ability-based groups.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PerformanceStats;
