import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';
import { useI18n } from '../i18n.jsx';
import '../styles/RiskForecast.css';

const RiskForecast = () => {
  const { t } = useI18n();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await analyticsAPI.getAllStudents();
      setStudents(data);
    } catch (err) {
      console.error("Failed to fetch students for forecast", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleRunAssessment = async () => {
    try {
      setAssessing(true);
      await analyticsAPI.assessCohortRisk();
      await fetchStudents();
    } catch (err) {
      console.error("Failed to assess risk", err);
      alert(t('failedRiskAssessment'));
    } finally {
      setAssessing(false);
    }
  };

  const getTrendArrow = (tests) => {
    if (!tests || tests.length < 2) return "→";
    const recent = tests.slice(-3).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (recent.length < 2) return "→";
    const diff = recent[recent.length - 1].score - recent[0].score;
    if (diff > 5) return "↑";
    if (diff < -5) return "↓";
    return "→";
  };

  const getTrendColor = (arrow) => {
    if (arrow === "↑") return "#34d399";
    if (arrow === "↓") return "#ef4444";
    return "#9ca3af";
  };

  if (loading) return <div className="forecast-loading">{t('loadingPredictiveForecast')}</div>;

  const highRisk = students.filter(s => s.riskTier === 'high');
  const mediumRisk = students.filter(s => s.riskTier === 'medium');
  const lowRisk = students.filter(s => s.riskTier === 'low');
  const unassessed = students.filter(s => !s.riskTier || s.riskTier === 'unassessed');

  const needsAttentionCount = highRisk.length + mediumRisk.length;

  return (
    <div className="content-section forecast-panel">
      <div className="forecast-header">
        <div>
          <h2>{t('predictiveRiskForecast')}</h2>
          <p className="forecast-subtitle">
            <span className="attention-count">{t('studentsNeedAttention', { count: needsAttentionCount })}</span>
          </p>
        </div>
        <button 
          className="run-assessment-btn"
          onClick={handleRunAssessment}
          disabled={assessing}
        >
          {assessing ? t('analyzingCohort') : t('runAiRiskAssessment')}
        </button>
      </div>

      <div className="forecast-columns">
        {/* High Risk */}
        <div className="forecast-col high-risk-col">
          <div className="col-header">
            <h3>🔴 {t('highRisk')} ({highRisk.length})</h3>
          </div>
          <div className="student-cards">
            {highRisk.map(s => {
              const arrow = getTrendArrow(s.tests);
              return (
                <motion.div 
                  key={s._id} 
                  className="student-risk-card high-risk-card"
                  whileHover={{ scale: 1.02 }}
                  title={s.riskReason || t('noReasonProvided')}
                >
                  <div className="card-top">
                    <span className="student-name">{s.studentName}</span>
                    <span className="trend-arrow" style={{ color: getTrendColor(arrow) }}>{arrow}</span>
                  </div>
                  {s.riskRecommendedAction && (
                    <div className="recommended-action">{t('action')}: {s.riskRecommendedAction}</div>
                  )}
                  <div className="pulse-ring"></div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Medium Risk */}
        <div className="forecast-col medium-risk-col">
          <div className="col-header">
            <h3>🟡 {t('mediumRisk')} ({mediumRisk.length})</h3>
          </div>
          <div className="student-cards">
            {mediumRisk.map(s => {
              const arrow = getTrendArrow(s.tests);
              return (
                <motion.div 
                  key={s._id} 
                  className="student-risk-card medium-risk-card"
                  whileHover={{ scale: 1.02 }}
                  title={s.riskReason || t('noReasonProvided')}
                >
                  <div className="card-top">
                    <span className="student-name">{s.studentName}</span>
                    <span className="trend-arrow" style={{ color: getTrendColor(arrow) }}>{arrow}</span>
                  </div>
                  {s.riskRecommendedAction && (
                    <div className="recommended-action">{t('action')}: {s.riskRecommendedAction}</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Low Risk */}
        <div className="forecast-col low-risk-col">
          <div className="col-header">
            <h3>🟢 {t('lowRisk')} ({lowRisk.length})</h3>
          </div>
          <div className="student-cards">
            {lowRisk.map(s => {
              const arrow = getTrendArrow(s.tests);
              return (
                <motion.div 
                  key={s._id} 
                  className="student-risk-card low-risk-card"
                  whileHover={{ scale: 1.02 }}
                  title={s.riskReason || t('noReasonProvided')}
                >
                  <div className="card-top">
                    <span className="student-name">{s.studentName}</span>
                    <span className="trend-arrow" style={{ color: getTrendColor(arrow) }}>{arrow}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
      
      {unassessed.length > 0 && (
        <div className="unassessed-alert">
          {t('unassessedStudents', { count: unassessed.length })}
        </div>
      )}
    </div>
  );
};

export default RiskForecast;
