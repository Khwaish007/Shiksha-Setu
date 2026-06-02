import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1/grading';

export const analyticsAPI = {
  getClassAnalytics: async () => {
    const { data } = await axios.get(`${API_BASE}/analytics`);
    return data;
  },

  getHeatmapData: async () => {
    const { data } = await axios.get(`${API_BASE}/heatmap-report`);
    return data;
  },

  getTopicRecommendations: async () => {
    const { data } = await axios.get(`${API_BASE}/recommendations`);
    return data;
  },

  getStudentRankings: async () => {
    const { data } = await axios.get(`${API_BASE}/student-rankings`);
    return data;
  },

  getConceptAnalysis: async () => {
    const { data } = await axios.get(`${API_BASE}/concept-analysis`);
    return data;
  },

  getStudentStrengths: async () => {
    const { data } = await axios.get(`${API_BASE}/student-strengths`);
    return data;
  },

  getAtRiskStudents: async () => {
    const { data } = await axios.get(`${API_BASE}/at-risk-students`);
    return data;
  },

  getMasteryLevels: async () => {
    const { data } = await axios.get(`${API_BASE}/mastery-levels`);
    return data;
  },

  getClassStrengths: async () => {
    const { data } = await axios.get(`${API_BASE}/class-strengths`);
    return data;
  },

  getPeerBenchmarking: async () => {
    const { data } = await axios.get(`${API_BASE}/peer-benchmarking`);
    return data;
  },

  getLearningPaths: async () => {
    const { data } = await axios.get(`${API_BASE}/learning-paths`);
    return data;
  },

  getPerformanceDistribution: async () => {
    const { data } = await axios.get(`${API_BASE}/performance-distribution`);
    return data;
  }
};
