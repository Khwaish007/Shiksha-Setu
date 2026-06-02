import '../styles/AtRiskStudents.css';

const AtRiskStudents = ({ students }) => {
  return (
    <div className="atrisk-container">
      <div className="atrisk-header">
        <h2>At-Risk Students</h2>
        <p className="atrisk-subtitle">Students needing intervention and support</p>
      </div>

      <div className="atrisk-grid">
        {students && students.map((student, idx) => {
          const riskLevel = student.score < 40 ? 'CRITICAL' : student.score < 60 ? 'HIGH' : 'MEDIUM';
          return (
          <div key={idx} className={`atrisk-card risk-${riskLevel.toLowerCase()}`}>
            <div className="card-header">
              <h3 className="student-name-risk">{student.studentName}</h3>
              <span className={`risk-badge ${riskLevel.toLowerCase()}`}>{riskLevel}</span>
            </div>

            <div className="score-display">
              <div className="score-number">{student.score}%</div>
              <div className="score-label">Current Score</div>
            </div>

            <div className="weak-areas">
              <div className="areas-title">Problem Areas</div>
              <div className="areas-tags">
                {student.topMistakes && student.topMistakes.length > 0 ? (
                  student.topMistakes.map((area, i) => (
                    <span key={i} className="area-tag">{area}</span>
                  ))
                ) : (
                  <span className="area-tag">No specific weak areas</span>
                )}
              </div>
            </div>

            <div className="intervention-section">
              <div className="intervention-type">Intervention Type:</div>
              <div className="intervention-desc">{student.interventionType}</div>
            </div>

            <div className="study-hours">⏱️ Estimated Study Hours: {student.estimatedStudyHours}</div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default AtRiskStudents;
