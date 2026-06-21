import axios from 'axios';
import { API_BASE, STUDENTS_BASE } from '../config/api.js';
import { compressImageIfNeeded } from '../utils/uploadBatches.js';

const sessionParams = (sessionId) => (
  sessionId ? { params: { sessionId } } : {}
);

export const analyticsAPI = {
  createGradingSession: async (title) => {
    const { data } = await axios.post(`${API_BASE}/sessions`, title ? { title } : {});
    return data;
  },

  listGradingSessions: async () => {
    const { data } = await axios.get(`${API_BASE}/sessions`);
    return data;
  },

  getGradingSession: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/sessions/${sessionId}`);
    return data;
  },

  resumeGradingSession: async (sessionId) => {
    const { data } = await axios.post(`${API_BASE}/sessions/${sessionId}/resume`);
    return data;
  },

  deleteGradingSession: async (sessionId) => {
    const { data } = await axios.delete(`${API_BASE}/sessions/${sessionId}`);
    return data;
  },

  getAnswerKey: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/sessions/${sessionId}/answer-key`);
    return data;
  },

  saveAnswerKey: async (sessionId, rawText) => {
    const { data } = await axios.put(`${API_BASE}/sessions/${sessionId}/answer-key`, { rawText });
    return data;
  },

  transcribeAnswerKey: async (sessionId, file) => {
    const compressedFile = await compressImageIfNeeded(file);
    const formData = new FormData();
    formData.append('modelWorksheet', compressedFile);
    const { data } = await axios.post(`${API_BASE}/sessions/${sessionId}/answer-key/transcribe`, formData, {
      timeout: 120000,
    });
    return data;
  },

  clearAnswerKey: async (sessionId) => {
    const { data } = await axios.delete(`${API_BASE}/sessions/${sessionId}/answer-key`);
    return data;
  },

  getClassAnalytics: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/analytics`, sessionParams(sessionId));
    return data;
  },

  getHeatmapData: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/heatmap-report`, sessionParams(sessionId));
    return data;
  },

  getTopicRecommendations: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/recommendations`, sessionParams(sessionId));
    return data;
  },

  getStudentRankings: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/student-rankings`, sessionParams(sessionId));
    return data;
  },

  getConceptAnalysis: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/concept-analysis`, sessionParams(sessionId));
    return data;
  },

  getAtRiskStudents: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/at-risk-students`, sessionParams(sessionId));
    return data;
  },

  getStudentStrengths: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/student-strengths`, sessionParams(sessionId));
    return data;
  },

  getClassStrengths: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/class-strengths`, sessionParams(sessionId));
    return data;
  },

  getPeerBenchmarking: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/peer-benchmarking`, sessionParams(sessionId));
    return data;
  },

  getPerformanceDistribution: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/performance-distribution`, sessionParams(sessionId));
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

  gradeStudentTest: async (id, file, sessionId) => {
    const compressedFile = await compressImageIfNeeded(file);
    const formData = new FormData();
    formData.append('worksheet', compressedFile);
    const { data } = await axios.post(`${STUDENTS_BASE}/${id}/grade`, formData, {
      timeout: 120000,
      ...sessionParams(sessionId),
    });
    return data;
  },

  getClassMisconceptions: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/class-misconceptions`, sessionParams(sessionId));
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
