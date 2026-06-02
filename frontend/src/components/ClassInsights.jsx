import '../styles/ClassInsights.css';

const ClassInsights = ({ classData }) => {
  return (
    <div className="class-insights-container">
      <div className="insights-header">
        <h2>Class Collective Insights</h2>
        <p className="insights-subtitle">What the entire class excels at and struggles with</p>
      </div>

      <div className="insights-grid">
        <div className="insight-card strength-card">
          <div className="card-icon">💪</div>
          <h3 className="card-title">Class Strengths</h3>
          <p className="card-description">Topics where majority of students excel</p>

          <div className="insights-list">
            {classData && classData.classStrengths && classData.classStrengths.map((strength, idx) => (
              <div key={idx} className="insight-item strength-item">
                <div className="item-rank">{idx + 1}</div>
                <div className="item-content">
                  <h4>{strength.topic}</h4>
                  <span className="item-stat">{strength.mistakesCount} mistakes</span>
                </div>
                <div className="success-badge">✅</div>
              </div>
            ))}
          </div>
        </div>

        <div className="insight-card weakness-card">
          <div className="card-icon">⚠️</div>
          <h3 className="card-title">Class Weaknesses</h3>
          <p className="card-description">Topics needing class-wide intervention</p>

          <div className="insights-list">
            {classData && classData.classWeaknesses && classData.classWeaknesses.map((weakness, idx) => (
              <div key={idx} className="insight-item weakness-item">
                <div className="item-rank">{idx + 1}</div>
                <div className="item-content">
                  <h4>{weakness.topic}</h4>
                  <span className="item-stat">{weakness.mistakesCount} mistakes</span>
                </div>
                <div className="warning-badge">⚠️</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {classData && classData.overallTrend && (
        <div className="trend-section">
          <h3>📊 Overall Class Trend</h3>
          <p className="trend-text">{classData.overallTrend}</p>
        </div>
      )}
    </div>
  );
};

export default ClassInsights;
