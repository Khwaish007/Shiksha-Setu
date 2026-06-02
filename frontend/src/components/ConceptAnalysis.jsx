import '../styles/ConceptAnalysis.css';
import { analyticsAPI } from '../api/analyticsAPI';

const ConceptAnalysis = ({ analysis }) => {
  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'VERY HARD': return '#dc2626';
      case 'HARD': return '#f97316';
      case 'MODERATE': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch(difficulty) {
      case 'VERY HARD': return '⛔';
      case 'HARD': return '⚠️';
      case 'MODERATE': return '📌';
      default: return '✅';
    }
  };

  const handleCreatePracticeSet = async (concept) => {
    try {
      const blob = await analyticsAPI.getPracticeTest(concept);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to create practice set:', error);
      alert('Failed to create practice set. Please try again.');
    }
  };

  // Sort by failure frequency
  const sorted = [...analysis].sort((a, b) => b.failureFrequency - a.failureFrequency);

  return (
    <div className="concept-analysis-container">
      <div className="analysis-header">
        <h2>Concept Difficulty Analysis</h2>
        <p className="analysis-subtitle">Deep dive into which concepts are most challenging</p>
      </div>

      <div className="analysis-grid">
        {sorted.map((concept, idx) => (
          <div
            key={idx}
            className={`concept-card difficulty-${concept.difficulty.toLowerCase().replace(/\s/g, '-')}`}
            style={{
              animation: `fadeInUp 0.6s ease-out ${idx * 0.12}s both`
            }}
          >
            <div className="card-header">
              <span className="difficulty-icon">{getDifficultyIcon(concept.difficulty)}</span>
              <h3 className="concept-name">{concept.concept}</h3>
              <span className="difficulty-label">{concept.difficulty}</span>
            </div>

            <div className="card-body">
              <div className="metric">
                <div className="metric-label">Failure Frequency</div>
                <div className="metric-value">{concept.failureFrequency}</div>
                <div className="metric-bar">
                  <div
                    className="metric-bar-fill"
                    style={{
                      width: `${Math.min((concept.failureFrequency / 10) * 100, 100)}%`,
                      backgroundColor: getDifficultyColor(concept.difficulty)
                    }}
                  ></div>
                </div>
              </div>

              <div className="metric">
                <div className="metric-label">Unique Students Affected</div>
                <div className="metric-value">{concept.uniqueStudentsAffected}</div>
              </div>

              <div className="metric">
                <div className="metric-label">Avg Score of Affected Students</div>
                <div className="metric-value">{concept.averageScoreOfAffectedStudents}%</div>
                <div className="score-indicator" style={{
                  backgroundColor: concept.averageScoreOfAffectedStudents >= 60 ? '#10b981' : '#ef4444'
                }}></div>
              </div>
            </div>

            <div className="card-action">
              <button className="action-btn" onClick={() => handleCreatePracticeSet(concept.concept)}>Create Practice Set</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConceptAnalysis;
