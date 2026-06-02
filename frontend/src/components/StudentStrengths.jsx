import '../styles/StudentStrengths.css';

const StudentStrengths = ({ students }) => {
  return (
    <div className="student-strengths-container">
      <div className="strengths-header">
        <h2>Student Profile Analysis</h2>
        <p className="strengths-subtitle">Individual strengths and improvement areas</p>
      </div>

      <div className="students-grid">
        {students && students.map((student, idx) => (
          <div
            key={idx}
            className={`student-card strength-risk-${student.riskLevel.toLowerCase()}`}
            style={{ animation: `slideInLeft 0.6s ease-out ${idx * 0.08}s both` }}
          >
            <div className="card-top">
              <div className="student-header">
                <h3 className="student-name">{student.studentName}</h3>
                <span className={`strength-badge badge-${student.riskLevel.toLowerCase()}`}>
                  {student.riskLevel}
                </span>
              </div>
              <div className="score-ring">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="ring-bg" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="ring-fill"
                    style={{ strokeDasharray: `${(student.score / 100) * 283} 283` }}
                  />
                </svg>
                <span className="score-text">{student.score}%</span>
              </div>
            </div>

            <div className="message-box">
              <p className="personalized-msg">"{student.personalizedMessage}"</p>
            </div>

            <div className="strengths-section">
              <h4 className="section-title">💪 Strengths</h4>
              <div className="areas-list">
                {student.strongAreas && student.strongAreas.length > 0 ? (
                  student.strongAreas.map((area, i) => (
                    <span key={i} className="area-tag strength">{area}</span>
                  ))
                ) : (
                  <span className="area-tag placeholder">None identified yet</span>
                )}
              </div>
            </div>

            <div className="weaknesses-section">
              <h4 className="section-title">🎯 Needs Improvement</h4>
              <div className="areas-list">
                {student.weakAreas && student.weakAreas.length > 0 ? (
                  student.weakAreas.map((area, i) => (
                    <span key={i} className="area-tag weakness">{area}</span>
                  ))
                ) : (
                  <span className="area-tag placeholder">All concepts mastered!</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentStrengths;
