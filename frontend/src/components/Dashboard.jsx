import { useCallback, useState, useEffect } from 'react';
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
import ReviewQueue from './ReviewQueue.jsx';
import AccuracyReport from './AccuracyReport.jsx';
import CostThroughputPanel from './CostThroughputPanel.jsx';
import PilotScalePlan from './PilotScalePlan.jsx';
import { analyticsAPI } from '../api/analyticsAPI';
import { useI18n } from '../i18n.jsx';

const dashboardTabs = [
  { key: 'overview', labelKey: 'overview' },
  { key: 'review', labelKey: 'reviewQueue' },
  { key: 'accuracy', labelKey: 'accuracyReport' },
  { key: 'stats', labelKey: 'statistics' },
  { key: 'heatmap', labelKey: 'heatmap' },
  { key: 'misconceptions', labelKey: 'misconceptions' },
  { key: 'class', labelKey: 'classInsights' },
  { key: 'recommendations', labelKey: 'recommendations' },
  { key: 'at-risk', labelKey: 'atRisk' },
  { key: 'strengths', labelKey: 'strengths' },
  { key: 'rankings', labelKey: 'rankings' },
  { key: 'peers', labelKey: 'peerCompare' },
  { key: 'pilot', labelKey: 'pilotReadiness' }
];

