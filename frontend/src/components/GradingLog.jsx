
function GradingLog({ evaluationHistoryList }) {
  if (evaluationHistoryList.length === 0) return null;

  return (
    <div className="card-layout">
      <h2>3. Active Batch Evaluation Log Feed</h2>
      <table className="data-grid-table">
        <thead>
          <tr>
            <th>Student Document Name</th>
            <th>Calculated Score</th>
            <th>Extracted Deficiencies</th>
            <th>Execution Status</th>
          </tr>
        </thead>
        <tbody>
          {evaluationHistoryList.map((logItem, executionIndex) => (
            <tr key={executionIndex}>
              <td>{logItem.studentName}</td>
              <td>
                <span style={{ fontWeight: 'bold', color: logItem.totalScore >= 75 ? '#16a34a' : '#dc2626' }}>
                  {logItem.totalScore} / 100
                </span>
              </td>
              <td>
                {logItem.mistakes.length === 0 ? "None (Perfect Pass)" : (
                  logItem.mistakes.map((m, idx) => (
                    <span key={idx} style={{ display: 'block', fontSize: '0.9rem' }}>
                      • Q{m.questionNumber}: {m.conceptMissed}
                    </span>
                  ))
                )}
              </td>
              <td>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  background: logItem.status === 'Success' ? '#dcfce7' : '#fee2e2',
                  color: logItem.status === 'Success' ? '#15803d' : '#991b1b'
                }}>
                  {logItem.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GradingLog;