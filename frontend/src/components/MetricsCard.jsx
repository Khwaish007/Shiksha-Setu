import '../styles/MetricsCard.css';

const MetricsCard = ({ title, value, icon, color }) => {
  return (
    <div className={`metrics-card metrics-card-${color}`}>
      <div className="card-glow"></div>
      <div className="card-content">
        <div className="card-icon">{icon}</div>
        <div className="card-text">
          <h3 className="card-title">{title}</h3>
          <p className="card-value">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default MetricsCard;
