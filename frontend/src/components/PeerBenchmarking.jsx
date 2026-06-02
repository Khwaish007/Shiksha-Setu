import '../styles/PeerBenchmarking.css';

const PeerBenchmarking = ({ benchmarks }) => {
  const getPercentileColor = (percentile) => {
    if (percentile >= 80) return '#10b981';
    if (percentile >= 60) return '#3b82f6';
    if (percentile >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="benchmarking-container">
      <div className="benchmarking-header">
        <h2>Peer Performance Comparison</h2>
        <p className="benchmarking-subtitle">How each student ranks within the class</p>
      </div>

      <div className="benchmarks-list">
        {benchmarks && benchmarks.map((student, idx) => (
          <div
            key={idx}
            className="benchmark-card"
            style={{
              animation: `slideInLeft 0.5s ease-out ${idx * 0.08}s both`,
              borderLeftColor: getPercentileColor(student.percentile)
            }}
          >
            <div className="benchmark-row">
              <div className="student-rank">
                <span className="rank-position">#{idx + 1}</span>
              </div>

              <div className="student-info-bench">
                <h3 className="student-name-bench">{student.studentName}</h3>
                <span className="performance-level">{student.performanceLevel}</span>
              </div>

              <div className="percentile-display">
                <div className="percentile-value">{student.percentile}th</div>
                <div className="percentile-label">Percentile</div>
              </div>

              <div className="score-comparison">
                <span className="score-badge">{student.score}%</span>
                <span className={`vs-average ${student.vsClassAverage >= 0 ? 'above' : 'below'}`}>
                  {student.vsClassAverage >= 0 ? '+' : ''}{student.vsClassAverage} vs Avg
                </span>
              </div>
            </div>

            <div className="peers-section">
              <span className="peers-label">Similar Performers:</span>
              <div className="peers-list">
                {student.peers && student.peers.length > 0 ? (
                  student.peers.map((peer, i) => (
                    <span key={i} className="peer-tag">{peer}</span>
                  ))
                ) : (
                  <span className="peer-tag placeholder">None in similar range</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PeerBenchmarking;