const Dashboard = ({ session }) => {
  const { t } = useI18n();
  const sessionId = session?.sessionId;
  const [analytics, setAnalytics] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapThresholds, setHeatmapThresholds] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationThresholds, setRecommendationThresholds] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [atRiskStudents, setAtRiskStudents] = useState(null);
  const [studentStrengths, setStudentStrengths] = useState(null);
  const [classStrengths, setClassStrengths] = useState(null);
  const [peerBenchmarking, setPeerBenchmarking] = useState(null);
  const [performanceDistribution, setPerformanceDistribution] = useState(null);
  const [classMisconceptions, setClassMisconceptions] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [accuracyReportData, setAccuracyReportData] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [pilotPlan, setPilotPlan] = useState(null);
  const [reteachSummary, setReteachSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAllData = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const [
        analyticsData,
        heatmap,
        recs,
        ranks,
        atRisk,
        strengths,
        classStr,
        peers,
        perfDist,
        misconceptions,
        reviews,
        accuracy,
        telemetryData,
        pilotData,
        reteachData
      ] = await Promise.all([
        analyticsAPI.getClassAnalytics(sessionId),
        analyticsAPI.getHeatmapData(sessionId),
        analyticsAPI.getTopicRecommendations(sessionId),
        analyticsAPI.getStudentRankings(sessionId),
        analyticsAPI.getAtRiskStudents(sessionId),
        analyticsAPI.getStudentStrengths(sessionId),
        analyticsAPI.getClassStrengths(sessionId),
        analyticsAPI.getPeerBenchmarking(sessionId),
        analyticsAPI.getPerformanceDistribution(sessionId),
        analyticsAPI.getClassMisconceptions(sessionId),
        analyticsAPI.getReviewQueue(sessionId),
        analyticsAPI.getAccuracyReport(),
        analyticsAPI.getTelemetry(sessionId),
        analyticsAPI.getPilotScalePlan(sessionId),
        analyticsAPI.getReteachTomorrowSummary(sessionId)
      ]);

      setAnalytics(analyticsData);
      setHeatmapData(heatmap && heatmap.items ? heatmap.items : heatmap);
      setHeatmapThresholds(heatmap && heatmap.thresholds ? heatmap.thresholds : null);
      setRecommendations(recs && recs.recommendations ? recs.recommendations : recs);
      setRecommendationThresholds(recs && recs.thresholds ? recs.thresholds : null);
      setRankings(ranks);
      setAtRiskStudents(atRisk);
      setStudentStrengths(strengths);
      setClassStrengths(classStr);
      setPeerBenchmarking(peers);
      setPerformanceDistribution(perfDist);
      setClassMisconceptions(misconceptions);
      setReviewQueue(reviews);
      setAccuracyReportData(accuracy);
      setTelemetry(telemetryData);
      setPilotPlan(pilotData);
      setReteachSummary(reteachData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchAllData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAllData]);

  if (loading || !sessionId) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>{t('loadingClassroomSession')}</p>
      </div>
    );
  }

  const excellenceRate = analytics?.totalStudents
    ? Math.round((analytics.performanceMetrics.excellent / analytics.totalStudents) * 100)
    : 0;

  return (
    <div className="dashboard-container">
      {/* Premium Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="header-title">
            <span className="gradient-text">{t('classroomIntelligence')}</span>
          </h1>
          <p className="header-subtitle">{t('dashboardSubtitle')}</p>
          {session && (
            <p className="header-subtitle">
              {t('currentSession')}: {session.title || t('untitledSession')}
            </p>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <div className="nav-tabs">
          {dashboardTabs.map(tab => (
            <button
              key={tab.key}
              className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="dashboard-content">
        {activeTab === 'overview' && analytics && (
          <div className="content-section">
            <CostThroughputPanel telemetry={telemetry} compact />
            {/* Key Metrics */}
            <section className="metrics-grid">
              <MetricsCard
                title={t('totalStudents')}
                value={analytics.totalStudents}
                icon="👥"
                color="blue"
              />
              <MetricsCard
                title={t('averageScore')}
                value={`${analytics.averageScore}%`}
                icon="📊"
                color="purple"
              />
              <MetricsCard
                title={t('highestScore')}
                value={`${analytics.highestScore}%`}
                icon="⭐"
                color="gold"
              />
              <MetricsCard
                title={t('excellenceRate')}
                value={`${excellenceRate}%`}
                icon="🎯"
                color="green"
              />
              <MetricsCard
                title={t('needsReview')}
                value={reviewQueue.length}
                icon="?"
                color="blue"
              />
            </section>

            {/* Performance Distribution */}
            <section className="chart-section">
              <PerformanceChart
                title={t('scoreDistribution')}
                data={analytics.scoreDistribution}
                metrics={analytics.performanceMetrics}
              />
            </section>
        </div>
        )}

        {activeTab === 'heatmap' && heatmapData && (
          <ConceptHeatmap data={heatmapData} thresholds={heatmapThresholds} />
        )}

        {activeTab === 'recommendations' && recommendations && (
          <RecommendationsPanel recommendations={recommendations} thresholds={recommendationThresholds || heatmapThresholds} />
        )}

        {activeTab === 'review' && (
          <ReviewQueue
            sessionId={sessionId}
            items={reviewQueue}
            onChanged={fetchAllData}
          />
        )}

        {activeTab === 'accuracy' && (
          <AccuracyReport
            benchmark={accuracyReportData?.benchmark}
            report={accuracyReportData?.report}
            onReportUpdated={setAccuracyReportData}
          />
        )}

        {activeTab === 'rankings' && rankings && (
          <StudentRankings rankings={rankings} />
        )}


        {activeTab === 'at-risk' && atRiskStudents && (
          <AtRiskStudents
            students={atRiskStudents}
            sessionId={sessionId}
            reteachSummary={reteachSummary}
          />
        )}
        {activeTab === 'strengths' && studentStrengths && <StudentStrengths students={studentStrengths} />}
        {activeTab === 'class' && classStrengths && <ClassInsights classData={classStrengths} />}
        {activeTab === 'peers' && peerBenchmarking && <PeerBenchmarking benchmarks={peerBenchmarking} />}
        {activeTab === 'stats' && performanceDistribution && <PerformanceStats distribution={performanceDistribution} />}
        {activeTab === 'misconceptions' && classMisconceptions && <ClassMisconceptions misconceptions={classMisconceptions} />}

        {activeTab === 'pilot' && (
          <div className="content-section">
            <CostThroughputPanel telemetry={telemetry} />
            <PilotScalePlan plan={pilotPlan} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
