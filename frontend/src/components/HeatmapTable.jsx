
function HeatmapTable({ matrixDataset }) {
  return (
    <div className="card-layout">
      <h2>2. Classroom Concept Heatmap Matrix</h2>
      <p style={{ color: '#64748b', marginTop: '-8px', marginBottom: '20px' }}>
        Aggregated metrics identifying common student systematic failures. Row saturation scales with the number of affected students.
      </p>
      {matrixDataset.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}> No database metrics found. Upload worksheets to construct heatmap view.</p>
      ) : (
        <table className="data-grid-table">
          <thead>
            <tr>
              <th>Identified Conceptual Gap</th>
              <th>Impacted Questions</th>
              <th>Struggling Student Volume</th>
              <th>Intervention Status</th>
            </tr>
          </thead>
          <tbody>
            {matrixDataset.map((rowItem, metricIndex) => {
              // Dynamically adjust color opacity based on volume weight factors
              const densityFactor = Math.min(rowItem.totalStudentsAffected * 0.15, 0.75);
              return (
                <tr 
                  key={metricIndex} 
                  style={{ backgroundColor: `rgba(239, 68, 68, ${densityFactor})` }}
                >
                  <td><strong>{rowItem._id}</strong></td>
                  <td>{rowItem.questionReferences.join(', ')}</td>
                  <td>{rowItem.totalStudentsAffected}</td>
                  <td>
                    <span style={{
                      fontWeight: 'bold',
                      color: rowItem.totalStudentsAffected > 2 ? '#991b1b' : '#1e293b'
                    }}>
                      {rowItem.totalStudentsAffected > 2 ? "🚨 High Priority Review" : "Monitor Trend"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default HeatmapTable;