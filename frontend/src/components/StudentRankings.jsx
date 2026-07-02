import { useState } from 'react';
import '../styles/StudentRankings.css';
import { useI18n } from '../i18n.jsx';

const StudentRankings = ({ rankings }) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState('all');
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
      <div className="rankings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>{t('studentPerformanceRankings')}</h2>
          <p className="rankings-subtitle">{t('topPerformers')}</p>
        </div>
        <div>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">{t('showAll')}</option>
            <option value="atRisk">{t('showAtRiskOnly')}</option>
          </select>
        </div>
      </div>

      <div className="rankings-table">
        <div className="table-header">
          <div className="col rank">{t('rank')}</div>
          <div className="col student">{t('student')}</div>
          <div className="col score">{t('score')}</div>
          <div className="col mistakes">{t('mistakes')}</div>
          <div className="col status">{t('status')}</div>
        </div>

        <div className="table-body">
          {rankings.filter(s => {
            if (filter === 'all') return true;
            return s.totalScore < 60;
          }).map((student, idx) => (
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
