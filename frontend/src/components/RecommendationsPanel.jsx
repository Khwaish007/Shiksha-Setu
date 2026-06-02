import React from 'react';
import '../styles/RecommendationsPanel.css';

const RecommendationsPanel = ({ recommendations, thresholds }) => {
  const normalizePriority = (priority) => String(priority || '').toUpperCase().replace(/\s+/g, '_');

  const getCategory = (item) => {
    const percent = Number(item.percentageOfClass) || 0;

    if (thresholds) {
      if (percent >= (thresholds.p75 ?? Infinity)) return 'VERY_HIGH';
      if (percent >= (thresholds.p50 ?? Infinity)) return 'HIGH';
      if (percent >= (thresholds.p25 ?? Infinity)) return 'MEDIUM';
      return 'LOW';
    }

    return normalizePriority(item.categoryKey || item.intensityLabel || item.priority || item.displayPriority || item.categoryLabel);
  };

  const formatPriorityLabel = (priority) => {
    const normalized = normalizePriority(priority);
    if (normalized === 'VERY_HIGH') return 'Very High';
    if (normalized === 'HIGH') return 'High';
    if (normalized === 'MEDIUM') return 'Medium';
    if (normalized === 'LOW') return 'Low';
    return priority || 'Unknown';
  };

  const getPriorityIcon = (priority) => {
    switch(normalizePriority(priority)) {
      case 'VERY_HIGH': return '●';
      case 'HIGH': return '●';
      case 'MEDIUM': return '●';
      case 'LOW': return '●';
      default: return '○';
    }
  };

  // Sort by priority
  const sorted = [...recommendations].sort((a, b) => {
    const order = { VERY_HIGH: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[getCategory(a)] - order[getCategory(b)];
  });

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h2>Teacher Focus Recommendations</h2>
        <p className="recommendations-subtitle">Prioritized topics for remedial focus</p>
      </div>

      <div className="recommendations-list">
        {sorted.map((item, idx) => (
          <div
            key={idx}
            className={`recommendation-card priority-${getCategory(item).toLowerCase()}`}
            style={{
              animation: `slideIn 0.5s ease-out ${idx * 0.1}s both`
            }}
          >
            <div className="rec-header">
              <span className={`priority-icon priority-icon-${getCategory(item).toLowerCase()}`}>
                {getPriorityIcon(getCategory(item))}
              </span>
              <h3 className="rec-topic">{item.topic}</h3>
              <span className="priority-badge">{formatPriorityLabel(getCategory(item))}</span>
            </div>

            <div className="rec-stats">
              <div className="stat-item">
                <span className="stat-label">Students Affected</span>
                <span className="stat-value">{item.studentsAffected}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Class Percentage</span>
                <span className="stat-value">{item.percentageOfClass}%</span>
              </div>
            </div>

            <div className="rec-action">
              <p className="recommendation-text">{item.recommendation}</p>
              <button 
                className="practice-test-btn"
                onClick={() => {
                  const formattedTopic = item.topic.toLowerCase().replace(/\s+/g, '_');
                  const pdfUrl = `/practice_tests_pdf/${formattedTopic}_practice_test.pdf`;
                  window.open(pdfUrl, '_blank');
                }}
              >
                Create Practice Test
              </button>
            </div>

            <div className="rec-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${item.percentageOfClass}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationsPanel;
