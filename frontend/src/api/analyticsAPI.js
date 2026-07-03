import axios from 'axios';
import { API_BASE, STUDENTS_BASE, default as API_BASE_URL } from '../config/api.js';
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

  getReviewQueue: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/sessions/${sessionId}/review-queue`);
    return data;
  },

  approveReviewSubmission: async (sessionId, submissionId) => {
    const { data } = await axios.patch(`${API_BASE}/sessions/${sessionId}/review-queue/${submissionId}/approve`);
    return data;
  },

  dismissReviewSubmission: async (sessionId, submissionId) => {
    const { data } = await axios.patch(`${API_BASE}/sessions/${sessionId}/review-queue/${submissionId}/dismiss`);
    return data;
  },

  getAccuracyReport: async () => {
    const { data } = await axios.get(`${API_BASE}/accuracy-report`);
    return data;
  },

  runAccuracyReport: async ({ maxCases = 5, mode = 'live' } = {}) => {
    const { data } = await axios.post(`${API_BASE}/accuracy-report/run`, { maxCases, mode }, {
      timeout: 300000
    });
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

  getItemAnalysis: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/item-analysis`, sessionParams(sessionId));
    return data;
  },

  logClassReteach: async (sessionId, payload) => {
    const { data } = await axios.post(`${API_BASE}/intervention-log`, {
      ...payload,
      sessionId,
    });
    return data;
  },

  logStudentReteach: async (studentId, payload) => {
    const { data } = await axios.post(`${STUDENTS_BASE}/${studentId}/intervention-log`, payload);
    return data;
  },

  getInterventionImpact: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/intervention-impact`, sessionParams(sessionId));
    return data;
  },

  getStudentInterventionImpact: async (studentId) => {
    const { data } = await axios.get(`${STUDENTS_BASE}/${studentId}/intervention-impact`);
    return data;
  },

  getPracticeTest: async (concept) => {
    const response = await axios.get(`${API_BASE}/practice-test/${encodeURIComponent(concept)}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  generateStudentAdaptiveWorksheet: async (studentId, { concept } = {}) => {
    const response = await axios.post(
      `${STUDENTS_BASE}/${studentId}/adaptive-worksheet`,
      { concept },
      { responseType: 'blob', timeout: 120000 }
    );
    return response.data;
  },

  getStudentAnswerKey: async (studentId) => {
    const { data } = await axios.get(`${STUDENTS_BASE}/${studentId}/answer-key`);
    return data;
  },

  saveStudentAnswerKey: async (studentId, rawText) => {
    const { data } = await axios.put(`${STUDENTS_BASE}/${studentId}/answer-key`, { rawText });
    return data;
  },

  transcribeStudentAnswerKey: async (studentId, file) => {
    const formData = new FormData();
    formData.append('modelWorksheet', file);
    const { data } = await axios.post(`${STUDENTS_BASE}/${studentId}/answer-key/transcribe`, formData, {
      timeout: 120000,
    });
    return data;
  },

  clearStudentAnswerKey: async (studentId) => {
    const { data } = await axios.delete(`${STUDENTS_BASE}/${studentId}/answer-key`);
    return data;
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
    const compressedFile = await compressImageIfNeeded(file);
    const formData = new FormData();
    formData.append('worksheet', compressedFile);
    const { data } = await axios.post(`${STUDENTS_BASE}/${id}/grade`, formData, {
      timeout: 120000,
    });
    return data;
  },

  getClassMisconceptions: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/class-misconceptions`, sessionParams(sessionId));
    return data;
  },

  generateLessonPlan: async ({ concept, misconception, studentsAffectedCount, occurrences, sessionId }) => {
    const { data } = await axios.post(`${API_BASE}/lesson-plan`, {
      concept,
      misconception,
      studentsAffectedCount,
      occurrences,
      sessionId,
    }, { timeout: 120000 });
    return data;
  },

  assessCohortRisk: async () => {
    const { data } = await axios.post(`${STUDENTS_BASE}/risk-assessment`);
    return data;
  },

  generateParentMessage: async (studentId, options) => {
    const { data } = await axios.post(`${STUDENTS_BASE}/${studentId}/parent-message`, options);
    return data;
  },

  generateSessionInterventionPlan: async (sessionId, studentName) => {
    const { data } = await axios.post(`${API_BASE}/intervention-plan`, { studentName, sessionId });
    return data;
  },

  generateStudentInterventionPlan: async (studentId) => {
    const { data } = await axios.post(`${STUDENTS_BASE}/${studentId}/intervention-plan`);
    return data;
  },

  getReteachTomorrowSummary: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/reteach-summary`, sessionParams(sessionId));
    return data;
  },

  updateParentPhone: async (studentId, parentPhone) => {
    const { data } = await axios.patch(`${STUDENTS_BASE}/${studentId}/parent-phone`, { parentPhone });
    return data;
  },

  getWorksheetFeedback: async (token, lang = 'hi') => {
    const { data } = await axios.get(`${API_BASE_URL}/api/feedback/${token}`, { params: { lang } });
    return data;
  },

  getWorksheetFeedbackMeta: async (token) => {
    const { data } = await axios.get(`${API_BASE_URL}/api/feedback/${token}/meta`);
    return data;
  },

  updateCommunicationPreferences: async (studentId, preferences) => {
    const { data } = await axios.patch(`${STUDENTS_BASE}/${studentId}/communication-preferences`, preferences);
    return data;
  },

  sendParentNotification: async (studentId, payload) => {
    const { data } = await axios.post(`${STUDENTS_BASE}/${studentId}/send-parent-notification`, payload);
    return data;
  },

  getParentChannelStatus: async () => {
    const { data } = await axios.get(`${STUDENTS_BASE}/parent-channels/status`);
    return data;
  },

  getNotificationLogs: async (studentId, limit = 20) => {
    const { data } = await axios.get(`${STUDENTS_BASE}/${studentId}/notification-logs`, { params: { limit } });
    return data;
  },

  getTelemetry: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/telemetry`, sessionParams(sessionId));
    return data;
  },

  getPilotScalePlan: async (sessionId) => {
    const { data } = await axios.get(`${API_BASE}/pilot-scale-plan`, sessionParams(sessionId));
    return data;
  },

  previewStudentPassport: async (studentId) => {
    const { data } = await axios.get(`${STUDENTS_BASE}/${studentId}/passport/preview`, {
      timeout: 60000,
    });
    return data;
  },

  getStudentPassport: async (studentId) => {
    const response = await axios.get(`${STUDENTS_BASE}/${studentId}/passport`, {
      responseType: 'blob',
      timeout: 60000,
    });
    return response.data;
  },

  exportSessionPassports: async (sessionId) => {
    const response = await axios.post(
      `${API_BASE}/sessions/${sessionId}/export-passports`,
      {},
      { responseType: 'blob', timeout: 120000 }
    );
    return response.data;
  },
};
