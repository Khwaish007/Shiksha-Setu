import '../styles/PerformanceChart.css';

const PerformanceChart = ({ title, data, metrics }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <div className="chart-legend">
          <span className="legend-item excellent">Excellent {metrics.excellent}</span>
          <span className="legend-item good">Good {metrics.good}</span>
          <span className="legend-item average">Average {metrics.average}</span>
          <span className="legend-item poor">Needs Work {metrics.needsImprovement}</span>
        </div>
      </div>
      <div className="bars-container">
        {data.map((item, idx) => (
          <div key={idx} className="bar-item">
            <div className="bar-label">{item.range}</div>
            <div className="bar-wrapper">
              <div
                className="bar-fill"
                style={{
                  height: `${(item.count / maxCount) * 200}px`,
                  animation: `slideUp 0.6s ease-out ${idx * 0.1}s both`
                }}
              >
                <span className="bar-value">{item.count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceChart;
