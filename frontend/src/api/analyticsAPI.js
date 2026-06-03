import axios from 'axios';
import { API_BASE, STUDENTS_BASE } from '../config/api.js';

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

  getAtRiskStudents: async () => {
    const { data } = await axios.get(`${API_BASE}/at-risk-students`);
    return data;
  },

  getStudentStrengths: async () => {
    const { data } = await axios.get(`${API_BASE}/student-strengths`);
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

  getPerformanceDistribution: async () => {
    const { data } = await axios.get(`${API_BASE}/performance-distribution`);
    return data;
  },

  getPracticeTest: async (concept) => {
    const response = await axios.get(`${API_BASE}/practice-test/${concept}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // ─── Student Tracking API ──────────────────────────────────────────────

  getAllStudents: async () => {
    const { data } = await axios.get(STUDENTS_BASE);
    return data;
  },

  createStudent: async (studentName) => {
    const { data } = await axios.post(STUDENTS_BASE, { studentName });
    return data;
  },

  getStudentById: async (id) => {
    const { data } = await axios.get(`${STUDENTS_BASE}/${id}`);
    return data;
  },

  gradeStudentTest: async (id, file) => {
    const formData = new FormData();
    formData.append('worksheet', file);
    const { data } = await axios.post(`${STUDENTS_BASE}/${id}/grade`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  getTestReplay: async (studentId, testId) => {
    const { data } = await axios.get(`${STUDENTS_BASE}/${studentId}/tests/${testId}/replay`);
    return data;
  },

  getClassMisconceptions: async () => {
    const { data } = await axios.get(`${STUDENTS_BASE}/class-misconceptions`);
    return data;
  },

  assessCohortRisk: async () => {
    const { data } = await axios.post(`${STUDENTS_BASE}/risk-assessment`);
    return data;
  },

  generateParentMessage: async (studentId, options) => {
    const { data } = await axios.post(`${STUDENTS_BASE}/${studentId}/parent-message`, options);
    return data;
  }
};
