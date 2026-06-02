import { useMemo, useState } from 'react';
import '../styles/ConceptHeatmap.css';

const LEVELS = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
  { key: 'very_high', label: 'Very High' }
];

const ConceptHeatmap = ({ data, thresholds }) => {
  const maxStudents = useMemo(() => Math.max(...data.map(d => d.totalStudentsAffected), 1), [data]);

  // Use backend-provided intensity when available. Fallback to percentage-based.
  const getPercent = (item) => {
    if (typeof item.percentageOfClass === 'number') return item.percentageOfClass;
    return Math.round((item.totalStudentsAffected / maxStudents) * 100);
  };

  const mapIntensityToClass = (intensityKey) => {
    // Keep existing CSS classname 'intense' for the top bucket
    if (intensityKey === 'very_high') return 'intense';
    return intensityKey;
  };

  const getIntensity = (item) => {
    const percent = getPercent(item);
    if (thresholds) {
      if (percent >= (thresholds.p75 ?? Infinity)) return 'very_high';
      if (percent >= (thresholds.p50 ?? Infinity)) return 'high';
      if (percent >= (thresholds.p25 ?? Infinity)) return 'medium';
      return 'low';
    }

    // Accept either `categoryKey`, `intensityLabel`, or `intensity` fields from backend
    const backendLabel = item.categoryKey || item.intensityLabel || item.intensity;
    if (backendLabel) return backendLabel;

    if (percent > 75) return 'very_high';
    if (percent > 50) return 'high';
    if (percent > 30) return 'medium';
    return 'low';
  };

  const [enabled, setEnabled] = useState(() => new Set(LEVELS.map(l => l.key)));

  const toggleLevel = (key) => {
    setEnabled(prev => {
      const copy = new Set(prev);
      if (copy.has(key)) copy.delete(key);
      else copy.add(key);
      return copy;
    });
  };

  const visibleItems = data.filter(item => enabled.has(getIntensity(item)));

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <h2>Concept Difficulty Heatmap</h2>
        <p className="heatmap-subtitle">Darker = More students struggling</p>
      </div>

      <div className="heatmap-grid">
        {visibleItems.map((item, idx) => (
          <div
            key={idx}
            className={`heatmap-cell intensity-${mapIntensityToClass(getIntensity(item))}`}
            title={`${item._id}: ${item.totalStudentsAffected} students (${getPercent(item)}%)`}
          >
            <div className="cell-content">
              <h4 className="cell-topic">{item._id}</h4>
              <div className="cell-stats">
                <span className="stat-number">{item.totalStudentsAffected}</span>
                <span className="stat-label">students</span>
                {typeof item.percentageOfClass === 'number' && (
                  <span className="stat-percent">{item.percentageOfClass}%</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {visibleItems.length === 0 && (
          <div className="heatmap-empty">No concepts match the selected filters.</div>
        )}
      </div>

      <div className="heatmap-legend" role="toolbar" aria-label="Filter difficulty levels">
        {LEVELS.map(level => (
          <button
            key={level.key}
            type="button"
            className={`legend-toggle ${enabled.has(level.key) ? 'on' : 'off'}`}
            onClick={() => toggleLevel(level.key)}
            aria-pressed={enabled.has(level.key)}
          >
            <span className={`legend-swatch ${level.key}`} aria-hidden="true" />
            <span className="legend-label">{level.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConceptHeatmap;
