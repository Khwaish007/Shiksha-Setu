import '../styles/StudentRankings.css';

const StudentRankings = ({ rankings }) => {
  const getMedalIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
  };

  return (
    <div className="rankings-container">
      <div className="rankings-header">
        <h2>Student Performance Rankings</h2>
        <p className="rankings-subtitle">Top performers in your class</p>
      </div>

      <div className="rankings-table">
        <div className="table-header">
          <div className="col rank">Rank</div>
          <div className="col student">Student</div>
          <div className="col score">Score</div>
          <div className="col mistakes">Mistakes</div>
          <div className="col status">Status</div>
        </div>

        <div className="table-body">
          {rankings.map((student, idx) => (
            <div
              key={idx}
              className={`table-row rank-${student.rank} performance-${getPerformanceColor(student.totalScore)}`}
              style={{
                animation: `slideInLeft 0.5s ease-out ${idx * 0.08}s both`
              }}
            >
              <div className="col rank">
                <span className="medal">{getMedalIcon(student.rank)}</span>
                <span className="rank-number">{student.rank}</span>
              </div>
              <div className="col student">
                <span className="student-name">{student.studentName}</span>
              </div>
              <div className="col score">
                <div className="score-display">
                  <span className="score-value">{student.totalScore}%</span>
                </div>
              </div>
              <div className="col mistakes">
                <span className="mistake-count">{student.mistakeCount}</span>
              </div>
              <div className="col status">
                <span className={`status-badge status-${student.status.toLowerCase().replace(/\s/g, '-')}`}>
                  {student.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentRankings;
