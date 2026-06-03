import { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import MetricsCard from './MetricsCard';
import PerformanceChart from './PerformanceChart';
import ConceptHeatmap from './ConceptHeatmap';
import RecommendationsPanel from './RecommendationsPanel';
import StudentRankings from './StudentRankings';

import AtRiskStudents from './AtRiskStudents';
import StudentStrengths from './StudentStrengths';
import ClassInsights from './ClassInsights';
import PeerBenchmarking from './PeerBenchmarking';
import PerformanceStats from './PerformanceStats';
import ClassMisconceptions from './ClassMisconceptions';
import RiskForecast from './RiskForecast';
import { analyticsAPI } from '../api/analyticsAPI';

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapThresholds, setHeatmapThresholds] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationThresholds, setRecommendationThresholds] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [conceptAnalysis, setConceptAnalysis] = useState(null);
  const [atRiskStudents, setAtRiskStudents] = useState(null);
  const [studentStrengths, setStudentStrengths] = useState(null);
  const [classStrengths, setClassStrengths] = useState(null);
  const [peerBenchmarking, setPeerBenchmarking] = useState(null);
  const [performanceDistribution, setPerformanceDistribution] = useState(null);
  const [classMisconceptions, setClassMisconceptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [analyticsData, heatmap, recs, ranks, concepts, atRisk, strengths, classStr, peers, perfDist, misconceptions] = await Promise.all([
          analyticsAPI.getClassAnalytics(),
          analyticsAPI.getHeatmapData(),
          analyticsAPI.getTopicRecommendations(),
          analyticsAPI.getStudentRankings(),
          analyticsAPI.getConceptAnalysis(),
          analyticsAPI.getAtRiskStudents(),
          analyticsAPI.getStudentStrengths(),
          analyticsAPI.getClassStrengths(),
          analyticsAPI.getPeerBenchmarking(),
          analyticsAPI.getPerformanceDistribution(),
          analyticsAPI.getClassMisconceptions()
        ]);

        setAnalytics(analyticsData);
        setHeatmapData(heatmap && heatmap.items ? heatmap.items : heatmap);
        setHeatmapThresholds(heatmap && heatmap.thresholds ? heatmap.thresholds : null);
        setRecommendations(recs && recs.recommendations ? recs.recommendations : recs);
        setRecommendationThresholds(recs && recs.thresholds ? recs.thresholds : null);
        setRankings(ranks);
        setConceptAnalysis(concepts && concepts.analysis ? concepts.analysis : concepts);
        setAtRiskStudents(atRisk);
        setStudentStrengths(strengths);
        setClassStrengths(classStr);
        setPeerBenchmarking(peers);
        setPerformanceDistribution(perfDist);
        setClassMisconceptions(misconceptions);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading classroom insights...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Premium Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="header-title">
            <span className="gradient-text">Classroom Intelligence</span>
          </h1>
          <p className="header-subtitle">AI-powered educational insights dashboard</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <div className="nav-tabs">
          {['overview', 'heatmap', 'recommendations', 'rankings', 'at-risk', 'strengths', 'class', 'peers', 'stats', 'misconceptions'].map(tab => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'at-risk' ? 'At-Risk' : tab === 'class' ? 'Class Insights' : tab === 'learning' ? 'Learning Paths' : tab === 'peers' ? 'Peer Compare' : tab === 'stats' ? 'Statistics' : tab === 'misconceptions' ? 'Misconceptions' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="dashboard-content">
        {activeTab === 'overview' && analytics && (
          <div className="content-section">
            {/* Key Metrics */}
            <section className="metrics-grid">
              <MetricsCard
                title="Total Students"
                value={analytics.totalStudents}
                icon="👥"
                color="blue"
              />
              <MetricsCard
                title="Average Score"
                value={`${analytics.averageScore}%`}
                icon="📊"
                color="purple"
              />
              <MetricsCard
                title="Highest Score"
                value={`${analytics.highestScore}%`}
                icon="⭐"
                color="gold"
              />
              <MetricsCard
                title="Excellence Rate"
                value={`${Math.round((analytics.performanceMetrics.excellent / analytics.totalStudents) * 100)}%`}
                icon="🎯"
                color="green"
              />
            </section>

            {/* Performance Distribution */}
            <section className="chart-section">
              <PerformanceChart
                title="Score Distribution"
                data={analytics.scoreDistribution}
                metrics={analytics.performanceMetrics}
              />
            </section>

            {/* Predictive Risk Forecast */}
            <RiskForecast />
          </div>
        )}

        {activeTab === 'heatmap' && heatmapData && (
          <ConceptHeatmap data={heatmapData} thresholds={heatmapThresholds} />
        )}

        {activeTab === 'recommendations' && recommendations && (
          <RecommendationsPanel recommendations={recommendations} thresholds={recommendationThresholds || heatmapThresholds} />
        )}

        {activeTab === 'rankings' && rankings && (
          <StudentRankings rankings={rankings} />
        )}


        {activeTab === 'at-risk' && atRiskStudents && <AtRiskStudents students={atRiskStudents} />}
        {activeTab === 'strengths' && studentStrengths && <StudentStrengths students={studentStrengths} />}
        {activeTab === 'class' && classStrengths && <ClassInsights classData={classStrengths} />}
        {activeTab === 'peers' && peerBenchmarking && <PeerBenchmarking benchmarks={peerBenchmarking} />}
        {activeTab === 'stats' && performanceDistribution && <PerformanceStats distribution={performanceDistribution} />}
        {activeTab === 'misconceptions' && classMisconceptions && <ClassMisconceptions misconceptions={classMisconceptions} />}
      </main>
    </div>
  );
};

export default Dashboard;
